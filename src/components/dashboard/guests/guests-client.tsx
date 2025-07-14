'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { triggerWebhook } from '@/app/actions/webhook-actions';
import type { Guest, GuestGroup, GuestStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UserPlus, Edit, Trash2, Users, Table as TableIcon } from 'lucide-react';


const guestGroupDisplay: Record<GuestGroup, string> = {
  familia_noiva: 'Família da Noiva',
  familia_noivo: 'Família do Noivo',
  amigos_casal: 'Amigos do Casal',
  colegas_trabalho: 'Colegas de Trabalho',
  prestador_servico: 'Fornecedores',
};

const guestStatusDisplay: Record<GuestStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  recusado: 'Recusado',
};

const guestStatusColors: Record<GuestStatus, string> = {
  pendente: 'bg-amber-500/80 border-amber-500',
  confirmado: 'bg-green-500/80 border-green-500',
  recusado: 'bg-red-500/80 border-red-500',
};

const guestFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  group: z.enum(['familia_noiva', 'familia_noivo', 'amigos_casal', 'colegas_trabalho', 'prestador_servico']),
  status: z.enum(['pendente', 'confirmado', 'recusado']),
  tableNumber: z.coerce.number().min(0, { message: 'O número da mesa deve ser positivo.' }),
});


export default function GuestsClient() {
  const { toast } = useToast();
  const { activeWeddingId, loading, guests } = useWedding();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  const form = useForm<z.infer<typeof guestFormSchema>>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: { name: '', group: 'amigos_casal', status: 'pendente', tableNumber: 0 },
  });
  
  useEffect(() => {
    if (editingGuest) {
      form.reset({
        name: editingGuest.name,
        group: editingGuest.group,
        status: editingGuest.status,
        tableNumber: editingGuest.tableNumber,
      });
    } else {
      form.reset({ name: '', group: 'amigos_casal', status: 'pendente', tableNumber: 0 });
    }
  }, [editingGuest, form, isFormOpen]);

  const handleFormSubmit = async (values: z.infer<typeof guestFormSchema>) => {
    if (!activeWeddingId) return;
    
    const data = { ...values, tableNumber: Number(values.tableNumber) };

    try {
      if (editingGuest) {
        const guestDocRef = doc(db, 'weddings', activeWeddingId, 'guests', editingGuest.id);
        await updateDoc(guestDocRef, data);
        toast({ title: 'Sucesso', description: 'Convidado atualizado.' });
        if(editingGuest.status !== data.status) {
            triggerWebhook(activeWeddingId, 'guestRsvp', { guestName: data.name, status: data.status, oldStatus: editingGuest.status });
        }
      } else {
        await addDoc(collection(db, 'weddings', activeWeddingId, 'guests'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Sucesso', description: 'Convidado adicionado.' });
         if(data.status !== 'pendente') {
            triggerWebhook(activeWeddingId, 'guestRsvp', { guestName: data.name, status: data.status, oldStatus: 'pendente' });
        }
      }
      setIsFormOpen(false);
      setEditingGuest(null);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar o convidado.', variant: 'destructive' });
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!activeWeddingId) return;
    try {
      await deleteDoc(doc(db, 'weddings', activeWeddingId, 'guests', guestId));
      toast({ title: 'Sucesso', description: 'Convidado removido.' });
    } catch (error) {
       toast({ title: 'Erro', description: 'Não foi possível remover o convidado.', variant: 'destructive' });
    }
  };

  const openEditDialog = (guest: Guest) => {
    setEditingGuest(guest);
    setIsFormOpen(true);
  };

  const openAddDialog = () => {
    setEditingGuest(null);
    setIsFormOpen(true);
  };
  
  const tables = useMemo(() => {
    const grouped: { [key: number]: Guest[] } = {};
    guests
      .filter(g => g.status === 'confirmado' && g.tableNumber > 0)
      .forEach(guest => {
        if (!grouped[guest.tableNumber]) {
          grouped[guest.tableNumber] = [];
        }
        grouped[guest.tableNumber].push(guest);
        grouped[guest.tableNumber].sort((a,b) => a.name.localeCompare(b.name));
      });
    return Object.entries(grouped).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [guests]);
  
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!activeWeddingId) {
    return <div className="text-center p-8 bg-card rounded-lg">Por favor, selecione um casamento para gerenciar os convidados.</div>;
  }

  return (
    <div className="space-y-6">
       <Tabs defaultValue="list">
        <div className="flex justify-between items-start">
            <TabsList>
                <TabsTrigger value="list"><Users className="mr-2"/>Lista de Convidados</TabsTrigger>
                <TabsTrigger value="tables"><TableIcon className="mr-2"/>Visualização das Mesas</TabsTrigger>
            </TabsList>
            <Button onClick={openAddDialog}>
                <UserPlus className="mr-2" />
                Adicionar Convidado
            </Button>
        </div>

        <TabsContent value="list">
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Mesa</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {guests.length > 0 ? guests.map(guest => (
                            <TableRow key={guest.id}>
                                <TableCell className="font-medium">{guest.name}</TableCell>
                                <TableCell>{guestGroupDisplay[guest.group]}</TableCell>
                                <TableCell>
                                    <span className={cn('px-2 py-1 text-xs font-semibold text-white rounded-full border', guestStatusColors[guest.status])}>
                                        {guestStatusDisplay[guest.status]}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">{guest.tableNumber > 0 ? guest.tableNumber : '-'}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(guest)}>
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
                                                <AlertDialogDescription>
                                                    Esta ação não pode ser desfeita e removerá o convidado permanentemente.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteGuest(guest.id)}>Remover</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Nenhum convidado adicionado ainda.
                                </TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </TabsContent>

        <TabsContent value="tables">
            {tables.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tables.map(([tableNumber, guestsOnTable]) => (
                        <Card key={tableNumber} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="font-headline text-xl">Mesa {tableNumber}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-2">
                                {guestsOnTable.map(guest => (
                                    <p key={guest.id} className="text-sm text-muted-foreground">{guest.name}</p>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                 <Card className="text-center py-12 border-dashed">
                    <CardContent>
                        <h3 className="text-lg font-semibold">Nenhuma mesa organizada</h3>
                        <p className="text-muted-foreground mt-1 mb-4">Confirme seus convidados e atribua um número de mesa para visualizá-los aqui.</p>
                    </CardContent>
                </Card>
            )}
        </TabsContent>
      </Tabs>
      
      {/* Guest Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingGuest ? 'Editar Convidado' : 'Adicionar Convidado'}</DialogTitle></DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Nome completo do convidado" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="group" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Grupo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um grupo" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {Object.entries(guestGroupDisplay).map(([key, value]) => (
                                        <SelectItem key={key} value={key}>{value}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                     )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                     <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                         {Object.entries(guestStatusDisplay).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>{value}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="tableNumber" render={({ field }) => (
                            <FormItem><FormLabel>Nº da Mesa</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit">Salvar</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
