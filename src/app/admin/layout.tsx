import type { ReactNode } from 'react';
import AdminGuard from '@/components/admin/admin-guard';
import AdminSidebar from '@/components/admin/admin-sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <main className="md:ml-64">
           <div className="p-4 md:p-8">
            {children}
           </div>
        </main>
      </div>
    </AdminGuard>
  );
}
