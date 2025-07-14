import DevotionalClient from '@/components/dashboard/devotional/devotional-client';
import RoleGuard from '@/components/auth/role-guard';
import type { AppRole } from '@/lib/types';

const ALLOWED_ROLES: AppRole[] = ['bride', 'groom'];

export default function DevotionalPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="w-full">
        <h1 className="text-3xl font-bold font-headline mb-2">Devocional do Casal</h1>
        <p className="text-muted-foreground mb-8">Um momento diário para fortalecer a fé e a união de vocês.</p>
        <DevotionalClient />
      </div>
    </RoleGuard>
  );
}
