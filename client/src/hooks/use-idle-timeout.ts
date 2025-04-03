import { useState, useEffect, useCallback, useRef } from 'react';

type IdleTimeoutOptions = {
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
  /** Events to monitor for user activity */
  events?: string[];
  /** Callback to execute when the user becomes idle */
  onIdle?: () => void;
  /** Whether the timeout is enabled (default: true) */
  enabled?: boolean;
};

const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DEFAULT_EVENTS = [
  'mousedown', 'mousemove', 'keypress', 
  'scroll', 'touchstart', 'click'
];

/**
 * A hook that detects when the user has been idle for a specified period
 */
export function useIdleTimeout({
  timeout = DEFAULT_TIMEOUT,
  events = DEFAULT_EVENTS,
  onIdle,
  enabled = true
}: IdleTimeoutOptions = {}) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeRef = useRef<number | null>(null);

  // Function to reset the idle timer
  const resetTimer = useCallback(() => {
    setIsIdle(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        setIsIdle(true);
        idleTimeRef.current = Date.now();
        if (onIdle) onIdle();
      }, timeout);
    }
  }, [timeout, onIdle, enabled]);

  // Set up event listeners for user activity
  useEffect(() => {
    if (!enabled) return;
    
    // Initial timer setup
    resetTimer();
    
    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });
    
    // Clean up event listeners on unmount
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer, events, enabled]);

  // Calculate how long user has been idle
  const getIdleTime = useCallback(() => {
    if (!isIdle || idleTimeRef.current === null) return 0;
    return Date.now() - idleTimeRef.current;
  }, [isIdle]);

  return {
    isIdle,
    resetTimer,
    getIdleTime
  };
}