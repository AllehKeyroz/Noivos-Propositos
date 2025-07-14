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
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWedding } from '@/context/wedding-context';
import { useToast } from '@/hooks/use-toast';
import type { Appointment } from '@/lib/types';
import { format, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const appointmentFormSchema = z.object({
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Por favor, insira uma data e hora válidas.' }),
});

type MappedAppointment = Appointment & { isWeddingDay?: boolean };

const toInputDateTime = (date: Date | Timestamp | undefined): string => {
  if (!date) return '';
  const d = date instanceof Timestamp ? date.toDate() : date;
  if (isNaN(d.getTime())) return '';
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AppointmentsClient() {
  const { toast } = useToast();
  const { activeWeddingId, loading, appointments, weddingData } = useWedding();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const form = useForm<z.infer<typeof appointmentFormSchema>>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: { title: '', description: '', date: '' },
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingAppointment) {
        form.reset({
          title: editingAppointment.title,
          description: editingAppointment.description,
          date: toInputDateTime(editingAppointment.date),
        });
      } else {
        form.reset({ title: '', description: '', date: '' });
      }
    }
  }, [isDialogOpen, editingAppointment, form]);
  
  const combinedAppointments = useMemo<MappedAppointment[]>(() => {
    const allAppointments: MappedAppointment[] = [...appointments];
    if (weddingData?.weddingDate) {
      allAppointments.push({
        id: 'wedding-day',
        title: 'O Grande Dia!',
        description: weddingData.weddingLocation || 'A celebração do nosso amor.',
        date: weddingData.weddingDate,
        createdAt: weddingData.weddingDate,
        isWeddingDay: true,
      });
    }
    return allAppointments.sort((a, b) => a.date.toMillis() - b.date.toMillis());
  }, [appointments, weddingData]);

  const upcomingAppointments = useMemo(() => {
      return combinedAppointments.filter(a => isFuture(a.date.toDate()) || a.isWeddingDay);
  }, [combinedAppointments]);

  const handleEdit = (appointment: Appointment) => {
    if ((appointment as MappedAppointment).isWeddingDay) return;
    setEditingAppointment(appointment);
    setIsDialogOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingAppointment(null);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (values: z.infer<typeof appointmentFormSchema>) => {
    if (!activeWeddingId) return;
    try {
      const dataToSave = {
        ...values,
        date: Timestamp.fromDate(new Date(values.date)),
      };

      if (editingAppointment) {
        await updateDoc(doc(db, 'weddings', activeWeddingId, 'appointments', editingAppointment.id), dataToSave);
        toast({ title: 'Sucesso', description: 'Compromisso atualizado.' });
      } else {
        await addDoc(collection(db, 'weddings', activeWeddingId, 'appointments'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Sucesso', description: 'Compromisso adicionado.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar o compromisso.', variant: 'destructive' });
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!activeWeddingId) return;
    try {
      await deleteDoc(doc(db, 'weddings', activeWeddingId, 'appointments', id));
      toast({ title: 'Sucesso', description: 'Compromisso removido.' });
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover o compromisso.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!activeWeddingId) {
    return <div className="text-center p-8 bg-card rounded-lg">Por favor, selecione um casamento para gerenciar a agenda.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-3">
            <Card className="p-0 overflow-hidden">
            <Calendar
                mode="single"
                modifiers={{
                    appointments: combinedAppointments.map(a => a.date.toDate()),
                    weddingDay: weddingData?.weddingDate ? [weddingData.weddingDate.toDate()] : [],
                }}
                modifiersClassNames={{
                    appointments: 'border-2 border-primary/50 rounded-lg',
                    weddingDay: 'bg-primary text-primary-foreground rounded-lg font-bold',
                }}
                className="w-full h-full"
                locale={ptBR}
            />
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="font-headline text-xl">Próximos Compromissos</CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map(app => (
                  <div
                    key={app.id}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg border",
                      app.isWeddingDay ? "border-primary/60 bg-primary/5" : "border-transparent",
                      !app.isWeddingDay && "cursor-pointer hover:bg-muted"
                    )}
                    onClick={() => !app.isWeddingDay && handleEdit(app)}
                  >
                    <div className="flex flex-col w-14 h-14 items-center justify-center bg-card rounded-md shrink-0 border shadow-sm">
                      <span className="text-xs font-bold uppercase text-muted-foreground">
                        {format(app.date.toDate(), 'MMM', { locale: ptBR })}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {format(app.date.toDate(), 'dd')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-card-foreground">{app.title}</p>
                      <p className="text-sm text-muted-foreground">{format(app.date.toDate(), 'p', { locale: ptBR })}</p>
                    </div>
                    {app.isWeddingDay && <Star className="h-5 w-5 text-primary" />}
                  </div>
                  ))
              ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum compromisso futuro.</p>
                  </div>
              )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso'}</DialogTitle></DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ex: Reunião com fotógrafo" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem><FormLabel>Data e Hora</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Descrição (Opcional)</FormLabel><FormControl><Textarea placeholder="Detalhes, endereço, etc." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                        {editingAppointment && (
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" className="mr-auto">Remover</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Remover Compromisso?</AlertDialogTitle><AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAppointment(editingAppointment.id)}>Confirmar Remoção</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        )}
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