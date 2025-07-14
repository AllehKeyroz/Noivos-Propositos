import VowsClient from '@/components/dashboard/vows/vows-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom'];

export default function VowsPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
        <h1 className="text-3xl font-bold font-headline mb-2">Votos de Casamento</h1>
        <p className="text-muted-foreground mb-8">Crie, gerencie e aperfeiçoe seus votos com a ajuda da nossa IA ou escreva-os do zero.</p>
        <VowsClient />
      </div>
    </RoleGuard>
  );
}
