import TeamClient from '@/components/dashboard/team/team-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom'];

export default function TeamPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
        <h1 className="text-3xl font-bold font-headline mb-2">Equipe e Convidados</h1>
        <p className="text-muted-foreground mb-8">Gerencie quem pode ajudar a planejar e quem pode interagir com as funcionalidades do seu casamento.</p>
        <TeamClient />
      </div>
    </RoleGuard>
  );
}
