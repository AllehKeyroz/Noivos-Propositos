'use client';

import type { ReactNode } from 'react';
import { useWedding } from '@/context/wedding-context';
import type { AppRole } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  accessDeniedComponent?: ReactNode;
}

const DefaultAccessDenied = () => (
    <Card className="text-center p-8 border-dashed mt-8">
        <Lock className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
        <h2 className="text-2xl font-bold font-headline mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Você não tem permissão para visualizar esta página.
        </p>
    </Card>
);

export default function RoleGuard({ children, allowedRoles, accessDeniedComponent }: RoleGuardProps) {
  const { userProfile, loading } = useWedding();

  if (loading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  const userRole = userProfile?.role;
  const isSuperAdmin = userRole === 'super_admin';

  if (isSuperAdmin || (userRole && allowedRoles.includes(userRole))) {
    return <>{children}</>;
  }
  
  return <>{accessDeniedComponent || <DefaultAccessDenied />}</>;
}
