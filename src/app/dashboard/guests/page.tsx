import GuestsClient from '@/components/dashboard/guests/guests-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom', 'collaborator'];

export default function GuestsPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
          <h1 className="text-3xl font-bold font-headline mb-2">Lista de Convidados</h1>
          <p className="text-muted-foreground mb-8">Gerencie seus convidados, confirme presenças e organize as mesas.</p>
          <GuestsClient />
      </div>
    </RoleGuard>
  );
}
