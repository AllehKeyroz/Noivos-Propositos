'use client';

import { useState, useEffect } from 'react';
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
  writeBatch,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWedding } from '@/context/wedding-context';
import { useToast } from '@/hooks/use-toast';
import type { HomeTrousseauItem, HomeTrousseauCategory, HomeTrousseauItemStatus } from '@/lib/types';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDesc, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, PlusCircle, Edit, Trash2, Link as LinkIcon, CheckCircle2, Gift, ShoppingCart, ImagePlus } from 'lucide-react';
import ImageUploader from '@/components/ui/image-uploader';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageSearchDialog from '../inspirations/image-search-dialog';


const categoryFormSchema = z.object({
  name: z.string().min(3, { message: "O nome da categoria deve ter pelo menos 3 caracteres." }),
});

const itemFormSchema = z.object({
  name: z.string().min(2, { message: "O nome do item é obrigatório." }),
  notes: z.string().optional(),
  link: z.string().url({ message: "Por favor, insira um URL válido." }).optional().or(z.literal('')),
  imageUrl: z.string().optional(),
  status: z.enum(['needed', 'have', 'gifted']),
  categoryId: z.string(),
});

const itemStatusDisplay: Record<HomeTrousseauItemStatus, string> = {
  needed: 'Precisamos',
  have: 'Já temos',
  gifted: 'Ganhamos',
};

const itemStatusColors: Record<HomeTrousseauItemStatus, string> = {
  needed: 'border-amber-500 bg-amber-50 text-amber-700',
  have: 'border-blue-500 bg-blue-50 text-blue-700',
  gifted: 'border-green-500 bg-green-50 text-green-700',
};

const itemStatusIcons: Record<HomeTrousseauItemStatus, React.ElementType> = {
  needed: ShoppingCart,
  have: CheckCircle2,
  gifted: Gift,
};


const EmptyState = ({ onAddCategory }: { onAddCategory: () => void }) => (
    <Card className="text-center py-12 border-dashed">
        <CardContent>
            <h3 className="text-lg font-semibold">Seu enxoval está vazio.</h3>
            <p className="text-muted-foreground mt-1 mb-4">Crie sua primeira categoria (ex: Cozinha) para começar a adicionar itens.</p>
            <Button onClick={onAddCategory}>
                <PlusCircle className="mr-2" />
                Criar Categoria
            </Button>
        </CardContent>
    </Card>
);

