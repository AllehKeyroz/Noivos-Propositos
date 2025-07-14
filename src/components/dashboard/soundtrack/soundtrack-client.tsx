'use client';

import * as React from 'react';
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
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWedding } from '@/context/wedding-context';
import { useToast } from '@/hooks/use-toast';
import { triggerWebhook } from '@/app/actions/webhook-actions';
import type { PlaylistItem } from '@/lib/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Edit, Trash2, PlayCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

const playlistItemFormSchema = z.object({
  title: z.string().min(2, { message: 'O título deve ter pelo menos 2 caracteres.' }),
  artist: z.string().min(2, { message: 'O nome do artista deve ter pelo menos 2 caracteres.' }),
  suggestedBy: z.string().min(2, { message: 'O nome de quem sugeriu é obrigatório.' }),
  youtubeUrl: z.string().url({ message: 'Por favor, insira um link do YouTube válido.' }),
});

function getYoutubeVideoId(url: string) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.slice(1);
        }
        if (urlObj.hostname.includes('youtube.com')) {
            return urlObj.searchParams.get('v');
        }
        return null;
    } catch (e) {
        return null;
    }
}

export default function SoundtrackClient() {
  const { toast } = useToast();
  const { activeWeddingId, loading, userProfile, playlist } = useWedding();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  const isGuest = userProfile?.role === 'guest';

  const form = useForm<z.infer<typeof playlistItemFormSchema>>({
    resolver: zodResolver(playlistItemFormSchema),
    defaultValues: { title: '', artist: '', suggestedBy: userProfile?.name || '', youtubeUrl: '' },
  });

  useEffect(() => {
    if (editingItem) {
        form.reset(editingItem);
    } else {
        form.reset({ title: '', artist: '', suggestedBy: userProfile?.name || '', youtubeUrl: '' });
    }
  }, [editingItem, form, isFormOpen, userProfile]);
  
  const sortedPlaylist = useMemo(() => {
    return [...playlist].sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
  }, [playlist]);

  const handleFormSubmit = async (values: z.infer<typeof playlistItemFormSchema>) => {
    if (!activeWeddingId) return;
    if (!getYoutubeVideoId(values.youtubeUrl)) {
        toast({ title: 'Erro', description: 'O link do YouTube fornecido não é válido.', variant: 'destructive' });
        return;
    }

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'weddings', activeWeddingId, 'playlist', editingItem.id), values);
        toast({ title: 'Sucesso', description: 'Música atualizada.' });
      } else {
        const dataToSave = { 
            ...values,
            upvotes: 0,
            downvotes: 0,
            voters: [],
            createdAt: serverTimestamp() 
        };
        await addDoc(collection(db, 'weddings', activeWeddingId, 'playlist'), dataToSave);
        toast({ title: 'Sucesso', description: 'Música adicionada à playlist.' });
        triggerWebhook(activeWeddingId, 'songSuggested', { title: values.title, artist: values.artist, suggestedBy: values.suggestedBy });
      }
      setIsFormOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar a música.', variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!activeWeddingId) return;
    try {
      await deleteDoc(doc(db, 'weddings', activeWeddingId, 'playlist', itemId));
      toast({ title: 'Sucesso', description: 'Música removida.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover a música.', variant: 'destructive' });
    }
  };
  
  const handleVote = async (itemId: string, voteType: 'up' | 'down') => {
      if (!userProfile || !activeWeddingId) return;
      const itemRef = doc(db, 'weddings', activeWeddingId, 'playlist', itemId);

      try {
        await runTransaction(db, async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) { throw "Música não encontrada."; }
            
            const data = itemDoc.data();
            const voters = data.voters || [];

            if (voters.includes(userProfile.id)) {
                toast({ title: "Voto já computado", description: "Você já votou nesta música." });
                return;
            }

            const newVoters = [...voters, userProfile.id];
            const newUpvotes = data.upvotes + (voteType === 'up' ? 1 : 0);
            const newDownvotes = data.downvotes + (voteType === 'down' ? 1 : 0);
            
            transaction.update(itemRef, { upvotes: newUpvotes, downvotes: newDownvotes, voters: newVoters });
        });
      } catch (error) {
          toast({ title: "Erro ao Votar", description: "Não foi possível registrar seu voto. Tente novamente.", variant: 'destructive'});
          console.error("Vote transaction failed: ", error);
      }
  };

  const togglePlay = (itemId: string) => {
    setCurrentlyPlayingId(prevId => (prevId === itemId ? null : itemId));
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!activeWeddingId) {
    return <div className="text-center p-8 bg-card rounded-lg">Por favor, selecione um casamento para ver a trilha sonora.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2" />
          Sugerir Música
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nossa Playlist Colaborativa</CardTitle>
          <CardDescription>As músicas mais votadas têm mais chance de tocar!</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[8%]">Tocar</TableHead>
                <TableHead className="w-[35%]">Música</TableHead>
                <TableHead>Sugerido por</TableHead>
                <TableHead>Votos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlaylist.length > 0 ? sortedPlaylist.map(item => (
                <React.Fragment key={item.id}>
                  <TableRow className={cn(currentlyPlayingId === item.id && 'bg-muted')}>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => togglePlay(item.id)}>
                        <PlayCircle className="h-6 w-6" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.artist}</div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{item.suggestedBy}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg">{item.upvotes - item.downvotes}</span>
                        <div className="flex items-center gap-2">
                           <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-600 disabled:text-muted-foreground" disabled={item.voters?.includes(userProfile?.id || '')} onClick={() => handleVote(item.id, 'up')}>
                                <ThumbsUp className="h-4 w-4"/>
                           </Button>
                           <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 disabled:text-muted-foreground" disabled={item.voters?.includes(userProfile?.id || '')} onClick={() => handleVote(item.id, 'down')}>
                                <ThumbsDown className="h-4 w-4"/>
                           </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {!isGuest && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Remover música?</AlertDialogTitle><AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Remover</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  {currentlyPlayingId === item.id && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <div className="aspect-video bg-black">
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${getYoutubeVideoId(item.youtubeUrl)}?autoplay=1&modestbranding=1`}
                            title={item.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          ></iframe>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Nenhuma música na playlist ainda. Que tal sugerir a primeira?</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Editar Música' : 'Sugerir uma Música'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título da Música</FormLabel><FormControl><Input placeholder="Ex: Perfect" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="artist" render={({ field }) => (
                <FormItem><FormLabel>Artista</FormLabel><FormControl><Input placeholder="Ex: Ed Sheeran" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="suggestedBy" render={({ field }) => (
                <FormItem><FormLabel>Sugerido por</FormLabel><FormControl><Input placeholder="Ex: Noiva" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="youtubeUrl" render={({ field }) => (
                <FormItem><FormLabel>Link do YouTube</FormLabel><FormControl><Input placeholder="https://www.youtube.com/watch?v=..." {...field} /></FormControl><FormMessage /></FormItem>
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
