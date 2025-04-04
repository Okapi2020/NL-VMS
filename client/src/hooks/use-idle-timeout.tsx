import { useState, useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeoutOptions {
  timeout: number; // Timeout in milliseconds
  onIdle: () => void; // Function to call when user becomes idle
  onActive?: () => void; // Optional function to call when user becomes active
  events?: string[]; // Events to listen for activity
  debounce?: number; // Debounce delay for activity events
  enabled?: boolean; // Whether the idle timer is enabled or not
}

export function useIdleTimeout({
  timeout,
  onIdle,
  onActive,
  events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'scroll'],
  debounce = 300,
  enabled = true,
}: UseIdleTimeoutOptions): void {
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);

  // Clear both timeouts
  const clearTimeouts = useCallback(() => {
    if (idleTimeoutRef.current) {
      window.clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  // Start the idle timer
  const startIdleTimer = useCallback(() => {
    // Clear any existing timeout
    if (idleTimeoutRef.current) {
      window.clearTimeout(idleTimeoutRef.current);
    }
    
    // Set a new timeout
    idleTimeoutRef.current = window.setTimeout(() => {
      setIsIdle(true);
      if (onIdle) {
        onIdle();
      }
    }, timeout);
  }, [timeout, onIdle]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (!enabled) return;
    
    // If we're using debounce, only reset the timer after debounce ms
    if (debounce > 0) {
      if (debounceTimeoutRef.current) {
        return; // Ignore events until debounce expires
      }
      
      debounceTimeoutRef.current = window.setTimeout(() => {
        debounceTimeoutRef.current = null;
      }, debounce);
    }
    
    if (isIdle) {
      setIsIdle(false);
      if (onActive) {
        onActive();
      }
    }
    
    startIdleTimer();
  }, [startIdleTimer, isIdle, onActive, debounce, enabled]);

  useEffect(() => {
    if (!enabled) return;
    
    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    // Start the initial idle timer
    startIdleTimer();
    
    // Cleanup function
    return () => {
      // Remove event listeners
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      // Clear timeouts
      clearTimeouts();
    };
  }, [events, handleActivity, startIdleTimer, clearTimeouts, enabled]);

  // If enabled status changes, handle accordingly
  useEffect(() => {
    if (enabled) {
      startIdleTimer();
    } else {
      clearTimeouts();
    }
  }, [enabled, startIdleTimer, clearTimeouts]);
}