import AppointmentsClient from '@/components/dashboard/appointments/appointments-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom', 'collaborator'];

export default function AppointmentsPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
        <h1 className="text-3xl font-bold font-headline mb-2">Tempo de Amar</h1>
        <p className="text-muted-foreground mb-8">Sincronize seus compromissos e não perca nenhuma data importante.</p>
        <AppointmentsClient />
      </div>
    </RoleGuard>
  );
}
