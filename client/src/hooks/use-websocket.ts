import { useState, useEffect, useCallback, useRef } from 'react';

// Define the type for WebSocket messages
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Hook for managing WebSocket connections and interactions
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

  // Connection handler
  const connect = useCallback(() => {
    // Close any existing connection
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }

    // Create new connection
    try {
      const ws = new WebSocket(url);
      webSocketRef.current = ws;

      // Connection established
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      // Message handler
      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setLastMessage(parsedData);
          setMessages((prev) => [...prev, parsedData]);
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
        console.log('WebSocket disconnected, code:', event.code);
        setIsConnected(false);
        
        // Attempt to reconnect unless it was a normal closure
        if (event.code !== 1000) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }, 5000); // Reconnect after 5 seconds
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setError(err as Event);
    }
  }, [url]);

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

  // Manually attempt to reconnect
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    connect();
  }, [connect]);

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