export default function HomeTrousseauClient() {
  const { toast } = useToast();
  const { activeWeddingId, loading, homeTrousseauCategories, homeTrousseauItems } = useWedding();
  
  // Dialog State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HomeTrousseauCategory | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HomeTrousseauItem | null>(null);
  
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);

  // Forms
  const categoryForm = useForm<z.infer<typeof categoryFormSchema>>({ resolver: zodResolver(categoryFormSchema), defaultValues: { name: '' } });
  const itemForm = useForm<z.infer<typeof itemFormSchema>>({ resolver: zodResolver(itemFormSchema), defaultValues: { name: '', notes: '', imageUrl: '', categoryId: '', link: '', status: 'needed' } });

  useEffect(() => {
    if (homeTrousseauCategories.length > 0 && !activeTab) {
      setActiveTab(homeTrousseauCategories[0].id);
    }
  }, [homeTrousseauCategories, activeTab]);

  useEffect(() => {
    if (editingCategory) categoryForm.reset({ name: editingCategory.name });
  }, [editingCategory, categoryForm]);

  useEffect(() => {
    if (editingItem) {
      itemForm.reset({ 
        name: editingItem.name,
        notes: editingItem.notes, 
        imageUrl: editingItem.imageUrl, 
        categoryId: editingItem.categoryId, 
        link: editingItem.link || '',
        status: editingItem.status,
      });
    }
  }, [editingItem, itemForm]);

  // --- Category Actions ---
  const handleCategorySubmit = async (values: z.infer<typeof categoryFormSchema>) => {
    if (!activeWeddingId) return;
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'weddings', activeWeddingId, 'homeTrousseauCategories', editingCategory.id), { name: values.name });
        toast({ title: 'Sucesso', description: 'Categoria atualizada.' });
      } else {
        const newDoc = await addDoc(collection(db, 'weddings', activeWeddingId, 'homeTrousseauCategories'), { ...values, createdAt: serverTimestamp() });
        toast({ title: 'Sucesso', description: 'Categoria criada.' });
        setActiveTab(newDoc.id);
      }
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    } catch (e) { toast({ title: 'Erro', description: 'Não foi possível salvar a categoria.', variant: 'destructive' }) }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!activeWeddingId) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, 'weddings', activeWeddingId, 'homeTrousseauCategories', categoryId));
    const itemsToDeleteQuery = query(collection(db, 'weddings', activeWeddingId, 'homeTrousseauItems'), where('categoryId', '==', categoryId));
    const itemsSnapshot = await getDocs(itemsToDeleteQuery);
    itemsSnapshot.forEach(d => batch.delete(d.ref));
    await batch.commit();
    toast({ title: 'Sucesso', description: 'Categoria e todos os seus itens foram removidos.' });
    if (activeTab === categoryId) {
        setActiveTab(homeTrousseauCategories[0]?.id || null);
    }
  };

  // --- Item Actions ---
  const handleItemSubmit = async (values: z.infer<typeof itemFormSchema>) => {
    if (!activeWeddingId) return;
    try {
      const dataToSave = { ...values, link: values.link || null, imageUrl: values.imageUrl || null };
      if (editingItem) {
        await updateDoc(doc(db, 'weddings', activeWeddingId, 'homeTrousseauItems', editingItem.id), dataToSave);
        toast({ title: 'Sucesso', description: 'Item atualizado.' });
      } else {
        await addDoc(collection(db, 'weddings', activeWeddingId, 'homeTrousseauItems'), { ...dataToSave, createdAt: serverTimestamp() });
        toast({ title: 'Sucesso', description: 'Item adicionado ao enxoval.' });
      }
      setIsItemDialogOpen(false);
      setEditingItem(null);
    } catch (e) { toast({ title: 'Erro', description: 'Não foi possível salvar o item.', variant: 'destructive' }) }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!activeWeddingId) return;
    await deleteDoc(doc(db, 'weddings', activeWeddingId, 'homeTrousseauItems', itemId));
    toast({ title: 'Sucesso', description: 'Item removido.' });
  };
  
  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!activeWeddingId) return <div className="text-center p-8 bg-card rounded-lg">Por favor, selecione um casamento.</div>;

  return (
    <div className="space-y-6">
      {homeTrousseauCategories.length === 0 ? (
        <EmptyState onAddCategory={() => { setEditingCategory(null); categoryForm.reset(); setIsCategoryDialogOpen(true); }} />
      ) : (
        <Tabs value={activeTab || ""} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
              <TabsList className="overflow-x-auto overflow-y-hidden">
                {homeTrousseauCategories.map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
                ))}
              </TabsList>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={() => { setEditingCategory(null); categoryForm.reset(); setIsCategoryDialogOpen(true); }}>
                     Gerenciar Categorias
                </Button>
                 <Button onClick={() => { setEditingItem(null); itemForm.reset({ categoryId: activeTab || '', name: '', notes: '', link: '', imageUrl: '', status: 'needed' }); setIsItemDialogOpen(true); }}>
                    <PlusCircle className="mr-2" /> Adicionar Item
                  </Button>
              </div>
            </div>
            {homeTrousseauCategories.map(cat => (
              <TabsContent key={cat.id} value={cat.id} className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {homeTrousseauItems.filter(i => i.categoryId === cat.id).map(item => {
                    const StatusIcon = itemStatusIcons[item.status];
                    return (
                        <Card key={item.id} className="group flex flex-col">
                            {item.imageUrl && (
                                <div className="relative w-full aspect-video rounded-t-lg overflow-hidden bg-muted">
                                    <Image src={item.imageUrl} alt={item.name} layout="fill" className="object-cover" data-ai-hint="household item"/>
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle>{item.name}</CardTitle>
                                {item.notes && <CardDescription>{item.notes}</CardDescription>}
                            </CardHeader>
                            <CardContent className="flex-1"></CardContent>
                            <CardFooter className="flex justify-between items-center">
                                 <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", itemStatusColors[item.status])}>
                                    <StatusIcon className="h-4 w-4"/>
                                    {itemStatusDisplay[item.status]}
                                </div>
                                <div className="flex items-center gap-1">
                                    {item.link && (
                                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                                          <Button variant="ghost" size="icon" className="h-8 w-8"><LinkIcon className="h-4 w-4"/></Button>
                                      </a>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setIsItemDialogOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Remover Item?</AlertDialogTitle><AlertDialogDesc>Tem certeza que deseja remover "{item.name}" da lista?</AlertDialogDesc></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Remover</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardFooter>
                        </Card>
                    )
                  })}
                </div>
              </TabsContent>
            ))}
        </Tabs>
      )}

      {/* Category Management Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Gerenciar Categorias de Itens</DialogTitle></DialogHeader>
              <div className="space-y-2 py-4 max-h-60 overflow-y-auto">
              {homeTrousseauCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                    <p>{cat.name}</p>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); }}><Edit className="h-4 w-4"/></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Remover "{cat.name}"?</AlertDialogTitle><AlertDialogDesc>Todos os itens nesta categoria serão perdidos.</AlertDialogDesc></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>Remover</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </div>
                </div>
              ))}
              </div>
              <Form {...categoryForm}>
                  <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-4 border-t pt-4">
                      <FormField control={categoryForm.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>{editingCategory ? `Renomear "${editingCategory.name}"` : 'Nova Categoria'}</FormLabel><FormControl><Input placeholder="Ex: Cozinha, Sala de Estar..." {...field} /></FormControl><FormMessage/></FormItem>
                      )}/>
                      <DialogFooter>
                          <Button type="button" variant="ghost" onClick={() => {setEditingCategory(null); categoryForm.reset()}}>Limpar</Button>
                          <Button type="submit">{editingCategory ? 'Salvar' : 'Adicionar'}</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
      
      {/* Item Form Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item para o Enxoval'}</DialogTitle></DialogHeader>
              <Form {...itemForm}>
                  <form onSubmit={itemForm.handleSubmit(handleItemSubmit)} className="space-y-4">
                    {itemForm.watch('imageUrl') && (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                            <Image src={itemForm.getValues('imageUrl')!} alt="Prévia" layout="fill" className="object-cover" />
                        </div>
                    )}
                    <Button type="button" variant="outline" className="w-full" onClick={() => setIsImageSearchOpen(true)}>
                        <ImagePlus className="mr-2" />
                        {itemForm.watch('imageUrl') ? 'Trocar Imagem de Referência' : 'Buscar Imagem de Referência'}
                    </Button>
                    <FormField control={itemForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome do Item</FormLabel><FormControl><Input placeholder="Ex: Geladeira Frost Free" {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField control={itemForm.control} name="status" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                  <SelectContent>
                                      <SelectItem value="needed">Precisamos</SelectItem>
                                      <SelectItem value="have">Já temos</SelectItem>
                                      <SelectItem value="gifted">Ganhamos</SelectItem>
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                       )} />
                        <FormField control={itemForm.control} name="link" render={({ field }) => (
                            <FormItem><FormLabel>Link de Referência (Opcional)</FormLabel><FormControl><Input placeholder="https://loja.com/produto" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <FormField control={itemForm.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Detalhes como cor, modelo, voltagem, etc." {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <DialogFooter><DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose><Button type="submit">Salvar Item</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
      
      <ImageSearchDialog
        isOpen={isImageSearchOpen}
        onClose={() => setIsImageSearchOpen(false)}
        onImageSelect={(imageUrl) => {
          itemForm.setValue('imageUrl', imageUrl, { shouldDirty: true });
          setIsImageSearchOpen(false);
        }}
      />
    </div>
  );
}
