const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');

const app = express();
const httpServer = createServer(app);

// Create a lightweight MySQL pool so the socket server can check conversation state
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'phionix',
  port: Number(process.env.MYSQL_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 5,
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.SOCKET_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join', (room) => {
    try {
      socket.join(String(room));
      console.log(`Socket ${socket.id} joined room ${room}`);
    } catch (e) { console.error(e); }
  });

  socket.on('leave', (room) => {
    try {
      socket.leave(String(room));
      console.log(`Socket ${socket.id} left room ${room}`);
    } catch (e) { console.error(e); }
  });

  // Relay messages to the conversation room. The client should persist the message via the API.
  socket.on('send_message', (message) => {
    (async () => {
      try {
        const room = String(message.id_conversation);

        // Check conversation ban status from DB to prevent bypassing API
        try {
          const [rows] = await pool.execute('SELECT is_banned FROM conversation WHERE id_conversation = ?', [message.id_conversation]);
          const convo = Array.isArray(rows) ? rows[0] : rows;
          if (convo && (convo.is_banned === 1 || convo.is_banned === '1')) {
            // Inform sender that conversation is banned and do not broadcast
            socket.emit('send_message_error', { error: 'Conversation is banned' });
            return;
          }
        } catch (dbErr) {
          console.error('Failed to check conversation ban status in socket server:', dbErr);
          // If DB check fails, best-effort: do not broadcast to avoid inconsistency
          socket.emit('send_message_error', { error: 'Failed to verify conversation status' });
          return;
        }

        // Broadcast to all clients in the room except sender
        socket.to(room).emit('message_created', message);
        
        // Emit typing stopped event to stop typing indicator
        socket.to(room).emit('user_stopped_typing', {
          userId: message.id_emetteur,
          conversationId: message.id_conversation
        });
      } catch (e) {
        console.error('Error in send_message handler:', e);
      }
    })();
  });

  // Handle typing indicators
  socket.on('typing_started', ({ userId, conversationId }) => {
    try {
      const room = String(conversationId);
      socket.to(room).emit('user_typing', { userId });
    } catch (e) {
      console.error('Error in typing_started handler:', e);
    }
  });

  socket.on('typing_stopped', ({ userId, conversationId }) => {
    try {
      const room = String(conversationId);
      socket.to(room).emit('user_stopped_typing', { userId });
    } catch (e) {
      console.error('Error in typing_stopped handler:', e);
    }
  });

  // Notifications: server receives send_notification and relays to destinataire room or broadcasts
  socket.on('send_notification', (notification) => {
    try {
      const destinataire = notification.destinataire_id;
      if (destinataire) {
        io.to(String(destinataire)).emit('notification_created', notification);
      } else {
        // broadcast all
        io.emit('notification_created', notification);
      }
    } catch (e) { console.error(e); }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });

  // Relay conversation ban events from server-side admin actions to all clients
  socket.on('conversation_banned', (payload) => {
    try {
      // broadcast to all clients so they can reload or update UI
      io.emit('conversation_banned', payload);
    } catch (e) { console.error('Error in conversation_banned handler:', e); }
  });
});

const port = Number(process.env.SOCKET_PORT || 4000);
httpServer.listen(port, () => {
  console.log(`Socket server listening on port ${port}`);
});
