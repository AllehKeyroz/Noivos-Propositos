'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWedding } from '@/context/wedding-context';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/lib/types';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LayoutDashboard, Sparkles, ClipboardCheck, Users, Landmark, Gift, HeartHandshake, Music, CalendarDays, BookHeart, UserCog, ChevronsUpDown, GalleryHorizontal, Clock, Heart, Home } from 'lucide-react';

const mainMenuItems = [
  { href: '/dashboard', label: 'Painel Nupcial', icon: LayoutDashboard },
  { href: '/dashboard/timeline', label: 'Linha do Tempo', icon: GalleryHorizontal },
  { href: '/dashboard/capsule', label: 'Cápsula do Tempo', icon: Clock },
  { href: '/dashboard/inspirations', label: 'Inspirações', icon: Heart },
  { href: '/dashboard/planner', label: 'Planejador', icon: ClipboardCheck },
  { href: '/dashboard/guests', label: 'Convidados', icon: Users },
  { href: '/dashboard/budget', label: 'Financeiro', icon: Landmark },
  { href: '/dashboard/home-trousseau', label: 'Enxoval do Lar', icon: Home },
  { href: '/dashboard/gifts', label: 'Mural do Carinho', icon: Gift },
  { href: '/dashboard/appointments', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/vows', label: 'Votos', icon: HeartHandshake },
  { href: '/dashboard/soundtrack', label: 'Trilha Sonora', icon: Music },
  { href: '/dashboard/devotional', label: 'Devocional', icon: BookHeart },
  { href: '/dashboard/team', label: 'Equipe e Convidados', icon: UserCog },
];

const fullAccessLinks = mainMenuItems.map(item => item.href);

const rolePermissions: Record<AppRole, string[]> = {
    super_admin: fullAccessLinks,
    bride: fullAccessLinks,
    groom: fullAccessLinks,
    collaborator: [
        '/dashboard',
        '/dashboard/timeline',
        '/dashboard/capsule',
        '/dashboard/planner',
        '/dashboard/guests',
        '/dashboard/budget',
        '/dashboard/home-trousseau',
        '/dashboard/gifts',
        '/dashboard/appointments',
        '/dashboard/soundtrack',
    ],
    guest: [
        '/dashboard',
        '/dashboard/gifts',
        '/dashboard/soundtrack',
        '/dashboard/capsule',
    ],
};


const NavLink = ({ item, pathname, onClick }: { item: { href: string; label: string; icon: React.ElementType }, pathname: string | null, onClick?: () => void }) => (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10',
        pathname === item.href && 'bg-primary/10 text-primary font-semibold'
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
);

const SidebarContent = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname();
  const { userProfile, activeWeddingId, weddings, switchWedding, loading } = useWedding();
  
  const activeWedding = weddings.find(w => w.id === activeWeddingId);
  const userRole = userProfile?.role || 'guest';
  const allowedLinks = rolePermissions[userRole] || [];
  const filteredMenuItems = mainMenuItems.filter(item => allowedLinks.includes(item.href));

  return (
    <>
      <div className="flex items-center gap-2 px-2 mb-4">
        <Sparkles className="h-8 w-8 text-primary" />
        <span className="text-2xl font-headline font-bold">Propósitos</span>
      </div>
      
       {weddings.length > 0 && (
         <div className="px-2 mb-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                        <span className="truncate">
                            {loading ? 'Carregando...' : activeWedding?.name || 'Selecione...'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Alternar Casamento</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {weddings.map(wedding => (
                        <DropdownMenuItem key={wedding.id} onSelect={() => { switchWedding(wedding.id); onClose?.(); }}>
                            {wedding.name}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
       )}

      <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {loading ? (
            <div className="space-y-3 px-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
        ) : (
            filteredMenuItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose}/>
            ))
        )}
      </nav>
    </>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent side="left" className="w-64 p-4 flex flex-col">
            <SidebarContent onClose={onClose} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen border-r border-border bg-card flex-col p-4 hidden md:flex">
         <SidebarContent />
      </aside>
    </>
  );
}