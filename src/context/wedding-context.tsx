'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, getDocs, collection, query, where, documentId, orderBy, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthentication } from '@/hooks/use-authentication';
import type { 
    AppUser, 
    WeddingData, 
    Task, 
    TaskCategory, 
    Guest, 
    BudgetItem, 
    BudgetCategory, 
    GiftSuggestion, 
    ReceivedGift, 
    PlaylistItem, 
    Appointment, 
    WeddingVow, 
    Devotional, 
    TimelineEvent, 
    TimeCapsuleItem,
    InspirationCategory,
    Inspiration,
    HomeTrousseauCategory,
    HomeTrousseauItem,
    Notification,
    NotificationCampaign,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface WeddingContextData {
  weddingData: WeddingData | null;
  tasks: Task[];
  taskCategories: TaskCategory[];
  guests: Guest[];
  budgetItems: BudgetItem[];
  budgetCategories: BudgetCategory[];
  giftSuggestions: GiftSuggestion[];
  receivedGifts: ReceivedGift[];
  playlist: PlaylistItem[];
  appointments: Appointment[];
  vows: WeddingVow[];
  devotionals: Devotional[];
  timelineEvents: TimelineEvent[];
  timeCapsuleItems: TimeCapsuleItem[];
  inspirationCategories: InspirationCategory[];
  inspirations: Inspiration[];
  homeTrousseauCategories: HomeTrousseauCategory[];
  homeTrousseauItems: HomeTrousseauItem[];
  notifications: Notification[];
  notificationCampaigns: NotificationCampaign[];
}

interface WeddingSummary {
  id: string;
  name: string;
}

interface WeddingContextType extends WeddingContextData {
  userProfile: AppUser | null;
  activeWeddingId: string | null;
  weddings: WeddingSummary[];
  switchWedding: (newWeddingId: string) => Promise<void>;
  loading: boolean;
}

const WeddingContext = createContext<WeddingContextType | undefined>(undefined);

const initialWeddingData: WeddingContextData = {
    weddingData: null,
    tasks: [],
    taskCategories: [],
    guests: [],
    budgetItems: [],
    budgetCategories: [],
    giftSuggestions: [],
    receivedGifts: [],
    playlist: [],
    appointments: [],
    vows: [],
    devotionals: [],
    timelineEvents: [],
    timeCapsuleItems: [],
    inspirationCategories: [],
    inspirations: [],
    homeTrousseauCategories: [],
    homeTrousseauItems: [],
    notifications: [],
    notificationCampaigns: [],
};

export function WeddingProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthentication();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [activeWeddingId, setActiveWeddingId] = useState<string | null>(null);
  const [weddings, setWeddings] = useState<WeddingSummary[]>([]);
  const [weddingSubData, setWeddingSubData] = useState<WeddingContextData>(initialWeddingData);
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingWeddings, setLoadingWeddings] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Effect for User Profile
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingProfile(false);
      setUserProfile(null);
      setActiveWeddingId(null);
      return;
    }

    setLoadingProfile(true);
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const profile = { id: docSnap.id, ...docSnap.data() } as AppUser;
        // Self-healing: if user has no createdAt, set it.
        if (!profile.createdAt && user.metadata.creationTime) {
          const createdAt = new Date(user.metadata.creationTime);
          setDoc(userDocRef, { createdAt }, { merge: true });
          profile.createdAt = createdAt as any; // Optimistic update
        }
        setUserProfile(profile);
        setActiveWeddingId(profile.activeWeddingId || (profile.weddingIds && profile.weddingIds[0]) || null);
      } else {
        setUserProfile(null);
        setActiveWeddingId(null);
      }
      setLoadingProfile(false);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      toast({ title: "Erro", description: "Não foi possível carregar seu perfil.", variant: "destructive" });
      setLoadingProfile(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, toast]);
  
  // Effect for fetching list of available weddings
  useEffect(() => {
    if (!userProfile?.weddingIds?.length) {
      setWeddings([]);
      setLoadingWeddings(false);
      return;
    }
    
    setLoadingWeddings(true);
    const weddingsQuery = query(collection(db, 'weddings'), where(documentId(), 'in', userProfile.weddingIds));
    
    getDocs(weddingsQuery).then(querySnapshot => {
      const weddingDetails = querySnapshot.docs.map(doc => {
          const data = doc.data() as WeddingData;
          return { id: doc.id, name: `${data.brideName} & ${data.groomName}` };
      });
      setWeddings(weddingDetails);
    }).catch(error => {
        console.error("Error fetching wedding details:", error);
        toast({ title: "Erro", description: "Não foi possível carregar os detalhes dos casamentos.", variant: "destructive" });
    }).finally(() => {
        setLoadingWeddings(false);
    });
  }, [userProfile, toast]);
  
  // Effect for Global Notifications
  useEffect(() => {
    setLoadingNotifications(true);
    const notificationsQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const campaignsQuery = query(collection(db, 'notificationCampaigns'), orderBy('createdAt', 'desc'));
    
    const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        const notificationsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Notification);
        setWeddingSubData(prev => ({...prev, notifications: notificationsData}));
        setLoadingNotifications(false);
    }, (error) => {
        console.error('Error fetching global notifications:', error);
        setLoadingNotifications(false);
    });

    const unsubCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
        const campaignsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as NotificationCampaign);
        setWeddingSubData(prev => ({...prev, notificationCampaigns: campaignsData}));
    }, (error) => {
        console.error('Error fetching notification campaigns:', error);
    });

    return () => {
        unsubNotifications();
        unsubCampaigns();
    };
  }, []);

  // Effect for fetching all data for the active wedding
  useEffect(() => {
    if (!activeWeddingId) {
        // Clear all wedding-specific data except notifications
        const { notifications, notificationCampaigns, ...rest } = weddingSubData;
        setWeddingSubData({ ...initialWeddingData, notifications, notificationCampaigns });
        setLoadingData(false);
        return;
    }

    setLoadingData(true);

    const collectionsToFetch = {
      weddingData: doc(db, 'weddings', activeWeddingId),
      tasks: query(collection(db, 'weddings', activeWeddingId, 'tasks'), orderBy('createdAt', 'asc')),
      taskCategories: query(collection(db, 'weddings', activeWeddingId, 'taskCategories'), orderBy('createdAt', 'asc')),
      guests: query(collection(db, 'weddings', activeWeddingId, 'guests'), orderBy('name', 'asc')),
      budgetItems: query(collection(db, 'weddings', activeWeddingId, 'budgetItems'), orderBy('createdAt', 'asc')),
      budgetCategories: query(collection(db, 'weddings', activeWeddingId, 'budgetCategories'), orderBy('createdAt', 'asc')),
      giftSuggestions: query(collection(db, 'weddings', activeWeddingId, 'giftSuggestions'), orderBy('createdAt', 'desc')),
      receivedGifts: query(collection(db, 'weddings', activeWeddingId, 'receivedGifts'), orderBy('createdAt', 'desc')),
      playlist: query(collection(db, 'weddings', activeWeddingId, 'playlist'), orderBy('createdAt', 'desc')),
      appointments: query(collection(db, 'weddings', activeWeddingId, 'appointments'), orderBy('date', 'asc')),
      vows: query(collection(db, 'weddings', activeWeddingId, 'vows'), orderBy('createdAt', 'desc')),
      devotionals: query(collection(db, 'weddings', activeWeddingId, 'devotionals'), orderBy('date', 'desc')),
      timelineEvents: query(collection(db, 'weddings', activeWeddingId, 'timelineEvents'), orderBy('date', 'asc')),
      timeCapsuleItems: query(collection(db, 'weddings', activeWeddingId, 'timeCapsuleItems'), orderBy('createdAt', 'asc')),
      inspirationCategories: query(collection(db, 'weddings', activeWeddingId, 'inspirationCategories'), orderBy('createdAt', 'asc')),
      inspirations: query(collection(db, 'weddings', activeWeddingId, 'inspirations'), orderBy('createdAt', 'desc')),
      homeTrousseauCategories: query(collection(db, 'weddings', activeWeddingId, 'homeTrousseauCategories'), orderBy('createdAt', 'asc')),
      homeTrousseauItems: query(collection(db, 'weddings', activeWeddingId, 'homeTrousseauItems'), orderBy('createdAt', 'desc')),
    };

    const unsubscribes = Object.entries(collectionsToFetch).map(([key, ref]) => {
      return onSnapshot(ref as any, (snapshot: any) => {
          if (snapshot.docs) { // This is a query snapshot
              const data = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
              setWeddingSubData(prev => ({ ...prev, [key]: data }));
          } else { // This is a document snapshot
              const data = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
              setWeddingSubData(prev => ({ ...prev, [key]: data }));
          }
      }, (error) => {
          console.error(`Error fetching ${key}:`, error);
          toast({ title: 'Erro de Dados', description: `Não foi possível carregar: ${key}`, variant: 'destructive' });
      });
    });
    
    setLoadingData(false);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [activeWeddingId, toast]);

  const switchWedding = useCallback(async (newWeddingId: string) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, { activeWeddingId: newWeddingId });
      // setActiveWeddingId(newWeddingId); // No longer need optimistic update, onSnapshot will handle it.
      toast({ title: "Sucesso!", description: "Você trocou de casamento." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível trocar de casamento.", variant: "destructive" });
    }
  }, [user, toast]);

  const loading = authLoading || loadingProfile || loadingWeddings || loadingData || loadingNotifications;
  const value = { 
    userProfile, 
    activeWeddingId, 
    weddings, 
    switchWedding, 
    loading, 
    ...weddingSubData
  };

  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>;
}

export function useWedding() {
  const context = useContext(WeddingContext);
  if (context === undefined) {
    throw new Error('useWedding must be used within a WeddingProvider');
  }
  return context;
}
