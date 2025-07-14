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
import type { TimeCapsuleItem } from '@/lib/types';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Edit, Trash2, Lock, Gift } from 'lucide-react';
import ImageUploader from '@/components/ui/image-uploader';
import Countdown from '@/components/dashboard/countdown';


const capsuleItemFormSchema = z.object({
  message: z.string().min(10, { message: 'A mensagem deve ter pelo menos 10 caracteres.' }),
  imageUrl: z.string().optional(),
});


export default function CapsuleClient() {
  const { toast } = useToast();
  const { activeWeddingId, userProfile, loading, weddingData, timeCapsuleItems: items } = useWedding();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimeCapsuleItem | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);


  const form = useForm<z.infer<typeof capsuleItemFormSchema>>({
    resolver: zodResolver(capsuleItemFormSchema),
    defaultValues: { message: '', imageUrl: '' },
  });
  
  useEffect(() => {
    if (editingItem) {
      form.reset({
        message: editingItem.message,
        imageUrl: editingItem.imageUrl,
      });
    } else {
      form.reset({ message: '', imageUrl: '' });
    }
  }, [editingItem, form, isDialogOpen]);

  const { canViewContent, canManageContent } = useMemo(() => {
    const isSuperAdmin = userProfile?.role === 'super_admin';
    const isCoupleOrCollaborator = ['bride', 'groom', 'collaborator'].includes(userProfile?.role || '');

    if (!weddingData?.weddingDate) {
        return {
            canViewContent: isSuperAdmin,
            canManageContent: isSuperAdmin || isCoupleOrCollaborator,
        };
    }
    
    const isWeddingDayOrLater = weddingData.weddingDate.toDate() <= new Date();
    
    return {
        canViewContent: isSuperAdmin || (isCoupleOrCollaborator && isWeddingDayOrLater),
        canManageContent: isSuperAdmin || isCoupleOrCollaborator,
    };
  }, [userProfile, weddingData]);


  const handleFormSubmit = async (values: z.infer<typeof capsuleItemFormSchema>) => {
    if (!activeWeddingId || !userProfile?.id) {
        toast({
            title: 'Erro',
            description: 'Não foi possível identificar seu usuário. Faça login novamente.',
            variant: 'destructive',
        });
        return;
    }

    try {
      const dataToSave = {
        ...values,
        senderName: userProfile.name || 'Convidado',
        senderUid: userProfile.id,
      };

      if (editingItem) {
        await updateDoc(doc(db, 'weddings', activeWeddingId, 'timeCapsuleItems', editingItem.id), dataToSave);
        toast({ title: 'Sucesso', description: 'Mensagem atualizada.' });
      } else {
        await addDoc(collection(db, 'weddings', activeWeddingId, 'timeCapsuleItems'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Sucesso', description: 'Sua mensagem foi guardada na cápsula!' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar a mensagem.', variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!activeWeddingId) return;
    try {
      await deleteDoc(doc(db, 'weddings', activeWeddingId, 'timeCapsuleItems', id));
      toast({ title: 'Sucesso', description: 'Mensagem removida.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover a mensagem.', variant: 'destructive' });
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!activeWeddingId) {
    return <div className="text-center p-8 bg-card rounded-lg">Por favor, selecione um casamento para ver a cápsula do tempo.</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }}>
          <Gift className="mr-2" />
          Deixar uma Mensagem
        </Button>
      </div>

       {canViewContent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.length > 0 ? items.map((item) => (
            <Card key={item.id} className="flex flex-col shadow-lg">
                {item.imageUrl && (
                    <CardHeader className="p-0">
                        <div className="relative w-full aspect-video rounded-t-lg overflow-hidden cursor-pointer" onClick={() => setExpandedImageUrl(item.imageUrl!)}>
                            <Image src={item.imageUrl} alt="Memória da cápsula do tempo" layout="fill" className="object-cover bg-muted" data-ai-hint="couple message" />
                        </div>
                    </CardHeader>
                )}
                <CardContent className="pt-6 flex-1">
                <p className="text-muted-foreground italic">"{item.message}"</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                <p className="text-sm font-semibold text-primary">{item.senderName}</p>
                {canManageContent && (
                    <div className="flex items-center gap-1 ml-auto">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Remover Mensagem?</AlertDialogTitle><AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Remover</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
                </CardFooter>
            </Card>
            )) : (
                <div className="col-span-full">
                    <Card className="text-center py-12 border-dashed">
                        <CardContent>
                            <h3 className="text-lg font-semibold">A cápsula do tempo está vazia.</h3>
                            <p className="text-muted-foreground mt-1">Seja o primeiro a deixar uma mensagem para o casal!</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
       ) : (
        <div className="flex flex-col items-center justify-center text-center p-10 rounded-lg bg-card border-2 border-dashed">
            <Lock className="w-16 h-16 text-primary mb-4"/>
            <h2 className="text-2xl font-bold font-headline mb-2">Cápsula do Tempo Bloqueada</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Este é um espaço para amigos e familiares deixarem mensagens que serão abertas no dia do casamento. Até lá, o conteúdo é uma surpresa!
            </p>
            {weddingData?.weddingDate && <Countdown targetDate={weddingData.weddingDate.toDate()} />}
        </div>
       )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Mensagem' : 'Deixar Mensagem na Cápsula'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
               <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem><FormLabel>Sua Mensagem</FormLabel><FormControl><Textarea placeholder="Deixe seus votos, conselhos e lembranças para o futuro do casal..." {...field} rows={6} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="imageUrl" render={() => (
                <FormItem>
                  <FormLabel>Anexar uma Foto (Opcional)</FormLabel>
                   <ImageUploader 
                      initialImageUrl={form.getValues('imageUrl') || null}
                      onUploadComplete={(url) => form.setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true })}
                      aspectRatio="aspect-video"
                  />
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                   {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Mensagem
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