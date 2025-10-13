'use client';

import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { NotificationType } from '@/types/notifications';

interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [open, setOpen] = useState(false);

  // Load preferences when dialog opens
  useEffect(() => {
    if (open && user?.personneId) {
      fetchPreferences();
    }
  }, [open, user?.personneId]);

  const fetchPreferences = async () => {
    try {
      const res = await fetch(`/api/notification/preferences?user_id=${user?.personneId}`);
      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      });
    }
  };

  const updatePreference = async (type: NotificationType, enabled: boolean) => {
    if (!user?.personneId) return;

    try {
      const res = await fetch(`/api/notification/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.personneId,
          type,
          enabled,
        }),
      });

      if (res.ok) {
        setPreferences(prev =>
          prev.map(p => (p.type === type ? { ...p, enabled } : p))
        );
        toast({
          title: 'Success',
          description: 'Preference updated successfully',
        });
      } else {
        throw new Error('Failed to update preference');
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preference',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          <Settings2 className="h-4 w-4 mr-1" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4 py-4">
            {preferences.map(({ type, enabled }) => (
              <div key={type} className="flex items-center justify-between space-x-4">
                <Label htmlFor={type} className="flex-1">
                  {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                </Label>
                <Switch
                  id={type}
                  checked={enabled}
                  onCheckedChange={checked => updatePreference(type, checked)}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}