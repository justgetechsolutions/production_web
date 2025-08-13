import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';

interface Order {
  _id: string;
  orderId: string;
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  items: any[];
  totalAmount: number;
  status: string;
  timestamp: string;
  billNumber?: number;
}

interface UseRealTimeOrdersProps {
  onNewOrder?: (order: Order) => void;
  onOrderStatusUpdate?: (order: Order) => void;
  restaurantId: string;
  enableSound?: boolean;
}

export const useRealTimeOrders = ({
  onNewOrder,
  onOrderStatusUpdate,
  restaurantId,
  enableSound = true
}: UseRealTimeOrdersProps) => {
  const { socket, isConnected, joinRestaurant, joinKitchen } = useSocket();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processedOrders = useRef<Set<string>>(new Set());
  const audioInitialized = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio element
  useEffect(() => {
    // Try multiple possible paths for the audio file
    const audioPaths = [
      '/notification.mp3',
      '/public/notification.mp3',
      './notification.mp3',
      `${window.location.origin}/notification.mp3`
    ];
    
    let audioLoaded = false;
    
    for (const path of audioPaths) {
      try {
        const audio = new Audio(path);
        audio.volume = 0.5;
        audio.preload = 'auto';
        
        audio.addEventListener('canplaythrough', () => {
          console.log('✅ Audio file loaded successfully from:', path);
          audioRef.current = audio;
          audioLoaded = true;
        });
        
        audio.addEventListener('error', (e) => {
          console.log(`❌ Audio file failed to load from ${path}:`, e);
          if (!audioLoaded) {
            // Try next path
            audio.load();
          }
        });
        
        audio.load();
        
        // If this path works, break the loop
        if (audioLoaded) break;
        
      } catch (error) {
        console.log(`Failed to create audio from ${path}:`, error);
      }
    }
    
    // Log audio status for debugging
    console.log('Audio element initialization attempted');
  }, []);

  // Function to initialize audio with user interaction
  const initializeAudio = useCallback(async () => {
    try {
      // Initialize Web Audio API context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      audioInitialized.current = true;
      console.log('✅ Audio context initialized successfully');
      
      // Test the beep sound
      playBeep();
      
    } catch (error) {
      console.log('❌ Audio initialization failed:', error);
    }
  }, []);

  // Beep sound using Web Audio API
  const playBeep = useCallback(() => {
    try {
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      // Create a pleasant notification sound (two-tone beep)
      const now = audioContextRef.current.currentTime;
      
      // First tone
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      
      // Second tone (after a short pause)
      setTimeout(() => {
        try {
          const oscillator2 = audioContextRef.current!.createOscillator();
          const gainNode2 = audioContextRef.current!.createGain();
          
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContextRef.current!.destination);
          
          const now2 = audioContextRef.current!.currentTime;
          oscillator2.frequency.setValueAtTime(1000, now2);
          oscillator2.type = 'sine';
          gainNode2.gain.setValueAtTime(0.2, now2);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.2);
          
          oscillator2.start(now2);
          oscillator2.stop(now2 + 0.2);
        } catch (error) {
          console.log('Second beep failed:', error);
        }
      }, 250);
      
      console.log('🔊 Notification beep sound played');
    } catch (error) {
      console.error('❌ Beep sound failed:', error);
    }
  }, []);

  // Join restaurant room when connected
  useEffect(() => {
    if (isConnected && restaurantId) {
      joinRestaurant(restaurantId);
      // Also join kitchen room for kitchen staff
      joinKitchen(restaurantId);
    }
  }, [isConnected, restaurantId, joinRestaurant, joinKitchen]);

  // Handle new order events
  const handleNewOrder = useCallback(async (orderData: Order) => {
    // Prevent duplicate notifications for the same order
    if (processedOrders.current.has(orderData.orderId)) {
      return;
    }
    
    processedOrders.current.add(orderData.orderId);
    
    // Play notification sound (only if enabled)
    if (enableSound) {
      try {
        // Use beep sound as primary notification
        if (audioInitialized.current && audioContextRef.current) {
          playBeep();
          console.log('🔊 Notification sound played for new order');
        } else {
          // Initialize audio context if not already done
          await initializeAudio();
          // Play beep after initialization
          setTimeout(() => playBeep(), 100);
        }
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }
    }
    
    // Call the callback
    if (onNewOrder) {
      onNewOrder(orderData);
    }
    
    // Clean up processed orders after some time to prevent memory leaks
    setTimeout(() => {
      processedOrders.current.delete(orderData.orderId);
    }, 60000); // 1 minute
  }, [onNewOrder]);

  // Handle order status updates
  const handleOrderStatusUpdate = useCallback((orderData: Order) => {
    if (onOrderStatusUpdate) {
      onOrderStatusUpdate(orderData);
    }
  }, [onOrderStatusUpdate]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new orders
    socket.on('newOrderReceived', handleNewOrder);
    
    // Listen for order status updates
    socket.on('orderStatusUpdated', handleOrderStatusUpdate);

    // Cleanup event listeners
    return () => {
      socket.off('newOrderReceived', handleNewOrder);
      socket.off('orderStatusUpdated', handleOrderStatusUpdate);
    };
  }, [socket, isConnected, handleNewOrder, handleOrderStatusUpdate]);

  // Cleanup processed orders on unmount
  useEffect(() => {
    return () => {
      processedOrders.current.clear();
    };
  }, []);

  return {
    isConnected,
    processedOrders: processedOrders.current,
    initializeAudio
  };
};
