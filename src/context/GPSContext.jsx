import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BASE_URL } from '../config/env';

const GPSContext = createContext(null);

export const useGPS = () => {
  const context = useContext(GPSContext);
  if (!context) {
    throw new Error('useGPS must be used within a GPSProvider');
  }
  return context;
};

export const GPSProvider = ({ children }) => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [activeTripId, setActiveTripId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const watchIdRef = useRef(null);
  const socketRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGPSTracking();
    };
  }, []);

  const startGPSTracking = async (tripId) => {
    if (!navigator.geolocation) {
      console.error('[GPS Context] Geolocation not supported');
      return false;
    }

    try {
      // Connect to WebSocket
      const socketUrl = import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
        : BASE_URL;

      console.log('[GPS Context] Connecting to:', `${socketUrl}/tracking`);

      const socket = io(`${socketUrl}/tracking`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[GPS Context] ✅ Connected to tracking server');
        console.log('[GPS Context] Socket ID:', socket.id);
        socket.emit('joinTrip', { tripId: String(tripId) });
        console.log('[GPS Context] Joined trip room:', String(tripId));
        setSocketConnected(true);
      });

      socket.on('connect_error', (error) => {
        console.error('[GPS Context] ❌ Connection error:', error);
        console.error('[GPS Context] URL attempted:', `${socketUrl}/tracking`);
        setSocketConnected(false);
      });

      socket.on('disconnect', (reason) => {
        console.log('[GPS Context] Disconnected from tracking server. Reason:', reason);
        setSocketConnected(false);
      });

      socket.on('error', (error) => {
        console.error('[GPS Context] Socket error:', error);
      });

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, heading } = position.coords;

          const newPos = { lat: latitude, lng: longitude, speed, heading };
          setCurrentPosition(newPos);

          console.log('[GPS Context] Location updated:', newPos);

          // Send location update to backend via WebSocket
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('updateLocation', {
              tripId: String(tripId),
              latitude,
              longitude,
              speed: speed || 0,
              heading: heading || 0,
              timestamp: new Date().toISOString()
            });
            console.log('[GPS Context] Location sent to backend');
          }
        },
        (error) => {
          console.error('[GPS Context] Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      setActiveTripId(tripId);
      setIsTracking(true);
      console.log('[GPS Context] GPS tracking started for trip:', tripId);
      return true;
    } catch (error) {
      console.error('[GPS Context] Error starting GPS tracking:', error);
      return false;
    }
  };

  const stopGPSTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setActiveTripId(null);
    setIsTracking(false);
    setSocketConnected(false);
    console.log('[GPS Context] GPS tracking stopped');
  };

  const value = {
    currentPosition,
    isTracking,
    activeTripId,
    socketConnected,
    startGPSTracking,
    stopGPSTracking
  };

  return <GPSContext.Provider value={value}>{children}</GPSContext.Provider>;
};
