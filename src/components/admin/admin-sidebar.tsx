'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Shield, Building, Users, LayoutDashboard, ArrowLeftCircle, Bot, Megaphone, Zap, Variable } from 'lucide-react';
import { Button } from '../ui/button';

const adminMenuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/weddings', label: 'Gerenciar Casamentos', icon: Building },
  { href: '/admin/users', label: 'Gerenciar Usuários', icon: Users },
  { href: '/admin/prompts', label: 'Gerenciar Prompts', icon: Bot },
  { href: '/admin/notifications', label: 'Notificações Manuais', icon: Megaphone },
  { href: '/admin/automations', label: 'Gerenciar Automações', icon: Zap },
  { href: '/admin/variables', label: 'Gerenciar Variáveis', icon: Variable },
];

const NavLink = ({ item, pathname }: { item: { href: string; label: string; icon: React.ElementType }, pathname: string | null }) => (
  <Link
    href={item.href}
    className={cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10',
      pathname === item.href && 'bg-primary/10 text-primary font-semibold'
    )}
  >
    <item.icon className="h-5 w-5" />
    {item.label}
  </Link>
);

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="fixed top-0 left-0 z-40 w-64 h-screen border-r border-border bg-card flex flex-col p-4 hidden md:flex">
      <div className="flex items-center gap-2 px-2 mb-4">
        <Shield className="h-8 w-8 text-destructive" />
        <span className="text-2xl font-headline font-bold">Admin</span>
      </div>
      <p className="px-2 text-xs text-muted-foreground mb-8">Painel de Gerenciamento</p>
      
      <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {adminMenuItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="mt-auto">
         <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard')}>
            <ArrowLeftCircle className="mr-2" />
            Voltar ao App
         </Button>
      </div>
    </aside>
  );
}
