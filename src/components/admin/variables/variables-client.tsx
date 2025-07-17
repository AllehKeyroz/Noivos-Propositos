'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const variablesFormSchema = z.object({
  unsplashAccessKey: z.string().min(10, { message: 'A chave de acesso é obrigatória.' }),
});

export default function VariablesClient() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<z.infer<typeof variablesFormSchema>>({
    resolver: zodResolver(variablesFormSchema),
    defaultValues: {
      unsplashAccessKey: '',
    },
  });

  useEffect(() => {
    const fetchKeys = async () => {
      setIsFetching(true);
      try {
        const docRef = doc(db, 'configs', 'api_keys');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          form.reset(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching API keys:", error);
        toast({ title: 'Erro', description: 'Não foi possível carregar as chaves de API existentes.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };
    fetchKeys();
  }, [form, toast]);

  async function onSubmit(values: z.infer<typeof variablesFormSchema>) {
    setIsLoading(true);
    try {
      const docRef = doc(db, 'configs', 'api_keys');
      await setDoc(docRef, values, { merge: true });
      toast({ title: 'Sucesso!', description: 'As chaves da API foram salvas.' });
    } catch (error) {
      console.error("Error saving API keys:", error);
      toast({ title: 'Erro', description: 'Não foi possível salvar as chaves.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API do Unsplash</CardTitle>
            <CardDescription>Insira sua chave de acesso (Access Key) do Unsplash para habilitar a busca de inspirações.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="unsplashAccessKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unsplash Access Key</FormLabel>
                  <FormControl>
                    <Input placeholder="Sua chave de acesso do Unsplash" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Chaves
        </Button>
      </form>
    </Form>
  );
}
