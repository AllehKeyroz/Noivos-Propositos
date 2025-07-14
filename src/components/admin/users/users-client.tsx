
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
  deleteDoc,
  doc,
  orderBy,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthentication } from '@/hooks/use-authentication';
import { useToast } from '@/hooks/use-toast';
import type { AppUser, WeddingData, AppRole } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDesc, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Loader2, Edit, Trash2, PlusCircle, ChevronDown } from 'lucide-react';
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
  role: z.enum(['super_admin', 'bride', 'groom', 'collaborator', 'guest']),
  weddingIds: z.array(z.string()).optional(),
});

const inviteUserFormSchema = z.object({
    name: z.string().min(2, "O nome é obrigatório."),
    email: z.string().email("Endereço de e-mail inválido."),
    weddingId: z.string().nullable().optional(),
    role: z.enum(['bride', 'groom', 'collaborator', 'guest']),
});

const UNASSIGNED_VALUE = 'unassigned';

export default function UsersClient() {
  const { user } = useAuthentication();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [weddings, setWeddings] = useState<WeddingData[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [weddingsLoaded, setWeddingsLoaded] = useState(false);
  
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);
  const [isInvitingUser, setIsInvitingUser] = useState(false);


  const editForm = useForm<z.infer<typeof editUserFormSchema>>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: { role: 'guest', weddingIds: [] },
  });
  
  const inviteForm = useForm<z.infer<typeof inviteUserFormSchema>>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: { name: '', email: '', weddingId: '', role: 'guest' },
  });


  useEffect(() => {
    if (!user) {
      setUsersLoaded(true);
      setWeddingsLoaded(true);
      return;
    }

    setUsersLoaded(false);
    setWeddingsLoaded(false);

    const usersQuery = query(collection(db, 'users'), orderBy('email'));
    const weddingsQuery = query(collection(db, 'weddings'), orderBy('brideName'));

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as AppUser[];
      setUsers(usersData);
      setUsersLoaded(true);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os usuários.", variant: "destructive" });
      setUsersLoaded(true);
    });

    const unsubscribeWeddings = onSnapshot(weddingsQuery, (snapshot) => {
      const weddingsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as WeddingData[];
      setWeddings(weddingsData);
      setWeddingsLoaded(true);
    }, (error) => {
      console.error("Error fetching weddings:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os casamentos.", variant: "destructive" });
      setWeddingsLoaded(true);
    });

    return () => {
        unsubscribeUsers();
        unsubscribeWeddings();
    }
  }, [user, toast]);
  
  useEffect(() => {
    if (editingUser) {
        editForm.reset({
             role: editingUser.role,
             weddingIds: editingUser.weddingIds || [],
        });
    }
  }, [editingUser, editForm])

  const handleEditFormSubmit = async (values: z.infer<typeof editUserFormSchema>) => {
    if (!user || !editingUser) return;
    
    const newWeddingIds = values.weddingIds || [];
    let newActiveWeddingId = editingUser.activeWeddingId;

    if (newActiveWeddingId && !newWeddingIds.includes(newActiveWeddingId)) {
      newActiveWeddingId = newWeddingIds.length > 0 ? newWeddingIds[0] : null;
    } else if (!newActiveWeddingId && newWeddingIds.length > 0) {
      newActiveWeddingId = newWeddingIds[0];
    }


    try {
        await updateDoc(doc(db, 'users', editingUser.id!), { 
            role: values.role,
            weddingIds: newWeddingIds,
            activeWeddingId: newActiveWeddingId
        });
        toast({ title: 'Sucesso', description: 'Usuário atualizado.' });
        setIsEditFormOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o usuário.', variant: 'destructive' });
    }
  };

  const handleInviteFormSubmit = async (values: z.infer<typeof inviteUserFormSchema>) => {
    setIsInvitingUser(true);
    const { name, email, weddingId, role } = values;

    const finalWeddingId = (weddingId === UNASSIGNED_VALUE || weddingId === '') ? null : weddingId;
    
    try {
        await addDoc(collection(db, 'invitations'), {
            name,
            email: email.toLowerCase(),
            weddingId: finalWeddingId,
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

  const handleDeleteUser = async (userId: string) => {
    if (!user || !userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast({ title: 'Sucesso', description: 'Usuário removido do banco de dados.' });
    } catch (error) {
       toast({ title: 'Erro', description: 'Não foi possível remover o usuário.', variant: 'destructive' });
    }
  };

  const openEditDialog = (userToEdit: AppUser) => {
    setEditingUser(userToEdit);
    setIsEditFormOpen(true);
  };
  
  const isLoading = !usersLoaded || !weddingsLoaded;
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsInviteFormOpen(true)}>
            <PlusCircle className="mr-2" />
            Convidar Usuário
        </Button>
      </div>

      <Card>
          <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead>Email / Nome</TableHead>
                  <TableHead>Casamentos Atribuídos</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {users.length > 0 ? users.map(u => {
                      const assignedWeddingsCount = u.weddingIds?.length || 0;
                      return (
                      <TableRow key={u.id}>
                          <TableCell>
                            <div className="font-medium">{u.email}</div>
                            <div className="text-sm text-muted-foreground">{u.name || 'N/A'}</div>
                          </TableCell>
                          <TableCell>{assignedWeddingsCount > 0 ? `${assignedWeddingsCount} casamento(s)` : 'Nenhum'}</TableCell>
                           <TableCell>
                            <Badge variant={u.role === 'super_admin' ? 'destructive' : u.role === 'bride' || u.role === 'groom' ? 'default' : 'secondary'}>
                                {u.role ? roleDisplay[u.role] : 'N/D'}
                            </Badge>
                           </TableCell>
                          <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)}>
                                  <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" disabled={u.id === user?.uid}>
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                          <AlertDialogDesc>
                                            Esta ação removerá o usuário do Firestore, mas não da Autenticação do Firebase.
                                          </AlertDialogDesc>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteUser(u.id!)}>Remover</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </TableCell>
                      </TableRow>
                  )
                  }) : (
                      <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                              Nenhum usuário encontrado.
                          </TableCell>
                      </TableRow>
                  )}
              </TableBody>
          </Table>
      </Card>
      
      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Usuário: {editingUser?.email}</DialogTitle>
                <DialogDescription>
                  Atribua funções e acesso a casamentos para este usuário.
                </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleEditFormSubmit)} className="space-y-4 pt-4">
                    <FormField control={editForm.control} name="role" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Função</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                    <SelectItem value="bride">Noiva</SelectItem>
                                    <SelectItem value="groom">Noivo</SelectItem>
                                    <SelectItem value="collaborator">Colaborador</SelectItem>
                                    <SelectItem value="guest">Convidado</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                     )} />
                     <FormField
                        control={editForm.control}
                        name="weddingIds"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Casamentos Atribuídos</FormLabel>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between font-normal">
                                            <span>
                                                {field.value?.length ? `${field.value.length} selecionado(s)` : "Selecione os casamentos"}
                                            </span>
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[340px] sm:w-[460px]">
                                    {weddings.map(w => (
                                        <DropdownMenuCheckboxItem
                                            key={w.id}
                                            checked={field.value?.includes(w.id!)}
                                            onCheckedChange={(checked) => {
                                                const currentIds = field.value || [];
                                                const newIds = checked
                                                  ? [...currentIds, w.id!]
                                                  : currentIds.filter(id => id !== w.id);
                                                field.onChange(newIds);
                                            }}
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                        {w.brideName} & {w.groomName}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
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
              <DialogTitle>Convidar Novo Usuário</DialogTitle>
              <DialogDescription>
                Crie um passe de acesso para um novo usuário. Ele precisará se cadastrar com o mesmo e-mail para ativar a conta.
              </DialogDescription>
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
                    <FormField control={inviteForm.control} name="weddingId" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Atribuir Casamento (Opcional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um casamento"/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value={UNASSIGNED_VALUE}>Nenhum</SelectItem>
                                    {weddings.map(w => (
                                        <SelectItem key={w.id} value={w.id!}>{w.brideName} & {w.groomName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                     )} />
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
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
