import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWebSocket, WebSocketMessage } from './use-websocket';
import { useToast } from './use-toast';

// Types for notifications
export type NotificationType = 'check-in' | 'partner-update';

export interface BaseNotification {
  id: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
}

export interface CheckInNotification extends BaseNotification {
  type: 'check-in';
  visitorId: number;
  visitorName: string;
  phoneNumber: string;
  purpose: string;
}

export interface PartnerUpdateNotification extends BaseNotification {
  type: 'partner-update';
  action: 'linked' | 'unlinked';
  visitorId: number;
  visitorName: string;
  partnerId: number | null;
  partnerName: string | null;
}

// Union type for all notification types
export type Notification = CheckInNotification | PartnerUpdateNotification;

// Context interface
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

// Create context with default values
const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
});

// Provider component props
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  // State for notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();

  // Connect to WebSocket, using relative URL to handle various deployment scenarios
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
  const { isConnected, lastMessage } = useWebSocket(wsUrl);

  // Process WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    
    console.log('WebSocket message received:', lastMessage);
    
    // Handle check-in notifications
    if (lastMessage.type === 'check-in') {
      const { visitor, purpose, timestamp } = lastMessage;
      console.log('Check-in notification:', visitor, purpose, timestamp);
      
      const newNotification: CheckInNotification = {
        id: `${Date.now()}-${visitor.id}`,
        type: 'check-in',
        visitorId: visitor.id,
        visitorName: visitor.fullName,
        phoneNumber: visitor.phoneNumber,
        purpose: purpose || 'Not specified',
        timestamp: timestamp,
        read: false,
      };
      
      // Add to notifications
      setNotifications(prev => [newNotification, ...prev]);
      
      // Show toast notification
      toast({
        title: 'New Visitor Check-in',
        description: `${visitor.fullName} has checked in.`,
        duration: 5000,
      });
    }
    
    // Handle partner update notifications
    if (lastMessage.type === 'partner-update') {
      const { action, visitor, partner, timestamp } = lastMessage;
      
      const newNotification: PartnerUpdateNotification = {
        id: `${Date.now()}-partner-${visitor.id}`,
        type: 'partner-update',
        action: action,
        visitorId: visitor.id,
        visitorName: visitor.fullName,
        partnerId: partner?.id || null,
        partnerName: partner?.fullName || null,
        timestamp: timestamp,
        read: false,
      };
      
      // Add to notifications
      setNotifications(prev => [newNotification, ...prev]);
      
      // Show toast notification with appropriate message
      const toastTitle = action === 'linked' ? 'Visitors Partnered' : 'Partner Relationship Removed';
      const toastDescription = action === 'linked' 
        ? `${visitor.fullName} partnered with ${partner?.fullName}.`
        : `Partner relationship removed for ${visitor.fullName}.`;
      
      toast({
        title: toastTitle,
        description: toastDescription,
        duration: 5000,
      });
    }
  }, [lastMessage, toast]);

  // Log WebSocket connection state for debugging
  useEffect(() => {
    console.log('WebSocket connection status:', isConnected ? 'Connected' : 'Disconnected');
  }, [isConnected]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Value for the context
  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook for using the notification context
export const useNotifications = () => useContext(NotificationContext);