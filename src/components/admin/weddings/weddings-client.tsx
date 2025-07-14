'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthentication } from '@/hooks/use-authentication';
import { useToast } from '@/hooks/use-toast';
import type { WeddingData } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { populateWeddingWithSampleData } from '@/lib/sample-data';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Edit, Trash2, Wand2 } from 'lucide-react';

const weddingFormSchema = z.object({
  brideName: z.string().min(2, { message: 'O nome da noiva é obrigatório.' }),
  groomName: z.string().min(2, { message: 'O nome do noivo é obrigatório.' }),
});

export default function WeddingsClient() {
  const { user } = useAuthentication();
  const { toast } = useToast();
  const [weddings, setWeddings] = useState<WeddingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWedding, setEditingWedding] = useState<WeddingData | null>(null);

  const form = useForm<z.infer<typeof weddingFormSchema>>({
    resolver: zodResolver(weddingFormSchema),
    defaultValues: { brideName: '', groomName: '' },
  });

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const weddingsQuery = query(collection(db, 'weddings'), orderBy('weddingDate', 'desc'));

    const unsubscribe = onSnapshot(weddingsQuery, (snapshot) => {
      const weddingsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as WeddingData[];
      setWeddings(weddingsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching weddings:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os casamentos.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  useEffect(() => {
      if (editingWedding) {
        form.reset({
            brideName: editingWedding.brideName,
            groomName: editingWedding.groomName,
        });
      } else {
        form.reset({ brideName: '', groomName: '' });
      }
  }, [editingWedding, form]);

  const handleFormSubmit = async (values: z.infer<typeof weddingFormSchema>) => {
    if (!user) return;
    
    try {
      if (editingWedding) {
        const weddingDocRef = doc(db, 'weddings', editingWedding.id!);
        await updateDoc(weddingDocRef, values);
        toast({ title: 'Sucesso', description: 'Casamento atualizado.' });
      } else {
        const dataToSave = {
            ...values,
            weddingDate: Timestamp.now(), 
            weddingLocation: 'A definir',
            coverPhotoUrl: '',
            totalBudget: 0,
        };
        await addDoc(collection(db, 'weddings'), dataToSave);
        toast({ title: 'Sucesso', description: 'Nova subconta de casamento criada em branco.' });
      }
      setIsFormOpen(false);
      setEditingWedding(null);
    } catch (error) {
      console.error("Error saving wedding:", error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o casamento.', variant: 'destructive' });
    }
  };

  const handleDeleteWedding = async (weddingId: string) => {
    if (!user || !weddingId) return;
    try {
      await deleteDoc(doc(db, 'weddings', weddingId));
      toast({ title: 'Sucesso', description: 'Casamento removido.' });
    } catch (error) {
       toast({ title: 'Erro', description: 'Não foi possível remover o casamento.', variant: 'destructive' });
    }
  };
  
  const handlePopulateData = async (weddingId: string) => {
    if (!user) return;
    try {
        await populateWeddingWithSampleData(weddingId);
        toast({ title: 'Sucesso!', description: 'A subconta foi populada com dados de exemplo.' });
    } catch (error) {
        console.error("Error populating data:", error);
        toast({ title: 'Erro', description: 'Não foi possível popular a subconta com dados.', variant: 'destructive' });
    }
  };

  const openDialog = (wedding: WeddingData | null) => {
    setEditingWedding(wedding);
    setIsFormOpen(true);
  }
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => openDialog(null)}>
            <PlusCircle className="mr-2" />
            Criar Casamento
        </Button>
      </div>

      <Card>
          <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead>Casal</TableHead>
                  <TableHead>Data do Evento</TableHead>
                  <TableHead>ID da Subconta</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {weddings.length > 0 ? weddings.map(wedding => (
                      <TableRow key={wedding.id}>
                          <TableCell className="font-medium">{wedding.brideName} & {wedding.groomName}</TableCell>
                          <TableCell>{wedding.weddingDate ? format(wedding.weddingDate.toDate(), 'P', { locale: ptBR }) : 'N/A'}</TableCell>
                          <TableCell><code className="text-xs bg-muted p-1 rounded">{wedding.id}</code></TableCell>
                          <TableCell className="text-right">
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" title="Popular com dados de exemplo">
                                          <Wand2 className="h-4 w-4 text-primary" />
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Popular com dados de exemplo?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Esta ação irá adicionar um conjunto completo de dados de exemplo a esta subconta de casamento. Pode substituir alguns detalhes existentes.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handlePopulateData(wedding.id!)}>Popular Dados</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                              <Button variant="ghost" size="icon" onClick={() => openDialog(wedding)}>
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
                                              Esta ação removerá permanentemente todos os dados deste casamento.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteWedding(wedding.id!)}>Remover</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </TableCell>
                      </TableRow>
                  )) : (
                      <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                              Nenhuma subconta de casamento encontrada.
                          </TableCell>
                      </TableRow>
                  )}
              </TableBody>
          </Table>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingWedding ? 'Editar Casamento' : 'Criar Nova Subconta'}</DialogTitle></DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                    <FormField control={form.control} name="groomName" render={({ field }) => (
                        <FormItem><FormLabel>Nome do Noivo</FormLabel><FormControl><Input placeholder="Ex: João" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="brideName" render={({ field }) => (
                        <FormItem><FormLabel>Nome da Noiva</FormLabel><FormControl><Input placeholder="Ex: Maria" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit">{editingWedding ? 'Salvar Alterações' : 'Criar'}</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
