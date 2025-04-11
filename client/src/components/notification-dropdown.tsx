import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';
import { formatDistanceToNow } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useLanguage } from '@/hooks/use-language';

import {
  Button,
} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Notification dropdown component for the admin panel
 * Displays recent notifications (check-ins and partner updates) with an unread counter
 */
export function NotificationDropdown() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useNotifications();
  
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  
  // Format notification time based on current language
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    try {
      return formatDistanceToNow(date, { 
        addSuffix: true,
        locale: language === 'fr' ? fr : enUS
      });
    } catch (err) {
      return new Date(timestamp).toLocaleTimeString(
        language === 'fr' ? 'fr-FR' : 'en-US'
      );
    }
  };

  // Handle notification click
  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{t('notifications')}</span>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={markAllAsRead}
              >
                {t('markAllRead')}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={clearNotifications}
              >
                {t('clear')}
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px]">
          <DropdownMenuGroup>
            {notifications.length === 0 ? (
              <div className="px-2 py-4 text-center text-muted-foreground">
                {t('noNotifications')}
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id}
                  className={`flex flex-col items-start p-3 gap-1 cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="flex w-full justify-between items-center">
                    <span className="font-medium">
                      {notification.visitorName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                  
                  {/* Different content based on notification type */}
                  {notification.type === 'check-in' ? (
                    <>
                      <div className="text-sm text-muted-foreground">
                        {t('checkedIn')}
                      </div>
                      
                      <div className="text-xs mt-1 text-muted-foreground">
                        {t('purpose')}: {(notification as any).purpose}
                      </div>
                    </>
                  ) : notification.type === 'partner-update' ? (
                    <div className="text-sm text-muted-foreground">
                      {(notification as any).action === 'linked' ? (
                        <>
                          {t('partnerLinked')}: <span className="font-medium">{(notification as any).partnerName}</span>
                        </>
                      ) : (
                        t('partnerUnlinked')
                      )}
                    </div>
                  ) : null}
                  
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary absolute right-2 top-3" />
                  )}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}