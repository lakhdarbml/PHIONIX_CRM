"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Settings2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import io from 'socket.io-client';
import type { ID } from '@/types/db';
import { NotificationType, notificationPermissions } from '@/types/notifications';
import { NotificationPreferences } from '@/components/notification-preferences';

// Expected shape from GET /api/notification
type Notification = {
  id_notification: ID;
  titre: string;
  message: string;
  destinataire_id: ID;
  lu: boolean;
  type: string;
  meta?: any;
  date_creation: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Get notifications on mount
  useEffect(() => {
    if (!user?.personneId) return;
    fetchNotifications();
  }, [user?.personneId]);

  // Subscribe to socket events
  useEffect(() => {
    if (!user?.personneId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || 4000}`;
    const socket = io(socketUrl);

    // Join personal room to receive notifications
    socket.emit('join', String(user.personneId));

    socket.on('notification_created', (notification: Notification) => {
      // Only add if it's for this user and we don't already have it
      if (String(notification.destinataire_id) === String(user.personneId)) {
        setNotifications(prev => {
          const exists = prev.some(n => String(n.id_notification) === String(notification.id_notification));
          if (exists) return prev;
          return [notification, ...prev];
        });

        // Toast only if popover is closed
        if (!isOpen) {
          toast({
            title: notification.titre,
            description: notification.message,
          });
        }
      }
    });

    return () => {
      try {
        socket.emit('leave', String(user.personneId));
        socket.disconnect();
      } catch (e) { /* ignore */ }
    };
  }, [user?.personneId, isOpen, toast]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notification?destinataire_id=${user?.personneId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }, [user?.personneId]);

  const markAsRead = useCallback(async (id: ID) => {
    try {
      const res = await fetch(`/api/notification/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lu: true }),
      });
      if (res.ok) {
        // Update local state
        setNotifications(prev => prev.map(n => 
          String(n.id_notification) === String(id) ? { ...n, lu: true } : n
        ));
      }
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  }, []);

  const router = useRouter();

  const handleNotificationClick = useCallback(async (n: Notification) => {
    try {
      // Mark as read first
      await markAsRead(n.id_notification);
      // Navigate based on meta
      if (n.meta) {
        const meta = typeof n.meta === 'string' ? JSON.parse(n.meta) : n.meta;
        // Conversation / Message
        if (meta.id_conversation || meta.id_message) {
          const convId = meta.id_conversation || meta.id_conversation_from_message || null;
          if (convId) {
            router.push(`/messages?conversation_id=${convId}`);
            return;
          }
        }
        // Interaction
        if (meta.id_interaction) {
          router.push(`/interactions/${meta.id_interaction}`);
          return;
        }
        // Task
        if (meta.id_task) {
          router.push(`/tasks/${meta.id_task}`);
          return;
        }
        // Opportunity
        if (meta.id_opportunite || meta.id_opportunity) {
          const id = meta.id_opportunite || meta.id_opportunity;
          router.push(`/opportunities/${id}`);
          return;
        }
      }

      // Fallback: open notifications page
      router.push('/notifications');
    } catch (e) {
      console.error('Failed to handle notification click', e);
    }
  }, [markAsRead, router]);

  const unreadCount = notifications.filter(n => !n.lu).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -right-1 -top-1 h-5 min-w-[20px] rounded-full px-1"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">View notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchNotifications}
              className="text-xs"
            >
              Refresh
            </Button>
            <NotificationPreferences />
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No notifications yet
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div 
                  key={n.id_notification}
                  className={cn(
                    'p-3 rounded-lg transition-colors cursor-pointer',
                    !n.lu && 'bg-muted/50',
                    n.lu && 'hover:bg-muted/30'
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(n)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(n)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn('text-sm', !n.lu && 'font-medium')}>
                        {n.titre}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {n.message}
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(n.date_creation).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </time>
                  </div>
                    {!n.lu && (
                    <div className="mt-2 text-xs">
                      <Button
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id_notification);
                        }}
                      >
                        Mark as read
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}