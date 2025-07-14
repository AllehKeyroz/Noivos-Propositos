
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWedding } from '@/context/wedding-context';
import { useToast } from '@/hooks/use-toast';
import type { AppUser, AppRole } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Edit, Trash2, PlusCircle, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const roleDisplay: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  bride: 'Noiva',
  groom: 'Noivo',
  collaborator: 'Colaborador',
  guest: 'Convidado',
};

const editUserFormSchema = z.object({
  role: z.enum(['collaborator', 'guest']),
});

const inviteUserFormSchema = z.object({
    name: z.string().min(2, "O nome é obrigatório."),
    email: z.string().email("Endereço de e-mail inválido."),
    role: z.enum(['bride', 'groom', 'collaborator', 'guest']),
});

export default function TeamClient() {
  const { userProfile: currentUserProfile, activeWeddingId, loading: weddingLoading } = useWedding();
  const { toast } = useToast();
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);
  const [isInvitingUser, setIsInvitingUser] = useState(false);

  const [showPartnerInvite, setShowPartnerInvite] = useState(false);
  const [partnerRoleToInvite, setPartnerRoleToInvite] = useState<'bride' | 'groom' | null>(null);

  const editForm = useForm<z.infer<typeof editUserFormSchema>>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: { role: 'guest' },
  });
  
  const inviteForm = useForm<z.infer<typeof inviteUserFormSchema>>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: { name: '', email: '', role: 'guest' },
  });


  useEffect(() => {
    if (!activeWeddingId) {
      setIsLoading(false);
      setTeamUsers([]);
      return;
    }

    setIsLoading(true);
    const teamQuery = query(
        collection(db, 'users'), 
        where('weddingIds', 'array-contains', activeWeddingId)
    );

    const unsubscribeTeam = onSnapshot(teamQuery, (snapshot) => {
        const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AppUser);
        const usersData = allUsers.filter(user => user.role !== 'super_admin');
        setTeamUsers(usersData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching team users:", error);
        toast({ title: 'Erro', description: 'Não foi possível carregar os usuários da sua equipe.', variant: 'destructive' });
        setIsLoading(false);
    });

    return () => unsubscribeTeam();

  }, [activeWeddingId, toast]);

  useEffect(() => {
    if (weddingLoading || isLoading || !currentUserProfile || !teamUsers) {
        setShowPartnerInvite(false);
        return;
    }

    const { role } = currentUserProfile;

    if (!activeWeddingId) {
        setShowPartnerInvite(false);
        return;
    }

    const isBride = role === 'bride';
    const isGroom = role === 'groom';

    if (isBride) {
        const groomExists = teamUsers.some(u => u.role === 'groom' && u.weddingIds?.includes(activeWeddingId));
        setShowPartnerInvite(!groomExists);
        setPartnerRoleToInvite('groom');
    } else if (isGroom) {
        const brideExists = teamUsers.some(u => u.role === 'bride' && u.weddingIds?.includes(activeWeddingId));
        setShowPartnerInvite(!brideExists);
        setPartnerRoleToInvite('bride');
    } else {
        setShowPartnerInvite(false);
        setPartnerRoleToInvite(null);
    }
  }, [teamUsers, currentUserProfile, weddingLoading, isLoading, activeWeddingId]);
  
  useEffect(() => {
    if (editingUser) {
        editForm.reset({ role: editingUser.role as 'collaborator' | 'guest' });
    }
  }, [editingUser, editForm]);

  const handleEditFormSubmit = async (values: z.infer<typeof editUserFormSchema>) => {
    if (!editingUser) return;
    
    try {
        await updateDoc(doc(db, 'users', editingUser.id!), { role: values.role });
        toast({ title: 'Sucesso', description: 'Função do usuário atualizada.' });
        setIsEditFormOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o usuário.', variant: 'destructive' });
    }
  };

  const handleInviteFormSubmit = async (values: z.infer<typeof inviteUserFormSchema>) => {
    if (!activeWeddingId) {
        toast({ title: "Erro", description: "Você não está associado a um casamento.", variant: "destructive" });
        return;
    }
    
    setIsInvitingUser(true);
    const { name, email, role } = values;
    
    try {
        await addDoc(collection(db, 'invitations'), {
            name,
            email: email.toLowerCase(),
            weddingId: activeWeddingId,
            role: role,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        toast({ 
            title: 'Convite Registrado!', 
            description: `Um "passe de acesso" foi criado para ${email}. Agora, o usuário precisa acessar a página de cadastro e criar uma conta com este mesmo e-mail para ativar o acesso.`
        });
        setIsInviteFormOpen(false);
        inviteForm.reset();
    } catch(error) {
        toast({ title: 'Erro ao Registrar Convite', description: 'Não foi possível salvar o convite.', variant: 'destructive' });
    } finally {
        setIsInvitingUser(false);
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!activeWeddingId || !userId) return;
    try {
      const userDoc = doc(db, 'users', userId);
      const currentTeamUser = teamUsers.find(u => u.id === userId);
      const newWeddingIds = currentTeamUser?.weddingIds?.filter(id => id !== activeWeddingId) || [];
      
      await updateDoc(userDoc, {
          weddingIds: newWeddingIds,
          activeWeddingId: currentTeamUser?.activeWeddingId === activeWeddingId ? (newWeddingIds[0] || null) : currentTeamUser?.activeWeddingId
      });
      toast({ title: 'Sucesso', description: 'Usuário removido da equipe deste casamento.' });
    } catch (error) {
       toast({ title: 'Erro', description: 'Não foi possível remover o usuário.', variant: 'destructive' });
    }
  };

  const openEditDialog = (userToEdit: AppUser) => {
    setEditingUser(userToEdit);
    setIsEditFormOpen(true);
  };
  
  if (isLoading || weddingLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!activeWeddingId) {
      return null; // Will be handled by RoleGuard or a wrapper component
  }

  return (
    <div className="space-y-6">
       {showPartnerInvite && partnerRoleToInvite && (
        <Alert className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
            <div>
            <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary"/>
                <AlertTitle className="font-headline text-lg m-0">Convide seu par para planejarem juntos!</AlertTitle>
            </div>
            <AlertDescription className="mt-2">
                Parece que {partnerRoleToInvite === 'groom' ? 'o noivo' : 'a noiva'} ainda não faz parte da equipe deste casamento.
            </AlertDescription>
            </div>
            <Button 
            onClick={() => {
                setIsInviteFormOpen(true);
                inviteForm.reset({ name: '', email: '', role: partnerRoleToInvite });
            }}
            className="shrink-0"
            >
            Convidar {partnerRoleToInvite === 'groom' ? 'Noivo' : 'Noiva'}
            </Button>
        </Alert>
       )}

      <div className="flex justify-end">
        <Button onClick={() => setIsInviteFormOpen(true)}>
            <PlusCircle className="mr-2" />
            Convidar para Equipe
        </Button>
      </div>

      <Card>
          <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Email / Nome</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {teamUsers.length > 0 ? teamUsers.map(u => {
                      return (
                      <TableRow key={u.id}>
                          <TableCell>
                            <div className="font-medium">{u.email}</div>
                            <div className="text-sm text-muted-foreground">{u.name || 'N/A'}</div>
                          </TableCell>
                           <TableCell>
                            <Badge variant={u.role === 'bride' || u.role === 'groom' ? 'default' : 'secondary'}>
                                {u.role ? roleDisplay[u.role] : 'N/D'}
                            </Badge>
                           </TableCell>
                           <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)} disabled={u.id === currentUserProfile?.id || u.role === 'bride' || u.role === 'groom'}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" disabled={u.id === currentUserProfile?.id || u.role === 'bride' || u.role === 'groom'}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Remover Acesso?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação removerá o acesso do usuário à equipe deste casamento. Ele não será excluído da plataforma.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveUser(u.id!)}>Remover Acesso</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                      </TableRow>
                  )
                  }) : (
                      <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
                              Nenhum usuário na sua equipe.
                          </TableCell>
                      </TableRow>
                  )}
              </TableBody>
          </Table>
      </Card>
      
      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Função: {editingUser?.email}</DialogTitle>
                <DialogDescription>Apenas colaboradores e convidados podem ter suas funções alteradas por aqui.</DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleEditFormSubmit)} className="space-y-4 pt-4">
                    <FormField control={editForm.control} name="role" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Função</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="collaborator">Colaborador</SelectItem>
                                    <SelectItem value="guest">Convidado</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                     )} />
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit">Salvar</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteFormOpen} onOpenChange={setIsInviteFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Convidar para sua Equipe</DialogTitle>
                <DialogDescription>Crie um passe de acesso para um novo membro. Ele(a) será associado a este casamento automaticamente.</DialogDescription>
            </DialogHeader>
            <Form {...inviteForm}>
                <form onSubmit={inviteForm.handleSubmit(handleInviteFormSubmit)} className="space-y-4 pt-4">
                    <FormField control={inviteForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: José da Silva" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={inviteForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="usuario@exemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={inviteForm.control} name="role" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Função</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="bride">Noiva</SelectItem>
                                    <SelectItem value="groom">Noivo</SelectItem>
                                    <SelectItem value="collaborator">Colaborador</SelectItem>
                                    <SelectItem value="guest">Convidado</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                     )} />
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost" onClick={() => inviteForm.reset()}>Cancelar</Button></DialogClose>
                        <Button type="submit" disabled={isInvitingUser}>
                            {isInvitingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar Convite
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
