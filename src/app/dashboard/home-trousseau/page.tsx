import HomeTrousseauClient from '@/components/dashboard/home-trousseau/home-trousseau-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom', 'collaborator'];

export default function HomeTrousseauPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
        <h1 className="text-3xl font-bold font-headline mb-2">Enxoval do Lar</h1>
        <p className="text-muted-foreground mb-8">Planejem e organizem os itens para o novo lar de vocês.</p>
        <HomeTrousseauClient />
      </div>
    </RoleGuard>
  );
}
