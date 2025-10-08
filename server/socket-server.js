const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

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
    try {
      const room = String(message.id_conversation || message.id_conversation);
      io.to(room).emit('message_created', message);
    } catch (e) { console.error(e); }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

const port = Number(process.env.SOCKET_PORT || 4000);
httpServer.listen(port, () => {
  console.log(`Socket server listening on port ${port}`);
});
