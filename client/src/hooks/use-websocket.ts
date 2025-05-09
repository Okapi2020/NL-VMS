import { useState, useEffect, useCallback, useRef } from 'react';

// Define the type for WebSocket messages
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Hook for managing WebSocket connections and interactions with enhanced stability
 * 
 * @param {string} url - The WebSocket URL to connect to
 * @returns {Object} WebSocket state and functions
 */
export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const missedHeartbeatsRef = useRef(0);
  const MAX_MISSED_HEARTBEATS = 3;

  // Start heartbeat to keep connection alive
  const startHeartbeat = useCallback(() => {
    // Clear any existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    missedHeartbeatsRef.current = 0;
    
    heartbeatIntervalRef.current = setInterval(() => {
      const ws = webSocketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('Sending heartbeat ping');
        ws.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
        
        // Increment missed heartbeats counter (will be reset when we get a response)
        missedHeartbeatsRef.current += 1;
        
        // If we've missed too many heartbeats, reconnect
        if (missedHeartbeatsRef.current >= MAX_MISSED_HEARTBEATS) {
          console.warn(`Missed ${missedHeartbeatsRef.current} heartbeats. Reconnecting...`);
          reconnect();
        }
      }
    }, 15000); // Send heartbeat every 15 seconds
  }, []);
  
  // Manually attempt to reconnect
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }
    
    connect();
  }, []);

  // Connection handler
  const connect = useCallback(() => {
    // Close any existing connection
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }

    // Create new connection
    try {
      console.log('Establishing WebSocket connection to:', url);
      const ws = new WebSocket(url);
      webSocketRef.current = ws;

      // Connection established
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setError(null);
        startHeartbeat();
      };

      // Message handler
      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setLastMessage(parsedData);
          setMessages((prev) => [...prev, parsedData]);
          
          // Reset missed heartbeats when we get a heartbeat_ack
          if (parsedData.type === 'heartbeat_ack') {
            console.log('Received heartbeat acknowledgment');
            missedHeartbeatsRef.current = 0;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      // Error handler
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(event);
      };

      // Connection closed handler
      ws.onclose = (event) => {
        console.log(`WebSocket disconnected: Code ${event.code}${event.reason ? ', Reason: ' + event.reason : ''}`);
        setIsConnected(false);
        
        // Clear heartbeat interval
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Attempt to reconnect unless it was a normal closure
        if (event.code !== 1000) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          // Use exponential backoff for reconnection
          const delay = Math.min(5000 + missedHeartbeatsRef.current * 1000, 30000);
          console.log(`Scheduling reconnection in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }, delay); 
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setError(err as Event);
      
      // Schedule reconnection attempt
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect after connection error...');
        connect();
      }, 5000);
    }
  }, [url, startHeartbeat]);

  // Cleanup on unmount
  useEffect(() => {
    connect();

    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [connect]);

  // Send message through the WebSocket
  const sendMessage = useCallback((data: any) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  // Clear message history
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  return {
    isConnected,
    messages,
    lastMessage,
    error,
    sendMessage,
    clearMessages,
    reconnect
  };
}