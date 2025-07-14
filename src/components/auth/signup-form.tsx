'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, type AuthError } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, writeBatch, limit, serverTimestamp, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { AppRole } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  role: z.enum(['bride', 'groom', 'collaborator', 'guest'], {
    required_error: 'Por favor, selecione qual é a sua função.',
  }),
});

function getSignupErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso por outra conta.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. A senha deve ter pelo menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'O cadastro por e-mail e senha não está habilitado no projeto.';
    case 'auth/invalid-email':
      return 'O e-mail fornecido é inválido.';
    default:
      return 'Ocorreu um erro inesperado ao criar a conta. Tente novamente.';
  }
}

export default function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleInfoPopup, setShowRoleInfoPopup] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { email, password, role } = values;

    // Check if the role is 'guest' or 'collaborator' and show popup
    if (role === 'guest' || role === 'collaborator') {
      setShowRoleInfoPopup(true);
      return;
    }

    setIsLoading(true);
    let userCredential;

    // 1. Create user in Firebase Auth
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      toast({
        title: 'Erro de Cadastro',
        description: getSignupErrorMessage(error),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const user = userCredential.user;
    const userEmail = user.email!.toLowerCase();
    const batch = writeBatch(db);

    try {
      // 2. Handle different signup logics
      const userDocRef = doc(db, 'users', user.uid);
      const creationTime = user.metadata.creationTime ? Timestamp.fromDate(new Date(user.metadata.creationTime)) : serverTimestamp();
      
      // Check for a pending invitation for this email
      const invitationsRef = collection(db, 'invitations');
      const q = query(invitationsRef, where('email', '==', userEmail), where('status', '==', 'pending'), limit(1));
      const invitationSnapshot = await getDocs(q);

      if (!invitationSnapshot.empty) {
        // --- INVITATION FLOW ---
        const invitationDoc = invitationSnapshot.docs[0];
        const invitationData = invitationDoc.data();
        
        const weddingId = invitationData.weddingId || null;
        const name = invitationData.name || null;
        const invitedRole = invitationData.role || 'guest';

        batch.set(userDocRef, {
            email: user.email,
            role: invitedRole,
            weddingIds: weddingId ? [weddingId] : [],
            activeWeddingId: weddingId,
            name: name,
            createdAt: creationTime,
        }, { merge: true });

        batch.update(invitationDoc.ref, { 
          status: 'claimed', 
          claimedAt: serverTimestamp(), 
          claimedBy: user.uid 
        });

        toast({ title: 'Convite encontrado!', description: 'Seu perfil foi vinculado com sucesso.'});

      } else {
        // --- NEW COUPLE FLOW ---
        // Create a new wedding sub-account
        const newWeddingRef = doc(collection(db, 'weddings'));
        const brideName = role === 'bride' ? 'Noiva' : 'A definir';
        const groomName = role === 'groom' ? 'Noivo' : 'A definir';
        
        batch.set(newWeddingRef, {
            brideName,
            groomName,
            weddingDate: serverTimestamp(),
            weddingLocation: 'A definir',
            coverPhotoUrl: '',
            totalBudget: 0,
        });

        // Create the user document and link it to the new wedding
        batch.set(userDocRef, {
            email: user.email,
            role: role,
            weddingIds: [newWeddingRef.id],
            activeWeddingId: newWeddingRef.id,
            name: role === 'bride' ? brideName : groomName,
            createdAt: creationTime,
        }, { merge: true });

         toast({
            title: 'Bem-vindo(a)!',
            description: 'Sua conta e seu novo painel de casamento foram criados.',
        });
      }

      await batch.commit();
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Error setting up user profile:", error);
      toast({
          title: 'Erro Pós-Cadastro',
          description: "Sua conta foi criada, mas houve um erro ao configurar seu perfil. Contate o suporte.",
          variant: 'destructive',
      });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Criar sua conta</CardTitle>
          <CardDescription>Comece sua jornada de propósitos hoje mesmo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Crie uma senha forte" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eu sou...</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione sua função" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="bride">Noiva</SelectItem>
                        <SelectItem value="groom">Noivo</SelectItem>
                        <SelectItem value="collaborator">Colaborador(a)</SelectItem>
                        <SelectItem value="guest">Convidado(a)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar conta
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{' '}
            <Link href="/login" className="underline text-primary font-semibold">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={showRoleInfoPopup} onOpenChange={setShowRoleInfoPopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acesso por Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Para acessar como **Colaborador(a)** ou **Convidado(a)**, você precisa receber um convite dos noivos. Eles devem criar seu acesso no painel deles.
              <br /><br />
              Você gostaria de criar uma conta para planejar seu **próprio casamento**?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRoleInfoPopup(false)}>
              Sim, quero planejar meu casamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
