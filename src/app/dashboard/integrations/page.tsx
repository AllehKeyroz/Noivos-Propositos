import IntegrationsClient from '@/components/dashboard/integrations/integrations-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom'];

export default function IntegrationsPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
        <h1 className="text-3xl font-bold font-headline mb-2">Integrações & Webhooks</h1>
        <p className="text-muted-foreground mb-8">Conecte o "Propósitos" com outras ferramentas para automatizar seu fluxo de trabalho.</p>
        <IntegrationsClient />
      </div>
    </RoleGuard>
  );
}
