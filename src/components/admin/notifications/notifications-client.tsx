'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription as DialogDesc } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const internalPages = [
  { label: "Painel Nupcial", value: "/dashboard" },
  { label: "Planejador de Tarefas", value: "/dashboard/planner" },
  { label: "Lista de Convidados", value: "/dashboard/guests" },
  { label: "Controle Financeiro", value: "/dashboard/budget" },
  { label: "Enxoval do Lar", value: "/dashboard/home-trousseau" },
  { label: "Mural do Carinho (Presentes)", value: "/dashboard/gifts" },
  { label: "Agenda (Tempo de Amar)", value: "/dashboard/appointments" },
  { label: "Votos de Casamento", value: "/dashboard/vows" },
  { label: "Trilha Sonora do Amor", value: "/dashboard/soundtrack" },
  { label: "Devocional do Casal", value: "/dashboard/devotional" },
  { label: "Linha do Tempo", value: "/dashboard/timeline" },
  { label: "Cápsula do Tempo", value: "/dashboard/capsule" },
  { label: "Equipe e Convidados", value: "/dashboard/team" },
  { label: "URL Customizada...", value: "custom" },
];


const notificationFormSchema = z.object({
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  target: z.enum(['all', 'couples']),
  buttonLabel: z.string().optional(),
  buttonUrl: z.string().optional(),
}).refine(data => {
    if (data.buttonLabel) {
        return !!data.buttonUrl && data.buttonUrl.trim() !== '';
    }
    return true;
}, {
  message: "O link do botão é obrigatório quando o texto do botão é preenchido.",
  path: ["buttonUrl"],
});

export default function NotificationsClient() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const form = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: { title: '', description: '', target: 'all', buttonLabel: '', buttonUrl: '' },
  });
  
  const buttonUrlValue = form.watch('buttonUrl');

  useEffect(() => {
    setIsLoading(true);
    const notificationsQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Notification[];
      setNotifications(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as notificações.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleFormSubmit = async (values: z.infer<typeof notificationFormSchema>) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...values,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Sucesso', description: 'Notificação criada e disponível para os usuários.' });
      setIsFormOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar a notificação.', variant: 'destructive' });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      toast({ title: 'Sucesso', description: 'Notificação removida do sistema.' });
    } catch (error) {
       toast({ title: 'Erro', description: 'Não foi possível remover a notificação.', variant: 'destructive' });
       console.error("Error deleting notification:", error);
    }
  };
  
  if (isLoading) {
    return <Skeleton className="w-full h-64" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2" />
            Nova Notificação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notificações Globais</CardTitle>
          <CardDescription>Histórico de todas as notificações enviadas para os usuários.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Público</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {notifications.length > 0 ? notifications.map(notification => (
                      <TableRow key={notification.id}>
                          <TableCell className="font-medium">{notification.title}</TableCell>
                          <TableCell>{notification.target === 'couples' ? 'Apenas Noivos' : 'Todos'}</TableCell>
                          <TableCell>{notification.createdAt ? format(notification.createdAt.toDate(), 'P p', { locale: ptBR }) : '...'}</TableCell>
                          <TableCell className="text-right">
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Esta ação removerá permanentemente esta notificação para TODOS os usuários.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteNotification(notification.id)}>Remover para todos</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </TableCell>
                      </TableRow>
                  )) : (
                      <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                              Nenhuma notificação criada.
                          </TableCell>
                      </TableRow>
                  )}
              </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) form.reset(); setIsFormOpen(isOpen); }}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>Criar Nova Notificação Global</DialogTitle>
                <DialogDesc>Esta notificação aparecerá para os usuários selecionados.</DialogDesc>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ex: Nova funcionalidade!" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descreva a notificação aqui." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="target" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Enviar Para</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                           <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                           <SelectContent>
                              <SelectItem value="all">Todos os Usuários</SelectItem>
                              <SelectItem value="couples">Apenas Noivos e Noivas</SelectItem>
                           </SelectContent>
                        </Select>
                        <FormMessage/>
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="buttonLabel" render={({ field }) => (
                          <FormItem><FormLabel>Texto do Botão (Opcional)</FormLabel><FormControl><Input placeholder="Ex: Ver agora" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="buttonUrl" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Link do Botão</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value === 'custom' ? '' : value)} value={internalPages.some(p => p.value === field.value) ? field.value : 'custom'}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecione um destino" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {internalPages.map(page => <SelectItem key={page.value} value={page.value}>{page.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                      )} />
                    </div>
                    {buttonUrlValue === '' && (
                       <FormField control={form.control} name="buttonUrl" render={({ field }) => (
                          <FormItem>
                            <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                      )} />
                    )}

                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                          Criar Notificação
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
