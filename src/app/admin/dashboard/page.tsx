import AdminDashboardClient from '@/components/admin/dashboard/admin-dashboard-client';

export default function AdminDashboardPage() {
    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-headline mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground mb-8">Bem-vindo ao painel de gerenciamento.</p>
            <AdminDashboardClient />
        </div>
    );
}
