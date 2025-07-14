'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWedding } from '@/context/wedding-context';
import { useToast } from '@/hooks/use-toast';
import { generateDevotional } from '@/ai/flows/devotional-flow';
import { generateCustomDevotional } from '@/ai/flows/custom-devotional-flow';
import type { Devotional } from '@/lib/types';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Wand2, Loader2, BookOpen, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DevotionalCard = ({ devotional, onOpen }: { devotional: Devotional; onOpen: (d: Devotional) => void }) => (
  <Card
    className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
    onClick={() => onOpen(devotional)}
  >
    <CardContent className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {devotional.isFavorite && <Star className="h-5 w-5 text-amber-400 fill-amber-400 shrink-0" />}
        <div>
          <p className="font-semibold text-lg">{devotional.title}</p>
          <p className="text-sm text-muted-foreground">{format(devotional.date.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
        </div>
      </div>
      {devotional.completed ? (
        <div className="flex items-center gap-2 text-green-600 font-semibold text-sm bg-green-100 px-3 py-1 rounded-full">
          <CheckCircle className="h-4 w-4" />
          <span>Concluído</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm bg-amber-100 px-3 py-1 rounded-full">
          <BookOpen className="h-4 w-4" />
          <span>Pendente</span>
        </div>
      )}
    </CardContent>
  </Card>
);

const EmptyState = ({ isFavoritesTab = false }) => (
    <Card className="text-center py-12 border-dashed">
        <CardContent>
            {isFavoritesTab ? (
                <>
                    <h3 className="text-lg font-semibold">Nenhum devocional favorito.</h3>
                    <p className="text-muted-foreground mt-1">Clique na estrela para marcar seus devocionais preferidos.</p>
                </>
            ) : (
                <>
                    <h3 className="text-lg font-semibold">Nenhum devocional encontrado.</h3>
                    <p className="text-muted-foreground mt-1">Gere um devocional diário ou um sobre um tema específico.</p>
                </>
            )}
        </CardContent>
    </Card>
);


export default function DevotionalClient() {
  const { toast } = useToast();
  const { activeWeddingId, loading, devotionals } = useWedding();
  
  const [selectedDevotional, setSelectedDevotional] = useState<Devotional | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const favoriteDevotionals = useMemo(() => {
    return devotionals.filter(d => d.isFavorite);
  }, [devotionals]);

  useEffect(() => {
    if (loading || !activeWeddingId) {
        return;
    }

    const hasTodaysDevotional = devotionals.some(d => d.isDaily && isToday(d.date.toDate()));
    
    if (!hasTodaysDevotional) {
        const generateDaily = async () => {
            try {
                const newDevotionalContent = await generateDevotional();
                await addDoc(collection(db, 'weddings', activeWeddingId, 'devotionals'), {
                    ...newDevotionalContent,
                    date: Timestamp.now(),
                    completed: false,
                    isFavorite: false,
                    isDaily: true,
                });
            } catch (error) {
                console.error("Error creating daily devotional:", error);
                // Fail silently to avoid bothering user for a background task
            }
        };
        generateDaily();
    }
  }, [activeWeddingId, devotionals, loading, toast]);

  const handleMarkAsCompleted = async () => {
    if (!activeWeddingId || !selectedDevotional) return;
    
    const devotionalRef = doc(db, 'weddings', activeWeddingId, 'devotionals', selectedDevotional.id);
    try {
        await updateDoc(devotionalRef, { completed: !selectedDevotional.completed });
        toast({ title: "Devocional atualizado!", });
        setIsViewDialogOpen(false);
    } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível marcar como concluído.', variant: 'destructive' });
    }
  };

  const handleGenerateOnTopic = async () => {
    if (!topic.trim()) {
        toast({ title: "Tópico em branco", description: "Por favor, insira um tema para o devocional."});
        return;
    }
    if (!activeWeddingId) return;

    setIsGenerating(true);
    try {
        const result = await generateCustomDevotional({ topic });
        
        const devotionalsRef = collection(db, 'weddings', activeWeddingId, 'devotionals');
        const devotionalToSave: Omit<Devotional, 'id'> = {
            ...result,
            date: Timestamp.now(),
            completed: false,
            isFavorite: false,
            isDaily: false, // Mark as custom
        };
        const docRef = await addDoc(devotionalsRef, devotionalToSave);
        const newDevotional: Devotional = { id: docRef.id, ...devotionalToSave };

        handleOpenDevotional(newDevotional);
        toast({ title: "Devocional personalizado gerado!", description: "Sua reflexão está pronta e foi salva no seu histórico." });
    } catch(error) {
        toast({ title: 'Erro de IA', description: 'Não foi possível gerar o devocional.', variant: 'destructive' });
    } finally {
        setIsGenerating(false);
        setTopic('');
    }
  }

  const handleToggleFavorite = async (devotional: Devotional) => {
    if (!activeWeddingId) return;
    const devotionalRef = doc(db, 'weddings', activeWeddingId, 'devotionals', devotional.id);
    try {
      const newFavState = !devotional.isFavorite;
      await updateDoc(devotionalRef, { isFavorite: newFavState });
      
      if (selectedDevotional?.id === devotional.id) {
          setSelectedDevotional(prev => prev ? { ...prev, isFavorite: newFavState } : null);
      }
      
      toast({ title: newFavState ? "Adicionado aos favoritos!" : "Removido dos favoritos." });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o devocional.', variant: 'destructive' });
    }
  };

  const handleDeleteDevotional = async (id: string) => {
    if (!activeWeddingId) return;
    try {
      await deleteDoc(doc(db, 'weddings', activeWeddingId, 'devotionals', id));
      toast({ title: 'Sucesso', description: 'Devocional removido.' });
      setIsViewDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover o devocional.', variant: 'destructive' });
    }
  };

  const handleOpenDevotional = (devotional: Devotional) => {
    setSelectedDevotional(devotional);
    setIsViewDialogOpen(true);
  };
  
  if (loading) {
    return <DevotionalSkeleton />;
  }
  
  if (!activeWeddingId) {
    return <div className="text-center p-8 bg-card rounded-lg">Por favor, selecione um casamento para ver os devocionais.</div>;
  }

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Wand2 className="text-primary"/> Precisa de orientação sobre algo específico?</CardTitle>
                <CardDescription>Peça um devocional sobre qualquer tema que esteja em seu coração.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex gap-2">
                    <Input 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ex: Filhos, Finanças, Paciência..."
                        disabled={isGenerating}
                    />
                    <Button onClick={handleGenerateOnTopic} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="animate-spin" /> : 'Gerar Devocional'}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Tabs defaultValue="all" className="w-full">
            <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="favorites">Favoritos</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
                 {devotionals.length > 0 ? (
                    <div className="space-y-3">
                        {devotionals.map(dev => (
                           <DevotionalCard key={dev.id} devotional={dev} onOpen={handleOpenDevotional} />
                        ))}
                    </div>
                 ) : (
                    <EmptyState />
                 )}
            </TabsContent>
            <TabsContent value="favorites" className="mt-4">
                 {favoriteDevotionals.length > 0 ? (
                    <div className="space-y-3">
                        {favoriteDevotionals.map(dev => (
                           <DevotionalCard key={dev.id} devotional={dev} onOpen={handleOpenDevotional} />
                        ))}
                    </div>
                 ) : (
                    <EmptyState isFavoritesTab={true} />
                 )}
            </TabsContent>
        </Tabs>
        
        {/* View Devotional Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-2xl">
                {selectedDevotional && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="font-headline text-3xl text-primary flex items-center gap-3">
                                {selectedDevotional.title}
                            </DialogTitle>
                            <CardDescription className="text-base pt-1">
                                {format(selectedDevotional.date.toDate(), "eeee, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </CardDescription>
                        </DialogHeader>
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
                            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                                "{selectedDevotional.verse}"
                            </blockquote>
                            <div className="space-y-4 whitespace-pre-wrap text-base leading-relaxed">
                                {selectedDevotional.reflection}
                            </div>
                            <div>
                                <h4 className="font-semibold text-lg mb-2 text-primary">Oração</h4>
                                <p className="text-muted-foreground italic">
                                    {selectedDevotional.prayer}
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="!mt-6 sm:justify-between">
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleToggleFavorite(selectedDevotional)}>
                                    <Star className={cn("h-5 w-5", selectedDevotional.isFavorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir devocional?</AlertDialogTitle>
                                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteDevotional(selectedDevotional.id)}>Excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                                <DialogClose asChild><Button variant="ghost">Fechar</Button></DialogClose>
                                <Button onClick={handleMarkAsCompleted}>
                                    <CheckCircle className="mr-2"/>{selectedDevotional.completed ? 'Marcar como Pendente' : 'Marcar como Concluído'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}

const DevotionalSkeleton = () => (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </CardContent>
        </Card>
        <div className="space-y-3">
             <Skeleton className="h-20 w-full" />
             <Skeleton className="h-20 w-full" />
             <Skeleton className="h-20 w-full" />
        </div>
    </div>
);