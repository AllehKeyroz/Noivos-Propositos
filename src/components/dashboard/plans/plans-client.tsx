'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check, CheckCircle2, Heart, Star, Sparkles, Gem, BrainCircuit, Users, GalleryHorizontal } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const plans = [
  {
    id: 'sonho',
    name: 'O Sonho',
    icon: Heart,
    price: 'Grátis',
    priceDescription: 'Para sempre',
    description: 'O essencial para começar a jornada e organizar as ideias.',
    features: [
      'Painel de Controle',
      'Planejador de Tarefas',
      'Lista de Convidados (até 50)',
      'Controle Financeiro Básico',
      'Trilha Sonora Colaborativa',
    ],
    cta: 'Começar Gratuitamente',
    variant: 'outline' as const,
    recommended: false,
  },
  {
    id: 'jornada',
    name: 'A Jornada',
    icon: Sparkles,
    price: 'R$ 49,90',
    priceDescription: '/mês',
    description: 'A experiência completa para construir cada detalhe com a ajuda da IA.',
    features: [
      'Tudo do plano "O Sonho"',
      'Convidados Ilimitados',
      'Linha do Tempo do Casal',
      'Cápsula do Tempo Emocional',
      'Agenda de Compromissos',
      'Assistente de IA para Votos',
      'Devocional Diário com IA',
      'Propósitos AI (Chat Inteligente)',
      'Adicionar Colaboradores',
    ],
    cta: 'Assinar A Jornada',
    variant: 'default' as const,
    recommended: true,
  },
  {
    id: 'legado',
    name: 'O Legado',
    icon: Gem,
    price: 'R$ 69,90',
    priceDescription: '/mês',
    description: 'Para casais que querem ir além e eternizar cada momento.',
    features: [
      'Tudo do plano "A Jornada"',
      'Suporte Prioritário via WhatsApp',
      'Backup e Exportação de Todos os Dados',
      'Acesso a Funcionalidades Pós-Casamento',
      'Gerador de Identidade Visual (Em Breve)',
      'Concierge Digital para Convidados (Em Breve)',
    ],
    cta: 'Assinar O Legado',
    variant: 'outline' as const,
    recommended: false,
  },
];

const featureComparison = [
    { id: '1', feature: 'Painel Nupcial', description: 'Visão geral do seu casamento com resumos e contagem regressiva.', osonho: true, ajornada: true, olegado: true },
    { id: '2', feature: 'Planejador de Tarefas', description: 'Organize todas as suas pendências com categorias e checklists.', osonho: true, ajornada: true, olegado: true },
    { id: '3', feature: 'Lista de Convidados', description: 'Gerencie seus convidados, confirme presenças e organize as mesas.', osonho: 'Até 50 convidados', ajornada: true, olegado: true },
    { id: '4', feature: 'Controle Financeiro', description: 'Acompanhe seu orçamento, registre despesas e controle os gastos.', osonho: 'Básico', ajornada: true, olegado: true },
    { id: '5', feature: 'Trilha Sonora Colaborativa', description: 'Deixe seus convidados sugerirem e votarem nas músicas da festa.', osonho: true, ajornada: true, olegado: true },
    { id: '6', feature: 'Propósitos AI (Chat)', description: 'Converse com a IA para obter informações sobre seu planejamento em tempo real.', osonho: false, ajornada: true, olegado: true },
    { id: '7', feature: 'Assistente de Votos com IA', description: 'Receba ajuda da IA para escrever os votos de casamento mais emocionantes.', osonho: false, ajornada: true, olegado: true },
    { id: '8', feature: 'Devocional Diário com IA', description: 'Comece o dia com uma reflexão inspiradora para o casal, gerada por IA.', osonho: false, ajornada: true, olegado: true },
    { id: '9', feature: 'Linha do Tempo do Casal', description: 'Crie uma linda linha do tempo visual com os momentos mais importantes da sua história.', osonho: false, ajornada: true, olegado: true },
    { id: '10', feature: 'Cápsula do Tempo Emocional', description: 'Permita que amigos e familiares gravem mensagens para serem reveladas no dia do casamento.', osonho: false, ajornada: true, olegado: true },
    { id: '11', feature: 'Suporte Prioritário', description: 'Acesso direto à nossa equipe de suporte via WhatsApp para qualquer dúvida.', osonho: false, ajornada: false, olegado: true },
    { id: '12', feature: 'Backup e Exportação de Dados', description: 'Exporte todos os seus dados de planejamento para guardar como recordação.', osonho: false, ajornada: false, olegado: true },
];

