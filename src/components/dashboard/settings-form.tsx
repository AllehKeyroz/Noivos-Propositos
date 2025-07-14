'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWedding } from '@/context/wedding-context';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import type { WeddingData } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import ImageUploader from '../ui/image-uploader';

const formSchema = z.object({
  brideName: z.string().min(2, { message: 'O nome da noiva deve ter pelo menos 2 caracteres.' }),
  groomName: z.string().min(2, { message: 'O nome do noivo deve ter pelo menos 2 caracteres.' }),
  weddingDate: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: 'Por favor, insira uma data e hora válidas.' }),
  weddingLocation: z.string().min(3, { message: 'O local deve ter pelo menos 3 caracteres.' }),
  totalBudget: z.coerce.number().min(0, { message: 'O orçamento total deve ser um valor positivo.' }).optional(),
  coverPhotoUrl: z.string().optional(),
});

const toInputDateTime = (date: Date | Timestamp | undefined): string => {
  if (!date) return '';
  const d = date instanceof Timestamp ? date.toDate() : date;
  if (isNaN(d.getTime())) return '';
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function SettingsForm() {
  const { toast } = useToast();
  const { activeWeddingId, loading: weddingLoading } = useWedding();
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brideName: '',
      groomName: '',
      weddingDate: '',
      weddingLocation: '',
      totalBudget: 0,
      coverPhotoUrl: '',
    },
  });

  useEffect(() => {
    if (!activeWeddingId) {
        setDataLoading(false);
        return;
    };

    setDataLoading(true);
    const weddingDocRef = doc(db, 'weddings', activeWeddingId);
    const unsubWedding = onSnapshot(weddingDocRef, (weddingSnap) => {
        const weddingData = weddingSnap.exists() ? (weddingSnap.data() as WeddingData) : null;
        form.reset({
          brideName: weddingData?.brideName || '',
          groomName: weddingData?.groomName || '',
          weddingDate: toInputDateTime(weddingData?.weddingDate),
          weddingLocation: weddingData?.weddingLocation || '',
          totalBudget: weddingData?.totalBudget || 0,
          coverPhotoUrl: weddingData?.coverPhotoUrl || '',
        });
        setDataLoading(false);
    }, (error) => {
        toast({ title: "Erro", description: "Não foi possível carregar os dados existentes."});
        setDataLoading(false);
    });

    return () => unsubWedding();
  }, [activeWeddingId, form, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!activeWeddingId) {
        toast({ title: "Erro", description: "Nenhuma subconta de casamento selecionada."})
        return;
    };
    setIsLoading(true);

    try {
      const weddingDocRef = doc(db, 'weddings', activeWeddingId);
      await setDoc(weddingDocRef, {
        brideName: values.brideName, 
        groomName: values.groomName,
        weddingDate: Timestamp.fromDate(new Date(values.weddingDate)),
        weddingLocation: values.weddingLocation,
        totalBudget: values.totalBudget || 0,
        coverPhotoUrl: values.coverPhotoUrl || null,
      }, { merge: true });

      toast({ title: 'Sucesso!', description: 'As informações do casamento foram salvas.' });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: 'Erro', description: 'Não foi possível salvar as informações.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  const isPageLoading = weddingLoading || dataLoading;

  if (isPageLoading) {
    return <SettingsSkeleton />;
  }

  if (!activeWeddingId) {
    return <div className="text-center p-8 bg-card rounded-lg">Você ainda não foi atribuído a um casamento para poder configurar.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
              <CardTitle className="font-headline text-2xl">Detalhes do Evento</CardTitle>
              <CardDescription>Preencha as informações abaixo para personalizar seu painel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="brideName" render={({ field }) => (<FormItem><FormLabel>Nome da Noiva</FormLabel><FormControl><Input placeholder="Ex: Maria" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="groomName" render={({ field }) => (<FormItem><FormLabel>Nome do Noivo</FormLabel><FormControl><Input placeholder="Ex: João" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="weddingDate" render={({ field }) => (<FormItem><FormLabel>Data e Hora da Cerimônia</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="weddingLocation" render={({ field }) => (<FormItem><FormLabel>Local do Casamento</FormLabel><FormControl><Input placeholder="Ex: Salão de Festas Exemplo, São Paulo" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="totalBudget" render={({ field }) => (<FormItem><FormLabel>Orçamento Total (R$)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 20000.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              
              <div className="space-y-2">
                <FormLabel>Foto de Capa (1200x400)</FormLabel>
                <ImageUploader 
                    initialImageUrl={form.getValues('coverPhotoUrl') || null}
                    onUploadComplete={(url) => form.setValue('coverPhotoUrl', url, { shouldValidate: true, shouldDirty: true })}
                    aspectRatio="aspect-[3/1]"
                />
              </div>

          </CardContent>
        </Card>
        <Button type="submit" disabled={isLoading} size="lg">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Salvar Alterações
        </Button>
      </form>
    </Form>
  );
}

const SettingsSkeleton = () => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div></div>
                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div></div>
                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-32 w-full" /></div>
            </CardContent>
        </Card>
        <Skeleton className="h-12 w-48" />
    </div>
);
