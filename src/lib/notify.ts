import { io } from 'socket.io-client';
import { 
  NotificationType, 
  notificationPermissions, 
  notificationTemplates 
} from '@/types/notifications';

// Emits a notification to the socket server. We connect, emit and disconnect quickly.
// This keeps delivery best-effort from the server side. Notifications should already
// be persisted in the DB before calling this.
export async function emitNotification(notification: any) {
  try {
    const url = process.env.SOCKET_URL || `http://localhost:${process.env.SOCKET_PORT || 4000}`;
    const socket = io(url, { transports: ['websocket'], reconnectionAttempts: 1, timeout: 2000 });

    // wait for connect or timeout
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return; settled = true; resolve();
      };
      socket.on('connect', finish);
      socket.on('connect_error', finish);
      // safety timeout
      setTimeout(finish, 1500);
    });

    try {
      socket.emit('send_notification', notification);
    } catch (e) {
      // non-fatal
      console.error('emitNotification emit error', e);
    }

    try { socket.disconnect(); } catch (e) { /* ignore */ }
  } catch (e) {
    console.error('emitNotification failed', e);
  }
}

export default emitNotification;
