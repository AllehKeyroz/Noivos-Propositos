import PlannerClient from '@/components/dashboard/planner/planner-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom', 'collaborator'];

export default function PlannerPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
          <h1 className="text-3xl font-bold font-headline mb-2">Planejador de Tarefas</h1>
          <p className="text-muted-foreground mb-8">Organize cada detalhe do seu casamento, desde os fornecedores até a lua de mel.</p>
          <PlannerClient />
      </div>
    </RoleGuard>
  );
}
