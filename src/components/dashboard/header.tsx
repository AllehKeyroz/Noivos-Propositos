'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useAuthentication } from '@/hooks/use-authentication';
import { useWedding } from '@/context/wedding-context';
import type { AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Settings, LogOut, Loader2, Shield, Menu, ChevronsUpDown, Gem, PlugZap } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import NotificationsWidget from './notifications-widget';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuthentication();
  const router = useRouter();
  const { userProfile: profile, activeWeddingId, weddings, switchWedding, loading: weddingLoading } = useWedding();
  
  const activeWedding = weddings.find(w => w.id === activeWeddingId);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return <User className="h-5 w-5" />;
    return name.split(' ').map(n => n[0]).slice(0, 2).join('');
  };

  if (!user) return null;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 sm:px-8 md:justify-end md:gap-4">
       <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Abrir menu</span>
      </Button>
      
      <div className="flex-1 flex justify-end items-center gap-4">
        {weddings.length > 0 && (
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-[250px] justify-between hidden md:flex">
                      <span className="truncate">
                          {weddingLoading ? 'Carregando...' : activeWedding?.name || 'Selecione um casamento'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end">
                  <DropdownMenuLabel>Alternar Casamento</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {weddings.map(wedding => (
                  <DropdownMenuItem key={wedding.id} onSelect={() => switchWedding(wedding.id)} disabled={wedding.id === activeWeddingId}>
                      {wedding.name}
                  </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        <NotificationsWidget />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              {weddingLoading ? (
                <Skeleton className="h-10 w-10 rounded-full" />
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.photoUrl} alt={profile?.name || ''} data-ai-hint="person" />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {getInitials(profile?.name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">
                  {weddingLoading ? <Skeleton className="h-4 w-32" /> : (profile?.name || 'Usuário')}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profile?.role === 'super_admin' && (
              <DropdownMenuItem asChild>
                <Link href="/admin/dashboard">
                  <Shield className="mr-2" />
                  <span>Painel Admin</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <User className="mr-2" />
                <span>Meu Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2" />
                <span>Configurações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/integrations">
                  <PlugZap className="mr-2" />
                  <span>Integrações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/plans">
                <Gem className="mr-2" />
                <span>Nossos Planos</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
