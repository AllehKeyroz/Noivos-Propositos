'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NotificationCampaign } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription as DialogDesc } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Trash2, Edit, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

const campaignFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome da automação é obrigatório.' }),
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  triggerType: z.enum(['relativeToSignup', 'relativeToWeddingDate']),
  offsetDays: z.coerce.number(),
  buttonLabel: z.string().optional(),
  buttonUrl: z.string().optional(),
  isActive: z.boolean(),
});

export default function AutomationsClient() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<NotificationCampaign | null>(null);

  const form = useForm<z.infer<typeof campaignFormSchema>>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      title: '',
      description: '',
      triggerType: 'relativeToSignup',
      offsetDays: 1,
      buttonLabel: '',
      buttonUrl: '',
      isActive: true,
    },
  });

  useEffect(() => {
    setIsLoading(true);
    const campaignsQuery = query(collection(db, 'notificationCampaigns'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(campaignsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as NotificationCampaign[];
      setCampaigns(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching campaigns:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as automações.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  useEffect(() => {
    if (editingCampaign) {
      form.reset(editingCampaign);
    } else {
      form.reset({
        name: '', title: '', description: '', triggerType: 'relativeToSignup',
        offsetDays: 1, buttonLabel: '', buttonUrl: '', isActive: true,
      });
    }
  }, [editingCampaign, form, isFormOpen]);

  const handleFormSubmit = async (values: z.infer<typeof campaignFormSchema>) => {
    try {
      if (editingCampaign) {
        await updateDoc(doc(db, 'notificationCampaigns', editingCampaign.id), values);
        toast({ title: 'Sucesso', description: 'Automação atualizada.' });
      } else {
        await addDoc(collection(db, 'notificationCampaigns'), {
          ...values,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Sucesso', description: 'Automação criada e ativa.' });
      }
      setIsFormOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar a automação.', variant: 'destructive' });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await deleteDoc(doc(db, 'notificationCampaigns', campaignId));
      toast({ title: 'Sucesso', description: 'Automação removida.' });
    } catch (error) {
       toast({ title: 'Erro', description: 'Não foi possível remover a automação.', variant: 'destructive' });
    }
  };

  const openDialog = (campaign: NotificationCampaign | null) => {
    setEditingCampaign(campaign);
    setIsFormOpen(true);
  };
  
  if (isLoading) {
    return <Skeleton className="w-full h-64" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => openDialog(null)}>
            <PlusCircle className="mr-2" />
            Nova Automação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automações de Notificação</CardTitle>
          <CardDescription>Regras que disparam notificações automaticamente para os usuários.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Nome / Título</TableHead>
                    <TableHead>Gatilho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {campaigns.length > 0 ? campaigns.map(c => (
                      <TableRow key={c.id}>
                          <TableCell>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-sm text-muted-foreground">{c.title}</div>
                          </TableCell>
                          <TableCell>
                            {c.triggerType === 'relativeToSignup' ? 
                                `${c.offsetDays} dia(s) após cadastro` : 
                                `${Math.abs(c.offsetDays)} dia(s) ${c.offsetDays >= 0 ? 'após' : 'antes'} do casamento`
                            }
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${c.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {c.isActive ? 'Ativa' : 'Inativa'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openDialog(c)}><Edit className="h-4 w-4" /></Button>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                          <AlertDialogDescription>Esta ação removerá permanentemente esta automação.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteCampaign(c.id)}>Remover</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </TableCell>
                      </TableRow>
                  )) : (
                      <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                              Nenhuma automação criada.
                          </TableCell>
                      </TableRow>
                  )}
              </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{editingCampaign ? 'Editar Automação' : 'Nova Automação'}</DialogTitle>
                <DialogDesc>Crie uma regra para enviar uma notificação de forma automática.</DialogDesc>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome da Automação (para controle interno)</FormLabel><FormControl><Input placeholder="Ex: Lembrete de Tarefas Semana 1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Título da Notificação</FormLabel><FormControl><Input placeholder="Ex: Nova funcionalidade!" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descreva a notificação aqui." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="triggerType" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gatilho (Quando enviar?)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                               <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                               <SelectContent>
                                  <SelectItem value="relativeToSignup">Relativo à data de cadastro</SelectItem>
                                  <SelectItem value="relativeToWeddingDate">Relativo à data do casamento</SelectItem>
                               </SelectContent>
                            </Select>
                            <FormMessage/>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="offsetDays" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dias (Antes/Depois)</FormLabel>
                                <FormControl><Input type="number" placeholder="Ex: -15 ou 7" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="buttonLabel" render={({ field }) => (
                          <FormItem><FormLabel>Texto do Botão (Opcional)</FormLabel><FormControl><Input placeholder="Ex: Ver agora" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="buttonUrl" render={({ field }) => (
                          <FormItem><FormLabel>Link do Botão (Opcional)</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                     <FormField control={form.control} name="isActive" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5"><FormLabel>Automação Ativa?</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )} />
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                          Salvar Automação
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
