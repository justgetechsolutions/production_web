import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRestaurant: (restaurantId: string) => void;
  joinKitchen: (restaurantId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { restaurantId } = useAuth();

  useEffect(() => {
    // Create socket connection
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'https://production-web-l3pb.onrender.com';
    const newSocket = io(backendUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const joinRestaurant = useCallback((restaurantId: string) => {
    if (socket && isConnected) {
      socket.emit('joinRestaurant', restaurantId);
      console.log('Joined restaurant room:', restaurantId);
    }
  }, [socket, isConnected]);

  const joinKitchen = useCallback((restaurantId: string) => {
    if (socket && isConnected) {
      socket.emit('joinKitchen', restaurantId);
      console.log('Joined kitchen room:', restaurantId);
    }
  }, [socket, isConnected]);

  // Auto-join restaurant room when restaurantId changes
  useEffect(() => {
    if (restaurantId && socket && isConnected) {
      joinRestaurant(restaurantId);
    }
  }, [restaurantId, socket, isConnected, joinRestaurant]);

  const value: SocketContextType = {
    socket,
    isConnected,
    joinRestaurant,
    joinKitchen
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
