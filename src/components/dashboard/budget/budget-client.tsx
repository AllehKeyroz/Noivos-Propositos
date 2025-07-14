
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWedding } from '@/context/wedding-context';
import { useToast } from '@/hooks/use-toast';
import { triggerWebhook } from '@/app/actions/webhook-actions';
import type { BudgetCategory, BudgetItem, BudgetItemStatus, WeddingData } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Edit, PiggyBank, ListChecks, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const itemStatusDisplay: Record<BudgetItemStatus, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  parcial: 'Pagamento Parcial',
};

const itemStatusColors: Record<BudgetItemStatus, string> = {
  pendente: 'bg-amber-500/80 border-amber-500',
  pago: 'bg-green-500/80 border-green-500',
  parcial: 'bg-sky-500/80 border-sky-500',
};

const budgetItemFormSchema = z.object({
  description: z.string().min(3, { message: 'A descrição deve ter pelo menos 3 caracteres.' }),
  supplier: z.string().optional(),
  estimatedCost: z.coerce.number().min(0, { message: 'O custo estimado deve ser positivo.' }),
  actualCost: z.coerce.number().min(0, { message: 'O custo final deve ser positivo.' }),
  status: z.enum(['pendente', 'pago', 'parcial']),
});

const totalBudgetFormSchema = z.object({
  totalBudget: z.coerce.number().min(0, { message: 'O orçamento deve ser um valor positivo.' }),
});

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string, icon: React.ElementType, description?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

