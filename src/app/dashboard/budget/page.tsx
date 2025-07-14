import BudgetClient from '@/components/dashboard/budget/budget-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom', 'collaborator'];

export default function BudgetPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
        <h1 className="text-3xl font-bold font-headline mb-2">Controle Financeiro</h1>
        <p className="text-muted-foreground mb-8">Gerencie seu orçamento, controle despesas e acompanhe os pagamentos.</p>
        <BudgetClient />
      </div>
    </RoleGuard>
  );
}
