import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { secureStorage } from '../utils/secureStorage';
import { API_URL } from '../utils/apiConfig';
import { logDebug } from '../utils/logger';

export const useSocket = (room?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = secureStorage.get('accessToken');
    
    if (!socketRef.current) {
      const socket = io(API_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        logDebug('Socket.IO Connected', { socketId: socket.id });
        if (room) {
          socket.emit('join', room);
        }
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        logDebug('Socket.IO Disconnected');
      });

      socket.on('connect_error', (error: Error) => {
        logDebug('Socket.IO Connection Error', { error: error.message });
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [room]);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    const currentSocket = socketRef.current;
    if (currentSocket) {
      currentSocket.on(event, callback);
    }
    return () => {
      currentSocket?.off(event, callback);
    };
  }, []);

  return {
    isConnected,
    emit,
    on
  };
};
