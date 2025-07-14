'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthentication } from '@/hooks/use-authentication';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Heart } from 'lucide-react';

interface Stats {
  userCount: number;
  weddingCount: number;
}

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: number; icon: React.ElementType, isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-16" />
            ) : (
                <div className="text-2xl font-bold">{value}</div>
            )}
        </CardContent>
    </Card>
);

export default function AdminDashboardClient() {
  const { user } = useAuthentication();
  const [stats, setStats] = useState<Stats>({ userCount: 0, weddingCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const usersQuery = collection(db, 'users');
        const weddingsQuery = collection(db, 'weddings');

        const [usersSnapshot, weddingsSnapshot] = await Promise.all([
          getDocs(usersQuery),
          getDocs(weddingsQuery),
        ]);

        setStats({
          userCount: usersSnapshot.size,
          weddingCount: weddingsSnapshot.size,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Usuários" value={stats.userCount} icon={Users} isLoading={isLoading} />
        <StatCard title="Total de Casamentos" value={stats.weddingCount} icon={Heart} isLoading={isLoading} />
    </div>
  );
}
