'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useWedding } from '@/context/wedding-context';
import Countdown from '@/components/dashboard/countdown';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, UserCog, PartyPopper, HeartHandshake, Gift, Music } from 'lucide-react';
import TaskSummaryWidget from '@/components/dashboard/planner/task-summary-widget';
import GuestSummaryWidget from '@/components/dashboard/guests/guest-summary-widget';
import BudgetSummaryWidget from '@/components/dashboard/budget/budget-summary-widget';
import TimelineSummaryWidget from '@/components/dashboard/timeline/timeline-summary-widget';
import CapsuleSummaryWidget from '@/components/dashboard/capsule/capsule-summary-widget';
import GiftSummaryWidget from '@/components/dashboard/gifts/gift-summary-widget';
import DevotionalSummaryWidget from '@/components/dashboard/devotional/devotional-summary-widget';
import HomeTrousseauSummaryWidget from '@/components/dashboard/home-trousseau/home-trousseau-summary-widget';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  const { 
    userProfile, 
    activeWeddingId, 
    loading,
    weddingData,
    tasks,
    guests,
    budgetItems,
    timelineEvents,
    timeCapsuleItems,
    giftSuggestions,
    receivedGifts,
    devotionals,
    homeTrousseauItems,
  } = useWedding();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!activeWeddingId) {
    if(userProfile?.weddingIds && userProfile.weddingIds.length > 0) {
      return <SelectWeddingPrompt />;
    }
    return <PendingActivationPrompt />;
  }

  if (!weddingData) {
    return <SetupPrompt />;
  }
  
  const { brideName, groomName, coverPhotoUrl, weddingDate } = weddingData;
  const weddingDateTime = weddingDate?.toDate();
  const isGuest = userProfile?.role === 'guest';

  return (
    <div className="w-full space-y-8">
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden shadow-lg">
        <Image
          src={coverPhotoUrl || 'https://placehold.co/1200x400.png'}
          alt="Foto de capa do casamento"
          fill
          className="object-cover bg-muted"
          data-ai-hint="wedding couple"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 text-white">
          <h1 className="font-headline text-4xl md:text-5xl font-bold">
            Bem-vindos, {brideName} &amp; {groomName}!
          </h1>
          <p className="mt-2 text-lg text-white/90">
            Este é o seu painel para o grande dia.
          </p>
        </div>
      </div>

      <Card className="p-6 bg-card">
        <Countdown targetDate={weddingDateTime} />
      </Card>
      
      {isGuest ? (
        <GuestWelcomeMessage />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <TaskSummaryWidget tasks={tasks} />
          <GuestSummaryWidget guests={guests} />
          <BudgetSummaryWidget budgetItems={budgetItems} weddingData={weddingData} />
          <HomeTrousseauSummaryWidget items={homeTrousseauItems} />
          <TimelineSummaryWidget events={timelineEvents} />
          <CapsuleSummaryWidget items={timeCapsuleItems} />
          <GiftSummaryWidget suggestions={giftSuggestions} receivedGifts={receivedGifts} />
          <DevotionalSummaryWidget devotionals={devotionals} />
        </div>
      )}
    </div>
  );
}

const GuestWelcomeMessage = () => (
    <Card className="bg-primary/5 border-primary/20 p-8 text-center">
        <HeartHandshake className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-headline font-bold text-primary">Sua presença é o nosso maior presente!</h2>
        <p className="text-muted-foreground mt-2 mb-6 max-w-2xl mx-auto">
            Estamos imensamente felizes por ter você ao nosso lado neste momento tão especial. Criamos este espaço para que você possa participar conosco. Sinta-se em casa!
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard/gifts" passHref className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                    <Gift className="mr-2"/>
                    Mural do Carinho
                </Button>
            </Link>
            <Link href="/dashboard/soundtrack" passHref className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                     <Music className="mr-2"/>
                    Trilha Sonora
                </Button>
            </Link>
        </div>
    </Card>
);

const DashboardSkeleton = () => (
    <div className="w-full space-y-8">
        <Skeleton className="w-full h-[400px] rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
    </div>
);

const SelectWeddingPrompt = () => (
    <div className="flex flex-col items-center justify-center h-full text-center bg-card p-10 rounded-lg border-2 border-dashed">
        <PartyPopper className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold font-headline mb-2">Bem-vindo(a) de volta!</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
           Você tem acesso a múltiplos casamentos. Por favor, selecione um no menu superior para começar.
        </p>
    </div>
);

const PendingActivationPrompt = () => (
    <div className="flex flex-col items-center justify-center h-full text-center bg-card p-10 rounded-lg border-2 border-dashed">
        <UserCog className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold font-headline mb-2">Conta Pendente de Ativação</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
            Sua conta foi criada com sucesso, mas você ainda não foi atribuído a um casamento. Por favor, aguarde o contato de um administrador.
        </p>
    </div>
);

const SetupPrompt = () => (
    <div className="flex flex-col items-center justify-center h-full text-center bg-card p-10 rounded-lg border-2 border-dashed">
        <h2 className="text-2xl font-bold font-headline mb-2">Bem-vindo(a) ao seu Painel Nupcial!</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
            Parece que você ainda não configurou os detalhes do seu casamento. Vamos começar!
        </p>
        <Link href="/dashboard/settings" passHref>
            <Button size="lg">
                <Settings className="mr-2" />
                Configurar meu Casamento
            </Button>
        </Link>
    </div>
);