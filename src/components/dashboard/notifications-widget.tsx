'use client';

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { useWedding } from '@/context/wedding-context';
import { useAuthentication } from '@/hooks/use-authentication';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import type { Notification, NotificationCampaign, UserNotificationState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Circle, Trash2 } from 'lucide-react';
import { formatDistanceToNow, isPast, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MergedNotification extends Omit<Notification, 'target'> {
  isRead: boolean;
  isCampaign?: boolean; // flag to distinguish from manual notifications
}

export default function NotificationsWidget() {
  const { user } = useAuthentication();
  const { userProfile, weddingData, notifications: globalNotifications, notificationCampaigns, loading: contextLoading } = useWedding();
  const [userStates, setUserStates] = useState<Record<string, UserNotificationState>>({});
  const [loadingStates, setLoadingStates] = useState(true);
  
  useEffect(() => {
    if (!user) {
      setUserStates({});
      setLoadingStates(false);
      return;
    }
    setLoadingStates(true);
    const userStatesRef = collection(db, 'users', user.uid, 'notificationStates');
    const unsubscribe = onSnapshot(userStatesRef, (snapshot) => {
      const states: Record<string, UserNotificationState> = {};
      snapshot.forEach(doc => {
        states[doc.id] = doc.data() as UserNotificationState;
      });
      setUserStates(states);
      setLoadingStates(false);
    });
    return () => unsubscribe();
  }, [user]);

  const mergedNotifications = useMemo<MergedNotification[]>(() => {
    // 1. Process manual notifications
    const manualNotifications: MergedNotification[] = globalNotifications
      .filter(notif => {
        if (userStates[notif.id]?.deleted) {
            return false;
        }
        if (notif.target === 'couples') {
            const userRole = userProfile?.role;
            return userRole === 'bride' || userRole === 'groom' || userRole === 'super_admin';
        }
        return true;
      })
      .map(notif => ({
        ...notif,
        isRead: userStates[notif.id]?.read || false,
      }));

    // 2. Process automated campaign notifications
    const campaignNotifications: MergedNotification[] = [];
    const today = new Date();

    if (userProfile?.createdAt) {
        notificationCampaigns
            .filter(c => c.isActive && !userStates[c.id]?.deleted)
            .forEach(campaign => {
                let triggerDate: Date | null = null;
                if (campaign.triggerType === 'relativeToSignup' && userProfile.createdAt) {
                    triggerDate = addDays(userProfile.createdAt.toDate(), campaign.offsetDays);
                } else if (campaign.triggerType === 'relativeToWeddingDate' && weddingData?.weddingDate) {
                    triggerDate = addDays(weddingData.weddingDate.toDate(), campaign.offsetDays);
                }
                
                // If the trigger date is in the past, the notification is active
                if (triggerDate && isPast(triggerDate)) {
                    campaignNotifications.push({
                        id: campaign.id,
                        title: campaign.title,
                        description: campaign.description,
                        buttonLabel: campaign.buttonLabel,
                        buttonUrl: campaign.buttonUrl,
                        createdAt: campaign.createdAt, // Using campaign creation for sorting
                        isRead: userStates[campaign.id]?.read || false,
                        isCampaign: true,
                    });
                }
            });
    }

    // 3. Combine and sort
    return [...manualNotifications, ...campaignNotifications]
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      
  }, [globalNotifications, notificationCampaigns, userStates, userProfile, weddingData]);

  const unreadCount = useMemo(() => {
    return mergedNotifications.filter(n => !n.isRead).length;
  }, [mergedNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user || userStates[notificationId]?.read) return;
    try {
      const stateRef = doc(db, 'users', user.uid, 'notificationStates', notificationId);
      await setDoc(stateRef, { read: true }, { merge: true });
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  };
  
  const handleDelete = async (notificationId: string) => {
    if (!user) return;
    try {
      const stateRef = doc(db, 'users', user.uid, 'notificationStates', notificationId);
      await setDoc(stateRef, { deleted: true }, { merge: true });
    } catch (e) {
      console.error("Error deleting notification:", e);
    }
  };

  const loading = contextLoading || loadingStates;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notificações</span>
            {unreadCount > 0 && <span className="text-xs font-normal bg-primary text-primary-foreground rounded-full px-2 py-0.5">{unreadCount} nova(s)</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-auto max-h-96">
            {loading ? (
                <DropdownMenuItem disabled>Carregando...</DropdownMenuItem>
            ) : mergedNotifications.length > 0 ? (
                mergedNotifications.map((notification) => (
                    <div key={notification.id} className="relative flex flex-col p-2 hover:bg-accent rounded-md">
                        <div className="flex items-start gap-3">
                            {!notification.isRead && <Circle className="h-2 w-2 mt-2 fill-primary text-primary shrink-0"/>}
                            <div className={cn("flex-1", !notification.isRead && "ml-[-14px]")}>
                                <p className="font-semibold">{notification.title}</p>
                                <p className="text-sm text-muted-foreground">{notification.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
                                </p>
                                <div className="mt-2 flex gap-2">
                                    {notification.buttonLabel && notification.buttonUrl && (
                                        <Link href={notification.buttonUrl} target={notification.buttonUrl.startsWith('/') ? '_self' : '_blank'} rel="noopener noreferrer" passHref>
                                            <Button size="sm" onClick={() => handleMarkAsRead(notification.id)}>{notification.buttonLabel}</Button>
                                        </Link>
                                    )}
                                    {!notification.isRead && (
                                        <Button variant="secondary" size="sm" onClick={() => handleMarkAsRead(notification.id)}>Marcar como lida</Button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification.id);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))
            ) : (
                <DropdownMenuItem disabled>Nenhuma notificação.</DropdownMenuItem>
            )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
