'use client';

import { useState } from 'react';
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
import type { Task } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PlannerClient() {
  const { toast } = useToast();
  const { activeWeddingId, loading, tasks, taskCategories: categories } = useWedding();
  
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const handleAddCategory = async () => {
    if (!activeWeddingId || !newCategoryName.trim()) return;
    try {
      await addDoc(collection(db, 'weddings', activeWeddingId, 'taskCategories'), {
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
        
        const categoryDocRef = doc(db, 'weddings', activeWeddingId, 'taskCategories', categoryId);
        batch.delete(categoryDocRef);

        const tasksQuery = query(collection(db, 'weddings', activeWeddingId, 'tasks'), where('categoryId', '==', categoryId));
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        toast({ title: 'Sucesso', description: 'Categoria e suas tarefas foram removidas.' });
    } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível remover a categoria.', variant: 'destructive' });
    }
  };

  const openAddTaskDialog = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setIsTaskDialogOpen(true);
  }

  const handleAddTask = async () => {
    if (!activeWeddingId || !newTaskText.trim() || !selectedCategoryId) return;
    try {
      await addDoc(collection(db, 'weddings', activeWeddingId, 'tasks'), {
        text: newTaskText,
        categoryId: selectedCategoryId,
        completed: false,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Sucesso', description: 'Tarefa adicionada.' });
      setNewTaskText('');
      setIsTaskDialogOpen(false);
      setSelectedCategoryId(null);
    } catch (error) {
       toast({ title: 'Erro', description: 'Não foi possível adicionar a tarefa.', variant: 'destructive' });
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (!activeWeddingId) return;
    const taskDocRef = doc(db, 'weddings', activeWeddingId, 'tasks', task.id);
    const newCompletedStatus = !task.completed;
    try {
        await updateDoc(taskDocRef, { completed: newCompletedStatus });
        if (newCompletedStatus) {
            triggerWebhook(activeWeddingId, 'taskCompleted', { taskText: task.text, completed: true });
        }
    } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível atualizar a tarefa.', variant: 'destructive' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeWeddingId) return;
    const taskDocRef = doc(db, 'weddings', activeWeddingId, 'tasks', taskId);
     try {
        await deleteDoc(taskDocRef);
        toast({ title: 'Sucesso', description: 'Tarefa removida.' });
    } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível remover a tarefa.', variant: 'destructive' });
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!activeWeddingId) {
    return <div className="text-center p-8 bg-card rounded-lg">Por favor, selecione um casamento para ver o planejador.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsCategoryDialogOpen(true)}>
          <PlusCircle className="mr-2"/>
          Adicionar Categoria
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
                    <div className="pr-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Isso removerá a categoria e todas as tarefas dentro dela. Esta ação não pode ser desfeita.
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
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-3">
                   {tasks.filter(t => t.categoryId === category.id).map((task) => (
                       <div key={task.id} className="flex items-center gap-3 p-3 bg-background rounded-md">
                           <Checkbox id={task.id} checked={task.completed} onCheckedChange={() => handleToggleTask(task)} />
                           <label htmlFor={task.id} className={`flex-1 text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                               {task.text}
                           </label>
                           <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                               <Trash2 className="h-4 w-4" />
                           </Button>
                       </div>
                   ))}
                   <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => openAddTaskDialog(category.id)}>
                       <PlusCircle className="mr-2"/>
                       Nova Tarefa
                   </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card className="text-center py-12 border-dashed">
            <CardContent>
                <h3 className="text-lg font-semibold">Comece a planejar!</h3>
                <p className="text-muted-foreground mt-1 mb-4">Crie sua primeira categoria para adicionar tarefas.</p>
            </CardContent>
        </Card>
      )}

      {/* Add Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
              <Input 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Fornecedores, Documentos, etc."
              />
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
                <Button onClick={handleAddCategory}>Salvar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      {/* Add Task Dialog */}
       <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
              <Input 
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Ex: Contratar fotógrafo"
              />
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost" onClick={() => setNewTaskText('')}>Cancelar</Button></DialogClose>
                <Button onClick={handleAddTask}>Adicionar Tarefa</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
