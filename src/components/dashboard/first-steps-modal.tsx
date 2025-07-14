
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';

const firstStepsSchema = z.object({
  brideName: z.string().min(2, { message: 'O nome da noiva é obrigatório.' }),
  groomName: z.string().min(2, { message: 'O nome do noivo é obrigatório.' }),
  weddingDate: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: 'A data e hora são obrigatórias.' }),
});

interface FirstStepsModalProps {
  isOpen: boolean;
  activeWeddingId: string;
}

export default function FirstStepsModal({ isOpen, activeWeddingId }: FirstStepsModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(isOpen);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const form = useForm<z.infer<typeof firstStepsSchema>>({
    resolver: zodResolver(firstStepsSchema),
    defaultValues: {
      brideName: '',
      groomName: '',
      weddingDate: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: z.infer<typeof firstStepsSchema>) => {
    if (!activeWeddingId) {
      toast({ title: 'Erro', description: 'ID do casamento não encontrado.', variant: 'destructive' });
      return;
    }

    try {
      const weddingDocRef = doc(db, 'weddings', activeWeddingId);
      const weddingSnap = await getDoc(weddingDocRef);
      const dataToSave = {
        brideName: values.brideName,
        groomName: values.groomName,
        weddingDate: Timestamp.fromDate(new Date(values.weddingDate)),
      };

      if (weddingSnap.exists()) {
        await updateDoc(weddingDocRef, dataToSave);
      } else {
        await setDoc(weddingDocRef, {
            ...dataToSave,
            coverPhotoUrl: '',
            totalBudget: 0,
        });
      }

      toast({ title: 'Tudo pronto!', description: 'Seu painel foi configurado com sucesso.' });
      setOpen(false); // Fecha o modal após o sucesso
    } catch (error) {
      console.error('Error saving first steps:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar os dados.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={true}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
             <div className="bg-primary/10 p-3 rounded-full">
                <Sparkles className="h-8 w-8 text-primary" />
             </div>
          </div>
          <DialogTitle className="text-center font-headline text-2xl">Bem-vindo(a) ao Propósitos!</DialogTitle>
          <DialogDescription className="text-center">
            Vamos começar com alguns detalhes essenciais para personalizar sua jornada.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="groomName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Noivo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Pedro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brideName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Noiva</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Ana" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="weddingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data e Hora da Cerimônia</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="!mt-6">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Começar a Planejar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