const defaultSlides = [
    { id: 'sonho', src: 'https://i.ibb.co/tZ5B30F/couple-planning-2.png', alt: 'Casal iniciando o planejamento do casamento', dataAiHint: 'couple planning', titlePrefix: 'Tudo começa com um ', titleHighlight: 'sonho', titleSuffix: '.', description: 'A empolgação do noivado, as primeiras ideias, a alegria de saber que uma nova vida vai começar. "Propósitos" nasce para guardar essa faísca inicial e transformá-la em um plano real.' },
    { id: 'jornada', src: 'https://i.ibb.co/6g1pXyB/couple-walking-vineyard.png', alt: 'Casal caminhando juntos durante o planejamento do casamento', dataAiHint: 'couple walking', titlePrefix: 'Cada passo da ', titleHighlight: 'jornada', titleSuffix: ' é uma celebração.', description: 'Das tarefas mais simples às decisões mais importantes, nossa plataforma transforma o planejamento em uma experiência de conexão, organização e memórias inesquecíveis.' },
    { id: 'legado', src: 'https://i.ibb.co/xL0gqg2/wedding-celebration-2.png', alt: 'Casal celebrando no dia do casamento', dataAiHint: 'wedding celebration', titlePrefix: 'Construindo um ', titleHighlight: 'legado', titleSuffix: ' de amor.', description: 'O grande dia é o ápice, mas a história de vocês é eterna. Use a Cápsula do Tempo, a Linha do Tempo e todas as memórias para criar um legado que durará para sempre.' },
];


