'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWedding } from '@/context/wedding-context';
import { useToast } from '@/hooks/use-toast';
import { generateVow } from '@/ai/flows/generate-vow-flow';
import type { WeddingVow } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, PlusCircle, Edit, Trash2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const vowFormSchema = z.object({
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  text: z.string().min(10, { message: 'Os votos devem ter pelo menos 10 caracteres.' }),
});

const aiFormSchema = z.object({
    toWhom: z.string().min(2, { message: "Diga para quem são os votos." }),
    theme: z.enum(['romantico', 'engracado', 'tradicional', 'moderno']),
    tone: z.enum(['emocionante', 'leve', 'poetico', 'sincero']),
    personalDetails: z.string().min(10, { message: "Conte um pouco da sua história."}),
});

export default function VowsClient() {
  const { toast } = useToast();
  const { activeWeddingId, loading, vows } = useWedding();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVow, setEditingVow] = useState<WeddingVow | null>(null);

  const handleDeleteVow = async (vowId: string) => {
    if (!activeWeddingId) return;
    try {
      await deleteDoc(doc(db, 'weddings', activeWeddingId, 'vows', vowId));
      toast({ title: 'Sucesso', description: 'Voto removido.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover o voto.', variant: 'destructive' });
    }
  };

  const openDialog = (vow: WeddingVow | null) => {
    setEditingVow(vow);
    setIsDialogOpen(true);
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!activeWeddingId) {
    return <div className="text-center p-8 bg-card rounded-lg">Por favor, selecione um casamento para gerenciar os votos.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => openDialog(null)}>
          <PlusCircle className="mr-2" />
          Adicionar Voto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vows.length > 0 ? vows.map((vow) => (
          <Card key={vow.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="font-headline text-xl">{vow.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-muted-foreground line-clamp-4">{vow.text}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              {vow.generatedWithAI && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Wand2 className="h-4 w-4 mr-1" />
                  <span>Gerado com IA</span>
                </div>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <Button variant="ghost" size="icon" onClick={() => openDialog(vow)}>
                  <Edit className="h-4 w-4" />
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação removerá seus votos permanentemente.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteVow(vow.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardFooter>
          </Card>
        )) : (
            <div className="col-span-full">
                <Card className="text-center py-12 border-dashed">
                    <CardContent>
                        <h3 className="text-lg font-semibold">Nenhum voto salvo.</h3>
                        <p className="text-muted-foreground mt-1">Clique em "Adicionar Voto" para começar a escrever suas promessas.</p>
                    </CardContent>
                </Card>
            </div>
        )}
      </div>

      <VowFormDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        editingVow={editingVow}
        activeWeddingId={activeWeddingId}
      />
    </div>
  );
}


interface VowFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingVow: WeddingVow | null;
  activeWeddingId: string | null;
}

function VowFormDialog({ isOpen, setIsOpen, editingVow, activeWeddingId }: VowFormDialogProps) {
  const { toast } = useToast();
  const [useAI, setUseAI] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const form = useForm<z.infer<typeof vowFormSchema>>({
    resolver: zodResolver(vowFormSchema),
    defaultValues: { title: '', text: '' },
  });

  const aiForm = useForm<z.infer<typeof aiFormSchema>>({
    resolver: zodResolver(aiFormSchema),
    defaultValues: {
        toWhom: '',
        theme: 'romantico',
        tone: 'emocionante',
        personalDetails: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (editingVow) {
            form.reset({ title: editingVow.title, text: editingVow.text });
            setUseAI(editingVow.generatedWithAI);
        } else {
            form.reset({ title: '', text: '' });
            aiForm.reset();
            setUseAI(false);
        }
    }
  }, [isOpen, editingVow, form, aiForm]);

  const handleGenerateVow = async (values: z.infer<typeof aiFormSchema>) => {
    setIsGenerating(true);
    try {
      const result = await generateVow(values);
      form.setValue('text', result.vowText);
      form.setValue('title', `Votos para ${values.toWhom}`);
      toast({ title: "Sugestão gerada!", description: "A IA criou um rascunho para você. Ajuste como desejar."});
    } catch (error) {
      console.error("Erro detalhado do backend:", error);
      toast({ title: 'Erro de IA', description: 'Não foi possível gerar os votos. Verifique o console para detalhes.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveVow = async (values: z.infer<typeof vowFormSchema>) => {
    if (!activeWeddingId) return;
    try {
        const dataToSave = { ...values, generatedWithAI: useAI, createdAt: serverTimestamp() };
        if (editingVow) {
            await updateDoc(doc(db, 'weddings', activeWeddingId, 'vows', editingVow.id), dataToSave);
            toast({ title: 'Sucesso', description: 'Voto atualizado.' });
        } else {
            await addDoc(collection(db, 'weddings', activeWeddingId, 'vows'), dataToSave);
            toast({ title: 'Sucesso', description: 'Voto salvo.' });
        }
        setIsOpen(false);
    } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível salvar o voto.', variant: 'destructive' });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingVow ? 'Editar Voto' : 'Novo Voto de Casamento'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveVow)} className="space-y-6">
                 <div className="flex items-center space-x-2">
                    <Wand2 className={cn("transition-colors", useAI ? "text-primary" : "text-muted-foreground")} />
                    <Label htmlFor="ai-switch">Usar assistente de IA?</Label>
                    <Switch
                        id="ai-switch"
                        checked={useAI}
                        onCheckedChange={setUseAI}
                        disabled={!!editingVow}
                    />
                </div>

                {useAI && !editingVow && (
                     <Card className="bg-muted/50 p-4">
                        <Form {...aiForm}>
                             <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <FormField control={aiForm.control} name="toWhom" render={({ field }) => (
                                        <FormItem><FormLabel>Para quem?</FormLabel><FormControl><Input placeholder="Nome" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={aiForm.control} name="theme" render={({ field }) => (
                                        <FormItem><FormLabel>Tema</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="romantico">Romântico</SelectItem><SelectItem value="engracado">Engraçado</SelectItem><SelectItem value="tradicional">Tradicional</SelectItem><SelectItem value="moderno">Moderno</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                     <FormField control={aiForm.control} name="tone" render={({ field }) => (
                                        <FormItem><FormLabel>Tom</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="emocionante">Emocionante</SelectItem><SelectItem value="leve">Leve</SelectItem><SelectItem value="poetico">Poético</SelectItem><SelectItem value="sincero">Sincero</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                </div>
                                 <FormField control={aiForm.control} name="personalDetails" render={({ field }) => (
                                    <FormItem><FormLabel>Conte-nos um pouco...</FormLabel><FormControl><Textarea placeholder="Descreva memórias, piadas internas, sentimentos e promessas que a IA deve usar." {...field} rows={4} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <Button type="button" disabled={isGenerating} onClick={aiForm.handleSubmit(handleGenerateVow)}>
                                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Gerar Rascunho
                                 </Button>
                             </div>
                         </Form>
                     </Card>
                )}
                
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ex: Meus votos para..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="text" render={({ field }) => (
                    <FormItem><FormLabel>Texto dos Votos</FormLabel><FormControl><Textarea placeholder="Escreva seus votos aqui..." {...field} rows={10} /></FormControl><FormMessage /></FormItem>
                )} />

                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                    <Button type="submit">Salvar Votos</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}