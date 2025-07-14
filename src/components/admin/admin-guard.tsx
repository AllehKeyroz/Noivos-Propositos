'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, setDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthentication } from '@/hooks/use-authentication';
import { useToast } from '@/hooks/use-toast';
import type { AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuthentication();
  const router = useRouter();
  const { toast } = useToast();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as AppUser;
          if (userData.role === 'super_admin') {
            setIsSuperAdmin(true);
          } else {
            // User exists but is not a super_admin, deny access.
            router.replace('/dashboard');
          }
        } else {
          // This logic handles the very first user, promoting them to super_admin.
          const adminsQuery = query(collection(db, 'users'), where('role', '==', 'super_admin'), limit(1));
          const adminSnapshot = await getDocs(adminsQuery);

          if (adminSnapshot.empty) {
            // No admins exist, this user becomes the first super_admin.
            await setDoc(userDocRef, { email: user.email, role: 'super_admin' }, { merge: true });
            setIsSuperAdmin(true);
            toast({
              title: 'Bem-vindo, Super Administrador!',
              description: 'Sua conta foi automaticamente promovida.',
            });
          } else {
            // A super_admin already exists. Create a standard user doc (or let signup handle it) and deny access.
             router.replace('/dashboard');
          }
        }
      } catch (error) {
        console.error("Error checking/setting admin status:", error);
        router.replace('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, authLoading, router, toast]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  return null; // or a fallback component
}