const BudgetSummary = ({ weddingData, items, activeWeddingId, toast }: { weddingData: WeddingData | null, items: BudgetItem[], activeWeddingId: string, toast: any }) => {
    const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
    const form = useForm<z.infer<typeof totalBudgetFormSchema>>({
        resolver: zodResolver(totalBudgetFormSchema),
        defaultValues: { totalBudget: weddingData?.totalBudget || 0 },
    });
    
    useEffect(() => {
        form.reset({ totalBudget: weddingData?.totalBudget || 0 });
    }, [weddingData, form]);

    const { totalActual, totalEstimated } = useMemo(() => {
        return items.reduce((acc, item) => {
            acc.totalActual += item.actualCost;
            acc.totalEstimated += item.estimatedCost;
            return acc;
        }, { totalActual: 0, totalEstimated: 0 });
    }, [items]);

    const totalBudget = weddingData?.totalBudget || 0;
    
    const handleTotalBudgetSubmit = async (values: z.infer<typeof totalBudgetFormSchema>) => {
        const weddingDocRef = doc(db, 'weddings', activeWeddingId);
        try {
            await updateDoc(weddingDocRef, { totalBudget: values.totalBudget });
            toast({ title: 'Sucesso!', description: 'Orçamento total atualizado.' });
            setIsBudgetDialogOpen(false);
        } catch (error) {
            toast({ title: 'Erro', description: 'Não foi possível atualizar o orçamento.', variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="font-headline text-2xl">Visão Geral Financeira</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsBudgetDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Definir Orçamento Total
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="Orçamento Total" value={formatCurrency(totalBudget)} icon={PiggyBank} description="O valor máximo que vocês planejam gastar." />
                    <StatCard title="Gasto Previsto" value={formatCurrency(totalEstimated)} icon={ListChecks} description="A soma de todos os custos estimados." />
                    <StatCard title="Gasto Real" value={formatCurrency(totalActual)} icon={Landmark} description="O valor total que já foi pago." />
                </div>
            </CardContent>

             <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Orçamento Total</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleTotalBudgetSubmit)} className="space-y-4 pt-4">
                            <FormField control={form.control} name="totalBudget" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor Total do Orçamento (R$)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="Ex: 50000.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
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
        </Card>
    );
};


export default function BudgetClient() {
  const { toast } = useToast();
  const { activeWeddingId, loading, budgetCategories: categories, budgetItems: items, weddingData } = useWedding();

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof budgetItemFormSchema>>({
    resolver: zodResolver(budgetItemFormSchema),
    defaultValues: {
      description: '',
      supplier: '',
      estimatedCost: 0,
      actualCost: 0,
      status: 'pendente',
    },
  });

  useEffect(() => {
    if (editingItem) {
        form.reset({
            description: editingItem.description,
            supplier: editingItem.supplier,
            estimatedCost: editingItem.estimatedCost,
            actualCost: editingItem.actualCost,
            status: editingItem.status,
        });
    } else {
        form.reset({ description: '', supplier: '', estimatedCost: 0, actualCost: 0, status: 'pendente' });
    }
  }, [editingItem, form, isItemDialogOpen])

  const handleAddCategory = async () => {
    if (!activeWeddingId || !newCategoryName.trim()) return;
    try {
      await addDoc(collection(db, 'weddings', activeWeddingId, 'budgetCategories'), {
        name: newCategoryName,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Sucesso', description: 'Categoria adicionada.' });
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível adicionar a categoria.', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!activeWeddingId) return;
    try {
      const batch = writeBatch(db);
      const categoryDocRef = doc(db, 'weddings', activeWeddingId, 'budgetCategories', categoryId);
      batch.delete(categoryDocRef);
      const itemsQuery = query(collection(db, 'weddings', activeWeddingId, 'budgetItems'), where('categoryId', '==', categoryId));
      const itemsSnapshot = await getDocs(itemsQuery);
      itemsSnapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      toast({ title: 'Sucesso', description: 'Categoria e seus itens foram removidos.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover a categoria.', variant: 'destructive' });
    }
  };
  
  const handleItemSubmit = async (values: z.infer<typeof budgetItemFormSchema>) => {
    if (!activeWeddingId) return;
    
    try {
        if (editingItem) {
            const itemDocRef = doc(db, 'weddings', activeWeddingId, 'budgetItems', editingItem.id);
            await updateDoc(itemDocRef, values);
            toast({ title: 'Sucesso', description: 'Item atualizado.' });
        } else if (selectedCategoryId) {
            await addDoc(collection(db, 'weddings', activeWeddingId, 'budgetItems'), {
                ...values,
                categoryId: selectedCategoryId,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Sucesso', description: 'Item adicionado.' });
            triggerWebhook(activeWeddingId, 'budgetItemAdded', {
                description: values.description,
                supplier: values.supplier,
                estimatedCost: values.estimatedCost,
                actualCost: values.actualCost
            });
        }
        closeItemDialog();
    } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível salvar o item.', variant: 'destructive' });
    }
  };
  
  const handleDeleteItem = async (itemId: string) => {
    if (!activeWeddingId) return;
    try {
        await deleteDoc(doc(db, 'weddings', activeWeddingId, 'budgetItems', itemId));
        toast({ title: 'Sucesso', description: 'Item removido.' });
    } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível remover o item.', variant: 'destructive' });
    }
  };

  const openAddItemDialog = (categoryId: string) => {
    setEditingItem(null);
    setSelectedCategoryId(categoryId);
    setIsItemDialogOpen(true);
  };

  const openEditItemDialog = (item: BudgetItem) => {
    setSelectedCategoryId(item.categoryId);
    setEditingItem(item);
    setIsItemDialogOpen(true);
  }

  const closeItemDialog = () => {
    setEditingItem(null);
    setSelectedCategoryId(null);
    setIsItemDialogOpen(false);
  }
  
  
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!activeWeddingId) {
    return <div className="text-center p-8 bg-card rounded-lg">Por favor, selecione um casamento para gerenciar o orçamento.</div>;
  }

  return (
    <div className="space-y-6">
        <BudgetSummary weddingData={weddingData} items={items} activeWeddingId={activeWeddingId} toast={toast} />

      <div className="flex justify-end">
        <Button onClick={() => setIsCategoryDialogOpen(true)}>
          <PlusCircle className="mr-2"/>
          Adicionar Categoria de Despesa
        </Button>
      </div>

      {categories.length > 0 ? (
        <Accordion type="multiple" className="w-full space-y-4">
          {categories.map((category) => (
            <AccordionItem value={category.id} key={category.id} className="bg-card border-none rounded-lg shadow-sm">
                <div className="flex items-center w-full">
                    <AccordionTrigger className="flex-1 px-6 py-4 hover:no-underline font-headline text-xl text-primary justify-start text-left">
                        {category.name}
                    </AccordionTrigger>
                    <div className="pr-4 flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openAddItemDialog(category.id); }}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Novo Item
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Isso removerá a categoria e todos os itens dentro dela. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>Remover</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
              <AccordionContent className="px-1 pb-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30%]">Item / Fornecedor</TableHead>
                            <TableHead>Orçado</TableHead>
                            <TableHead>Gasto</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.filter(i => i.categoryId === category.id).map(item => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div className="font-medium">{item.description}</div>
                                    <div className="text-sm text-muted-foreground">{item.supplier}</div>
                                </TableCell>
                                <TableCell>{formatCurrency(item.estimatedCost)}</TableCell>
                                <TableCell>
                                    {formatCurrency(item.actualCost)}
                                    <Progress value={(item.actualCost / (item.estimatedCost || 1)) * 100} className="h-2 mt-1" />
                                </TableCell>
                                <TableCell>
                                    <span className={cn('px-2 py-1 text-xs font-semibold text-white rounded-full border', itemStatusColors[item.status])}>
                                        {itemStatusDisplay[item.status]}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                     <Button variant="ghost" size="icon" onClick={() => openEditItemDialog(item)}>
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
                                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                                <AlertDialogDescription>Esta ação removerá o item permanentemente.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Remover</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card className="text-center py-12 border-dashed">
            <CardContent>
                <h3 className="text-lg font-semibold">Comece seu planejamento financeiro!</h3>
                <p className="text-muted-foreground mt-1 mb-4">Crie sua primeira categoria para adicionar despesas.</p>
            </CardContent>
        </Card>
      )}

      {/* Add Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Nova Categoria Financeira</DialogTitle></DialogHeader>
              <Input 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Recepção, Decoração, etc."
              />
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
                <Button onClick={handleAddCategory}>Salvar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      {/* Add/Edit Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={closeItemDialog}>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item Financeiro'}</DialogTitle></DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleItemSubmit)} className="space-y-4">
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Descrição</FormLabel><FormControl><Input placeholder="Ex: Aluguel do salão" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="supplier" render={({ field }) => (
                        <FormItem><FormLabel>Fornecedor</FormLabel><FormControl><Input placeholder="Ex: Salão de Festas & Cia" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="estimatedCost" render={({ field }) => (
                            <FormItem><FormLabel>Custo Estimado</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="actualCost" render={({ field }) => (
                            <FormItem><FormLabel>Custo Final / Pago</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                     <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um status" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {Object.entries(itemStatusDisplay).map(([key, value]) => (
                                        <SelectItem key={key} value={key}>{value}</SelectItem>
                                    ))}
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
    </div>
  );
}
