'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail, type AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
});

function getResetPasswordErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'Não foi encontrado nenhum usuário com este e-mail.';
    case 'auth/invalid-email':
      return 'O endereço de e-mail é inválido.';
    default:
      return 'Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.';
  }
}

export default function ForgotPasswordForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setIsSent(true);
      toast({
        title: 'E-mail enviado',
        description: 'Verifique sua caixa de entrada para redefinir a senha.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: getResetPasswordErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSent) {
    return (
       <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Verifique seu e-mail</CardTitle>
          <CardDescription>
            Enviamos um link para redefinição de senha para o seu endereço de e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Link href="/login" passHref>
              <Button className="w-full">Voltar para o Login</Button>
            </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Recuperar senha</CardTitle>
        <CardDescription>
          Não se preocupe. Insira seu e-mail e enviaremos um link de recuperação.
        </CardDescription>
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar link de recuperação
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Lembrou da senha?{' '}
          <Link href="/login" className="underline text-primary font-semibold">
            Faça login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