export default function PlansClient() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [slides, setSlides] = useState(defaultSlides);
    const [isLoadingCta, setIsLoadingCta] = useState<string | null>(null);

    useEffect(() => {
        const docRef = doc(db, 'configs', 'landingPage');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.slides && data.slides.length === 3) {
                    setSlides(data.slides);
                }
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching landing page config:", error);
            toast({ title: "Erro", description: "Não foi possível carregar as imagens da página.", variant: "destructive" });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [toast]);
    

    const handleCtaClick = (planName: string) => {
        setIsLoadingCta(planName);
        setTimeout(() => setIsLoadingCta(null), 1500);
    }
    
  return (
    <div className="w-full bg-background overflow-x-hidden relative">
        {/* Hero Section */}
        <section className="w-full">
             {isLoading ? (
                    <Skeleton className="w-full h-[80vh] min-h-[600px]" />
                ) : (
                    <Carousel
                        className="w-full"
                        plugins={[
                            Autoplay({
                              delay: 5000,
                              stopOnInteraction: true,
                            }),
                        ]}
                        opts={{
                            loop: true,
                        }}
                    >
                        <CarouselContent>
                             {slides.map(slide => (
                                <CarouselItem key={slide.id}>
                                    <div className="relative h-[80vh] min-h-[600px] w-full">
                                        <Image src={slide.src} alt={slide.alt} layout="fill" objectFit="cover" data-ai-hint={slide.dataAiHint}/>
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-center text-white p-4">
                                            <div className="relative z-10 flex flex-col items-center max-w-4xl">
                                                <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tight">
                                                    {slide.titlePrefix}<span className="text-primary">{slide.titleHighlight}</span>{slide.titleSuffix}
                                                </h1>
                                                <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-white/90">
                                                    {slide.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-20" />
                        <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-20" />
                    </Carousel>
             )}
        </section>


        {/* Feature Highlights */}
        <section className="py-16 sm:py-24 bg-card">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold font-headline text-foreground">Uma plataforma para cada momento da sua jornada</h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">De uma simples lista de tarefas a um assistente com Inteligência Artificial que eterniza suas memórias.</p>
                </div>
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                            <BrainCircuit className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold font-headline">Planejamento Inteligente</h3>
                        <p className="mt-2 text-muted-foreground">Deixe nossa IA ajudar com os votos, devocionais e responder dúvidas sobre seus próprios dados.</p>
                    </div>
                        <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                            <Users className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold font-headline">Experiência Colaborativa</h3>
                        <p className="mt-2 text-muted-foreground">Convide seu par, familiares e cerimonialistas para planejarem juntos em um ambiente único e organizado.</p>
                    </div>
                        <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                            <GalleryHorizontal className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold font-headline">Memórias que Duram</h3>
                        <p className="mt-2 text-muted-foreground">Crie uma linha do tempo do casal e receba mensagens surpresa na cápsula do tempo para o grande dia.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Pricing Section */}
        <section id="plans" className="py-16 sm:py-24">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                    <h2 className="text-4xl font-extrabold font-headline text-foreground">Escolha o plano que acompanha seu sonho</h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Comece gratuitamente e evolua conforme sua jornada avança.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {plans.map((plan) => (
                    <Card key={plan.id} className={cn('flex flex-col h-full shadow-lg transition-transform duration-300 hover:scale-105', plan.recommended && 'border-primary border-2 shadow-primary/20 scale-105')}>
                        {plan.recommended && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                            <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
                                <Star className="w-4 h-4"/>
                                Mais Popular
                            </div>
                        </div>
                        )}
                        <CardHeader className="pt-10">
                        <CardTitle className="font-headline text-3xl flex items-center gap-3">
                            <plan.icon className={cn("w-8 h-8", plan.recommended ? "text-primary" : "text-muted-foreground")} />
                            {plan.name}
                        </CardTitle>
                        <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold">{plan.price}</span>
                                <span className="text-muted-foreground">{plan.priceDescription}</span>
                        </div>
                        <CardDescription className="text-base pt-1 min-h-[40px]">{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                        <ul className="space-y-3 text-sm text-foreground">
                            {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                <span>{feature}</span>
                            </li>
                            ))}
                        </ul>
                        </CardContent>
                        <CardFooter>
                        <Button size="lg" className="w-full" variant={plan.variant} onClick={() => handleCtaClick(plan.name)} disabled={!!isLoadingCta}>
                            {isLoadingCta === plan.name ? 'Processando...' : plan.cta}
                        </Button>
                        </CardFooter>
                    </Card>
                    ))}
                </div>
            </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-16 sm:py-24 bg-card">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                        <h2 className="text-4xl font-extrabold font-headline text-foreground">Compare os detalhes</h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Todas as funcionalidades, lado a lado.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left font-headline text-xl p-4">Funcionalidade</th>
                                {plans.map(p => <th key={p.id} className="text-center font-headline text-xl p-4 w-1/5">{p.name}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {featureComparison.map(item => (
                                <tr key={item.id} className="border-b last:border-b-0">
                                    <td className="p-4">
                                        <p className="font-semibold">{item.feature}</p>
                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                    </td>
                                    <td className="p-4 text-center">
                                        {item.osonho === true ? <CheckCircle2 className="mx-auto text-green-500"/> : item.osonho ? <span className="text-sm font-semibold">{item.osonho}</span> : <span className="text-muted-foreground">-</span>}
                                    </td>
                                    <td className="p-4 text-center">
                                        {item.ajornada === true ? <CheckCircle2 className="mx-auto text-green-500"/> : item.ajornada ? <span className="text-sm font-semibold">{item.ajornada}</span> : <span className="text-muted-foreground">-</span>}
                                    </td>
                                    <td className="p-4 text-center">
                                        {item.olegado === true ? <CheckCircle2 className="mx-auto text-green-500"/> : item.olegado ? <span className="text-sm font-semibold">{item.olegado}</span> : <span className="text-muted-foreground">-</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-24">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                        <h2 className="text-4xl font-extrabold font-headline text-foreground">Dúvidas Frequentes</h2>
                        <p className="mt-4 text-lg text-muted-foreground">Respostas para as perguntas mais comuns.</p>
                </div>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="font-semibold text-lg">Posso mudar de plano depois?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-base">
                            Sim! Você pode fazer o upgrade (ou downgrade) do seu plano a qualquer momento diretamente pelo painel. Todo o seu progresso e dados serão mantidos.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger className="font-semibold text-lg">O que acontece com meus dados após o casamento?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-base">
                           Seus dados ficam guardados com segurança. Com os planos "A Jornada" e "O Legado", você pode continuar acessando suas memórias, como a Linha do Tempo e a Cápsula do Tempo, mesmo após o grande dia. Queremos que "Propósitos" se torne um baú de recordações.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger className="font-semibold text-lg">Como funciona a cobrança?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-base">
                           A cobrança é feita mensalmente de forma recorrente no seu cartão de crédito. Você pode cancelar a qualquer momento, sem taxas ou burocracia.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                </div>
        </section>
    </div>
  );
}
