import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants/api';

let socket: Socket | null = null;

export const initSocket = (userId?: string): Socket => {
  if (socket && socket.connected) {
    if (userId) {
      socket.emit('join-chat', userId);
    }
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
    forceNew: false,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    if (userId) {
      socket?.emit('join-chat', userId);
    }
  });

  socket.on('reconnect', () => {
    console.log('Socket reconnected');
    if (userId) {
      socket?.emit('join-chat', userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Chat socket events
export const socketEvents = {
  joinChat: (userId: string) => {
    socket?.emit('join-chat', userId);
  },
  sendMessage: (data: { userId: string; message: string }) => {
    socket?.emit('send-message', data);
  },
  joinFanGroup: (groupId: string) => {
    socket?.emit('join-fan-group', groupId);
  },
  onNewMessage: (callback: (message: any) => void) => {
    socket?.on('new-message', callback);
  },
  onMessageLiked: (callback: (data: { messageId: string; likes: number }) => void) => {
    socket?.on('message-liked', callback);
  },
  onNewPost: (callback: (data: any) => void) => {
    socket?.on('new-post', callback);
  },
  onNewComment: (callback: (data: any) => void) => {
    socket?.on('new-comment', callback);
  },
  off: (event: string) => {
    socket?.off(event);
  },
};

