import InspirationsClient from '@/components/dashboard/inspirations/inspirations-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom'];

export default function InspirationsPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
        <h1 className="text-3xl font-bold font-headline mb-2">Mural de Inspirações</h1>
        <p className="text-muted-foreground mb-8">Colecione ideias, referências e inspire-se para o grande dia.</p>
        <InspirationsClient />
      </div>
    </RoleGuard>
  );
}
