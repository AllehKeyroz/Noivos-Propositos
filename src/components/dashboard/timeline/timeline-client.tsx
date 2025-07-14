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
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWedding } from '@/context/wedding-context';
import { useToast } from '@/hooks/use-toast';
import type { TimelineEvent } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Edit, Trash2, Heart } from 'lucide-react';
import ImageUploader from '@/components/ui/image-uploader';
import { cn } from '@/lib/utils';


const toInputDate = (date: Date | Timestamp | undefined): string => {
  if (!date) return '';
  const d = date instanceof Timestamp ? date.toDate() : date;
  if (isNaN(d.getTime())) return '';
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const timelineEventFormSchema = z.object({
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Por favor, insira uma data válida.' }),
  description: z.string().min(3, { message: 'A descrição deve ter pelo menos 3 caracteres.' }),
  imageUrl: z.string().url({ message: 'Por favor, envie uma imagem.' }),
});


export default function TimelineClient() {
  const { toast } = useToast();
  const { activeWeddingId, loading, timelineEvents: events } = useWedding();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof timelineEventFormSchema>>({
    resolver: zodResolver(timelineEventFormSchema),
    defaultValues: { title: '', date: '', description: '', imageUrl: '' },
  });
  
  useEffect(() => {
    if (editingEvent) {
      form.reset({
        title: editingEvent.title,
        date: toInputDate(editingEvent.date),
        description: editingEvent.description,
        imageUrl: editingEvent.imageUrl,
      });
    } else {
      form.reset({ title: '', date: '', description: '', imageUrl: '' });
    }
  }, [editingEvent, form, isDialogOpen]);

  const handleFormSubmit = async (values: z.infer<typeof timelineEventFormSchema>) => {
    if (!activeWeddingId) return;
    try {
      const dataToSave = {
        ...values,
        date: Timestamp.fromDate(new Date(values.date)),
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'weddings', activeWeddingId, 'timelineEvents', editingEvent.id), dataToSave);
        toast({ title: 'Sucesso', description: 'Lembrança atualizada.' });
      } else {
        await addDoc(collection(db, 'weddings', activeWeddingId, 'timelineEvents'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Sucesso', description: 'Nova lembrança adicionada à linha do tempo.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar a lembrança.', variant: 'destructive' });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!activeWeddingId) return;
    try {
      await deleteDoc(doc(db, 'weddings', activeWeddingId, 'timelineEvents', id));
      toast({ title: 'Sucesso', description: 'Lembrança removida.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover a lembrança.', variant: 'destructive' });
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!activeWeddingId) {
    return <div className="text-center p-8 bg-card rounded-lg">Por favor, selecione um casamento para ver a linha do tempo.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button onClick={() => { setEditingEvent(null); setIsDialogOpen(true); }}>
          <PlusCircle className="mr-2" />
          Adicionar Lembrança
        </Button>
      </div>

      <div className="relative p-4 md:p-10">
        {events.length > 0 && (
          <div className="absolute left-4 top-0 h-full w-0.5 bg-border md:left-1/2 md:-translate-x-1/2"></div>
        )}
        {events.length > 0 ? events.map((event, index) => (
          <div key={event.id} className={cn(
            "relative mb-8 flex items-start", 
            "md:justify-between md:gap-8",
            index % 2 !== 0 && "md:flex-row-reverse"
            )}>
            <div className="hidden md:block w-5/12"></div>
            <div className="z-20 flex items-center order-1 bg-primary shadow-xl w-8 h-8 rounded-full shrink-0 absolute left-4 -translate-x-1/2 md:relative md:left-0 md:translate-x-0">
              <Heart className="mx-auto font-semibold text-sm text-primary-foreground fill-primary-foreground" />
            </div>
            <div className={cn("order-1 w-full ml-10 md:ml-0 md:w-5/12")}>
              <Card>
                <CardHeader>
                  <div className="relative w-full aspect-video rounded-t-lg overflow-hidden mb-4 cursor-pointer" onClick={() => setExpandedImageUrl(event.imageUrl)}>
                     <Image src={event.imageUrl} alt={event.title} layout="fill" className="object-cover bg-muted" data-ai-hint="couple event" />
                  </div>
                  <p className="text-sm text-muted-foreground">{format(event.date.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                  <CardTitle className="font-headline">{event.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{event.description}</p>
                </CardContent>
                <CardFooter className="justify-end gap-1">
                   <Button variant="ghost" size="icon" onClick={() => { setEditingEvent(event); setIsDialogOpen(true); }}>
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
                               <AlertDialogTitle>Remover Lembrança?</AlertDialogTitle>
                               <AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                               <AlertDialogCancel>Cancelar</AlertDialogCancel>
                               <AlertDialogAction onClick={() => handleDeleteEvent(event.id)}>Remover</AlertDialogAction>
                           </AlertDialogFooter>
                       </AlertDialogContent>
                   </AlertDialog>
                </CardFooter>
              </Card>
            </div>
          </div>
        )) : (
            <Card className="text-center py-12 border-dashed">
                <CardContent>
                    <h3 className="text-lg font-semibold">Comecem a sua linha do tempo.</h3>
                    <p className="text-muted-foreground mt-1">Adicionem a primeira lembrança da jornada de vocês.</p>
                </CardContent>
            </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar Lembrança' : 'Nova Lembrança'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
               <FormField control={form.control} name="imageUrl" render={() => (
                <FormItem>
                  <FormLabel>Foto do Momento</FormLabel>
                   <ImageUploader 
                      initialImageUrl={form.getValues('imageUrl') || null}
                      onUploadComplete={(url) => form.setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true })}
                      aspectRatio="aspect-video"
                  />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ex: Nosso primeiro encontro" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Data do Acontecimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descreva este dia especial..." {...field} /></FormControl><FormMessage /></FormItem>
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
      
      <Dialog open={!!expandedImageUrl} onOpenChange={(isOpen) => !isOpen && setExpandedImageUrl(null)}>
        <DialogContent className="max-w-4xl p-2 bg-transparent border-none shadow-none">
          {expandedImageUrl && <Image src={expandedImageUrl} alt="Lembrança em tamanho real" width={1920} height={1080} className="object-contain w-full h-auto rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
