'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io as ClientIO } from 'socket.io-client';

type SocketContextType = {
  socket: any | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('Socket Provider: Initializing socket connection...');
    
    // Get base URL
    const baseUrl = window.location.origin;
    console.log('Socket Provider: Base URL:', baseUrl);

    try {
      console.log('Socket Provider: Creating socket instance...');
      
      const socketInstance = new (ClientIO as any)(baseUrl, {
        path: '/api/socket',
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['polling', 'websocket']
      });

      console.log('Socket Provider: Socket instance created');

      socketInstance.on('connect', () => {
        console.log('Socket Provider: Connected successfully', {
          socketId: socketInstance.id,
          transport: socketInstance.io?.engine?.transport?.name
        });
        setIsConnected(true);
      });

      socketInstance.on('connect_error', (err: Error) => {
        console.error('Socket Provider: Connection error', {
          message: err.message,
          name: err.name,
        });
        setIsConnected(false);
      });

      socketInstance.on('reconnect_attempt', (attempt: number) => {
        console.log(`Socket Provider: Reconnection attempt #${attempt}`);
      });

      socketInstance.on('disconnect', (reason: string) => {
        console.log('Socket Provider: Disconnected', { reason });
        setIsConnected(false);
      });

      setSocket(socketInstance);

      return () => {
        console.log('Socket Provider: Cleaning up socket connection');
        socketInstance.disconnect();
      };
    } catch (error) {
      console.error('Socket Provider: Error creating socket instance', error);
      return () => {};
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};