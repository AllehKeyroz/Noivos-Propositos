import TimelineClient from '@/components/dashboard/timeline/timeline-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom', 'collaborator'];

export default function TimelinePage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
        <h1 className="text-3xl font-bold font-headline mb-2">Nossa Linha do Tempo</h1>
        <p className="text-muted-foreground mb-8">Revivam os momentos mais especiais da jornada de vocês até aqui.</p>
        <TimelineClient />
      </div>
    </RoleGuard>
  );
}
