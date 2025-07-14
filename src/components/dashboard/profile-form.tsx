'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthentication } from '@/hooks/use-authentication';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import ImageUploader from '@/components/ui/image-uploader';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Seu nome deve ter pelo menos 2 caracteres.' }).optional().or(z.literal('')),
  dateOfBirth: z.string().refine((val) => val === '' || !isNaN(Date.parse(val)), { message: 'Por favor, insira uma data válida.' }).optional(),
  contactEmail: z.string().email({ message: 'Por favor, insira um e-mail válido.' }).optional().or(z.literal('')),
  contactPhone: z.string().min(10, { message: 'Por favor, insira um telefone válido.' }).optional().or(z.literal('')),
  photoUrl: z.string().optional(),
});


const toInputDate = (date: Date | Timestamp | undefined): string => {
  if (!date) return '';
  const d = date instanceof Timestamp ? date.toDate() : date;
  if (isNaN(d.getTime())) return '';
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function ProfileForm() {
  const { user } = useAuthentication();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      dateOfBirth: '',
      contactEmail: '',
      contactPhone: '',
      photoUrl: '',
    },
  });
  
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsFetching(true);
      const profileDocRef = doc(db, 'users', user.uid);
      
      try {
        const profileSnap = await getDoc(profileDocRef);
        const profileData = profileSnap.exists() ? (profileSnap.data() as AppUser) : null;

        form.reset({
          name: profileData?.name || '',
          dateOfBirth: toInputDate(profileData?.dateOfBirth),
          contactEmail: profileData?.contactEmail || user.email || '',
          contactPhone: profileData?.contactPhone || '',
          photoUrl: profileData?.photoUrl || '',
        });

      } catch (error) {
        toast({ title: "Erro", description: "Não foi possível carregar os dados do seu perfil."});
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [user, form, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsLoading(true);

    try {
      const profileDocRef = doc(db, 'users', user.uid);
      await setDoc(profileDocRef, {
        name: values.name || null,
        dateOfBirth: values.dateOfBirth ? Timestamp.fromDate(new Date(values.dateOfBirth)) : null,
        contactEmail: values.contactEmail || null,
        contactPhone: values.contactPhone || null,
        photoUrl: values.photoUrl || null,
      }, { merge: true });

      toast({ title: 'Sucesso!', description: 'Suas informações foram salvas.' });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ title: 'Erro', description: 'Não foi possível salvar as informações.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return <ProfileSkeleton />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
              <CardTitle className="font-headline text-2xl">Minhas Informações</CardTitle>
              <CardDescription>Informações do organizador(a) principal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                 <div className="w-32 h-32 shrink-0">
                    <ImageUploader 
                        initialImageUrl={form.getValues('photoUrl') || null}
                        onUploadComplete={(url) => form.setValue('photoUrl', url, { shouldValidate: true, shouldDirty: true })}
                        aspectRatio="aspect-square"
                    />
                 </div>
                  <div className="flex-1 w-full">
                       <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Seu Nome Completo</FormLabel><FormControl><Input placeholder="Ex: Maria da Silva" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (<FormItem><FormLabel>Data de Nascimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="contactPhone" render={({ field }) => (<FormItem><FormLabel>Telefone de Contato</FormLabel><FormControl><Input type="tel" placeholder="(11) 98765-4321" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="contactEmail" render={({ field }) => (<FormItem><FormLabel>E-mail de Contato</FormLabel><FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Separator />
               <div className="space-y-2">
                <Label>Plano Atual</Label>
                <p className="text-sm p-3 bg-muted rounded-md border">Plano Básico</p>
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

const ProfileSkeleton = () => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <Skeleton className="w-32 h-32 rounded-lg" />
                    <div className="flex-1 w-full space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div></div>
                 <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
            </CardContent>
        </Card>
        <Skeleton className="h-12 w-48" />
    </div>
);
