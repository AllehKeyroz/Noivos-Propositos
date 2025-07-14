'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Prompt } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const promptFormSchema = z.object({
  content: z.string().min(50, { message: 'O prompt deve ter pelo menos 50 caracteres.' }),
});

const DEFAULT_COUPLE_PROMPT = `Você é "Propósitos AI", um assistente de casamento prestativo e amigável.
Sua função é ajudar o usuário a planejar seu casamento, respondendo a perguntas com base nos dados fornecidos abaixo.
Se a informação não estiver nos dados, diga que não encontrou a informação.
Se o usuário perguntar sobre planos de assinatura, preços ou funcionalidades, use a ferramenta "getPlansInfo" para obter as informações mais recentes e ajudá-lo a escolher.
Seja conciso, mas informativo. Responda sempre em Português do Brasil.
**IMPORTANTE: Não use NENHUMA formatação markdown (como *, **, #, etc.). Use quebras de linha para formatar sua resposta de forma clara e legível.**`;

const DEFAULT_GUEST_PROMPT = `Você é "Propósitos AI", a anfitriã digital e assistente para os convidados do casamento de {{weddingData.weddingDetails.brideName}} e {{weddingData.weddingDetails.groomName}}.
Sua função é ser extremamente calorosa, amigável e prestativa. Cumprimente o convidado pelo nome ({{weddingData.userProfile.name}}). Diga a ele que o casal está muito feliz por ele estar aqui e que ele é muito importante.
Seja proativa em ajudar. Pergunte se ele quer ajuda com a lista de presentes ("Mural do Carinho"), como sugerir músicas para a "Trilha Sonora do Amor" ou qualquer outra dúvida sobre as funcionalidades disponíveis para ele.
Se o usuário perguntar sobre planos de assinatura, preços ou funcionalidades, use a ferramenta "getPlansInfo" para obter as informações mais recentes e ajudá-lo a escolher.
Se a pergunta for sobre algo que não está nos seus dados (como o planejamento do casal), explique gentilmente que essa informação é privada do casal, mas que você pode ajudar com as áreas de convidado.
Responda sempre em Português do Brasil.
**IMPORTANTE: Não use NENHUMA formatação markdown (como *, **, #, etc.). Use quebras de linha para formatar sua resposta de forma clara e legível.**`;


export default function PromptsClient() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  const form = useForm<z.infer<typeof promptFormSchema>>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: { content: '' },
  });

  useEffect(() => {
    setIsLoading(true);
    const promptsQuery = query(collection(db, 'prompts'));

    const unsubscribe = onSnapshot(promptsQuery, async (snapshot) => {
      let promptsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Prompt[];
      
      // Self-healing: if prompts don't exist, create them
      const hasCouplePrompt = promptsData.some(p => p.id === 'couple_system_prompt');
      const hasGuestPrompt = promptsData.some(p => p.id === 'guest_system_prompt');

      if (!snapshot.metadata.hasPendingWrites) {
        if (!hasCouplePrompt) {
            await setDoc(doc(db, 'prompts', 'couple_system_prompt'), { 
                name: 'Prompt para Noivos e Colaboradores', 
                content: DEFAULT_COUPLE_PROMPT 
            });
        }
        if (!hasGuestPrompt) {
            await setDoc(doc(db, 'prompts', 'guest_system_prompt'), { 
                name: 'Prompt para Convidados', 
                content: DEFAULT_GUEST_PROMPT
            });
        }
      }

      // Sort to keep a consistent order
      promptsData.sort((a, b) => a.name.localeCompare(b.name));
      setPrompts(promptsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching prompts:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os prompts.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  useEffect(() => {
    if (editingPrompt) {
        form.reset({ content: editingPrompt.content });
    }
  }, [editingPrompt, form]);

  const handleEditFormSubmit = async (values: z.infer<typeof promptFormSchema>) => {
    if (!editingPrompt) return;
    
    try {
        await updateDoc(doc(db, 'prompts', editingPrompt.id), { 
            content: values.content
        });
        toast({ title: 'Sucesso', description: 'Prompt atualizado.' });
        setIsEditFormOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o prompt.', variant: 'destructive' });
    }
  };

  const openEditDialog = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setIsEditFormOpen(true);
  };
  
  if (isLoading) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {prompts.map(prompt => (
            <Card key={prompt.id}>
                <CardHeader>
                    <CardTitle>{prompt.name}</CardTitle>
                    <CardDescription>
                        Este é o texto que a IA usa como instrução base para conversar com este tipo de usuário.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground bg-secondary/30 p-4 rounded-md whitespace-pre-wrap line-clamp-4">
                        {prompt.content}
                    </p>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => openEditDialog(prompt)}>
                        <Edit className="mr-2" />
                        Editar Prompt
                    </Button>
                </CardFooter>
            </Card>
        ))}
      </div>
      
      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Editar Prompt: {editingPrompt?.name}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleEditFormSubmit)} className="space-y-4 pt-4">
                    <FormField control={form.control} name="content" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Conteúdo do Prompt</FormLabel>
                            <FormControl>
                                <Textarea rows={15} placeholder="Digite as instruções para a IA aqui..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                     )} />
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
