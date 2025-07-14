'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWedding } from '@/context/wedding-context';
import { useToast } from '@/hooks/use-toast';
import { generateApiToken } from '@/app/actions/webhook-actions';
import type { ApiToken, WebhookEndpoint, WebhookLog } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDesc, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, PlusCircle, Trash2, KeyRound, Copy, Check, Webhook, FileText, Edit, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const webhookEndpointSchema = z.object({
  name: z.string().min(2, { message: "O nome é obrigatório."}),
  url: z.string().url({ message: "Por favor, insira um URL válido." }),
  isActive: z.boolean(),
  events: z.object({
    guestRsvp: z.boolean(),
    taskCompleted: z.boolean(),
    budgetItemAdded: z.boolean(),
    giftReceived: z.boolean(),
    songSuggested: z.boolean(),
  })
});

const apiTokenSchema = z.object({
  name: z.string().min(2, "O nome do token deve ter pelo menos 2 caracteres."),
});

const eventDescriptions = {
  guestRsvp: "Um convidado confirma ou recusa presença",
  taskCompleted: "Uma tarefa é marcada como concluída",
  budgetItemAdded: "Uma nova despesa é adicionada ao orçamento",
  giftReceived: "Um presente é registrado no Mural do Carinho",
  songSuggested: "Uma nova música é sugerida na Trilha Sonora",
};

export default function IntegrationsClient() {
  const { toast } = useToast();
  const { activeWeddingId, loading: weddingLoading } = useWedding();
  
  // State for API Tokens
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // State for Webhook Endpoints
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(true);
  const [isEndpointDialogOpen, setIsEndpointDialogOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpoint | null>(null);

  // State for Logs
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedEndpointForLogs, setSelectedEndpointForLogs] = useState<WebhookEndpoint | null>(null);

  const endpointForm = useForm<z.infer<typeof webhookEndpointSchema>>({
    resolver: zodResolver(webhookEndpointSchema),
    defaultValues: {
      name: '',
      url: '',
      isActive: true,
      events: {
        guestRsvp: false,
        taskCompleted: false,
        budgetItemAdded: false,
        giftReceived: false,
        songSuggested: false,
      }
    }
  });
  
  const tokenForm = useForm<z.infer<typeof apiTokenSchema>>({
    resolver: zodResolver(apiTokenSchema),
    defaultValues: { name: '' },
  });
  
  useEffect(() => {
    if (!activeWeddingId) {
        setIsLoadingEndpoints(false);
        setIsLoadingTokens(false);
        return;
    };
    
    setIsLoadingEndpoints(true);
    const endpointsQuery = query(collection(db, 'weddings', activeWeddingId, 'webhooks'), orderBy('createdAt', 'desc'));
    const unsubscribeEndpoints = onSnapshot(endpointsQuery, (snapshot) => {
      const endpointsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WebhookEndpoint));
      setEndpoints(endpointsData);
      setIsLoadingEndpoints(false);
    });

    setIsLoadingTokens(true);
    const tokensQuery = query(collection(db, 'weddings', activeWeddingId, 'apiTokens'), orderBy('createdAt', 'desc'));
    const unsubscribeTokens = onSnapshot(tokensQuery, (snapshot) => {
      const tokensData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiToken));
      setTokens(tokensData);
      setIsLoadingTokens(false);
    });
    
    return () => {
        unsubscribeEndpoints();
        unsubscribeTokens();
    };
  }, [activeWeddingId]);

  useEffect(() => {
    if (editingEndpoint) {
        endpointForm.reset(editingEndpoint);
    } else {
        endpointForm.reset({
          name: '',
          url: '',
          isActive: true,
          events: { guestRsvp: false, taskCompleted: false, budgetItemAdded: false, giftReceived: false, songSuggested: false }
        });
    }
  }, [editingEndpoint, isEndpointDialogOpen, endpointForm]);

  useEffect(() => {
    if (!selectedEndpointForLogs) return;

    setIsLoadingLogs(true);
    const logsQuery = query(collection(db, 'weddings', activeWeddingId!, 'webhooks', selectedEndpointForLogs.id, 'logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
        const logsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WebhookLog));
        setLogs(logsData);
        setIsLoadingLogs(false);
    });
    return () => unsubscribe();
  }, [selectedEndpointForLogs, activeWeddingId]);
  
  
  const handleEndpointSubmit = async (values: z.infer<typeof webhookEndpointSchema>) => {
    if (!activeWeddingId) return;
    try {
      if (editingEndpoint) {
        await updateDoc(doc(db, 'weddings', activeWeddingId, 'webhooks', editingEndpoint.id), values);
        toast({ title: 'Sucesso!', description: 'Endpoint atualizado.' });
      } else {
        await addDoc(collection(db, 'weddings', activeWeddingId, 'webhooks'), { ...values, createdAt: serverTimestamp() });
        toast({ title: 'Sucesso!', description: 'Endpoint de webhook criado.' });
      }
      setIsEndpointDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar o endpoint.', variant: 'destructive' });
    }
  };
   const handleDeleteEndpoint = async (endpointId: string) => {
    if (!activeWeddingId) return;
    try {
      await deleteDoc(doc(db, 'weddings', activeWeddingId, 'webhooks', endpointId));
      toast({ title: 'Sucesso', description: 'Endpoint removido.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover o endpoint.', variant: 'destructive' });
    }
  };
   const handleToggleActive = async (endpoint: WebhookEndpoint) => {
    if (!activeWeddingId) return;
    try {
      const endpointRef = doc(db, 'weddings', activeWeddingId, 'webhooks', endpoint.id);
      await updateDoc(endpointRef, { isActive: !endpoint.isActive });
    } catch(error) {
        toast({ title: 'Erro', description: 'Não foi possível alterar o status.', variant: 'destructive' });
    }
  }

  const handleGenerateToken = async (values: z.infer<typeof apiTokenSchema>) => {
    if (!activeWeddingId) return;
    const result = await generateApiToken({ weddingId: activeWeddingId, name: values.name });
    if (result.success && result.token) {
      setNewToken(result.token);
      tokenForm.reset();
    } else {
      toast({ title: 'Erro ao Gerar Token', description: result.error, variant: 'destructive' });
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!activeWeddingId) return;
    try {
      await deleteDoc(doc(db, 'weddings', activeWeddingId, 'apiTokens', tokenId));
      toast({ title: 'Sucesso', description: 'Token de acesso removido.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover o token.', variant: 'destructive' });
    }
  };

  const copyToClipboard = () => {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (weddingLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <div className="space-y-6">
       <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className="font-semibold">O que são Integrações?</AlertTitle>
        <AlertDescription>
         Webhooks permitem que a plataforma "Propósitos" envie notificações automáticas para outros serviços (como Zapier, planilhas ou seu próprio sistema) sempre que um evento importante acontece. Use Tokens de Acesso para garantir que essas notificações sejam seguras.
        </AlertDescription>
      </Alert>

       <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks"><Webhook className="mr-2" />Endpoints de Webhook</TabsTrigger>
          <TabsTrigger value="tokens"><KeyRound className="mr-2" />Tokens de Acesso (API)</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => { setEditingEndpoint(null); setIsEndpointDialogOpen(true); }}>
                    <PlusCircle className="mr-2"/> Adicionar Endpoint
                </Button>
            </div>
            <Card>
                <CardHeader><CardTitle>Meus Endpoints</CardTitle></CardHeader>
                <CardContent>
                 {isLoadingEndpoints ? <Skeleton className="h-40 w-full" /> : (
                  <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome / URL</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {endpoints.length > 0 ? endpoints.map(endpoint => (
                            <TableRow key={endpoint.id}>
                                <TableCell>
                                    <div className="font-medium">{endpoint.name}</div>
                                    <div className="text-sm text-muted-foreground">{endpoint.url}</div>
                                </TableCell>
                                <TableCell><Switch checked={endpoint.isActive} onCheckedChange={() => handleToggleActive(endpoint)} /></TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button variant="outline" size="sm" onClick={() => { setSelectedEndpointForLogs(endpoint); setIsLogsDialogOpen(true); }}>
                                        <FileText className="mr-2"/> Histórico
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingEndpoint(endpoint); setIsEndpointDialogOpen(true); }}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Remover Endpoint?</AlertDialogTitle><AlertDialogDesc>Esta ação não pode ser desfeita.</AlertDialogDesc></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteEndpoint(endpoint.id)}>Remover</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center">Nenhum endpoint configurado.</TableCell></TableRow>
                        )}
                    </TableBody>
                  </Table>
                 )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Tokens de Acesso da API</CardTitle>
                    <CardDescription>Use estes tokens para autenticar requisições de webhook no seu servidor. O token é enviado no cabeçalho `Authorization: Bearer &lt;token&gt;`.</CardDescription>
                  </div>
                   <Button onClick={() => { setNewToken(null); setIsTokenDialogOpen(true); }}>
                        <PlusCircle className="mr-2" /> Gerar Novo Token
                    </Button>
              </div>
            </CardHeader>
            <CardContent>
                {isLoadingTokens ? <Skeleton className="h-40 w-full" /> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Token</TableHead><TableHead>Criado em</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {tokens.length > 0 ? tokens.map(token => (
                            <TableRow key={token.id}>
                                <TableCell className="font-medium">{token.name}</TableCell>
                                <TableCell><code className="text-sm bg-muted p-1 rounded font-mono">{`${token.token.substring(0, 6)}...${token.token.substring(token.token.length - 4)}`}</code></TableCell>
                                <TableCell>{token.createdAt ? format(token.createdAt.toDate(), "P p", { locale: ptBR }) : '...'}</TableCell>
                                <TableCell className="text-right">
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Revogar este token?</AlertDialogTitle><AlertDialogDesc>Qualquer integração usando este token deixará de funcionar.</AlertDialogDesc></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteToken(token.id)}>Sim, Revogar</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )) : (
                           <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum token gerado ainda.</TableCell></TableRow>
                        )}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEndpointDialogOpen} onOpenChange={setIsEndpointDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{editingEndpoint ? 'Editar Endpoint' : 'Novo Endpoint de Webhook'}</DialogTitle>
                <DialogDescription>Configure um URL para receber notificações de eventos que acontecem na plataforma.</DialogDescription>
            </DialogHeader>
             <Form {...endpointForm}>
                <form onSubmit={endpointForm.handleSubmit(handleEndpointSubmit)} className="space-y-6 pt-4">
                    <FormField control={endpointForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome de Identificação</FormLabel><FormControl><Input placeholder="Ex: Integração com Planilhas" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={endpointForm.control} name="url" render={({ field }) => (
                        <FormItem><FormLabel>URL do Endpoint</FormLabel><FormControl><Input placeholder="https://seu-servico.com/webhook" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div>
                        <Label>Eventos para Notificar</Label>
                        <div className="space-y-3 mt-2">
                        {Object.entries(eventDescriptions).map(([key, description]) => (
                            <FormField key={key} control={endpointForm.control} name={`events.${key as keyof typeof eventDescriptions}`} render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5"><FormLabel>{description}</FormLabel></div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )} />
                        ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit" disabled={endpointForm.formState.isSubmitting}>
                           {endpointForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Salvar
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>Histórico de Envios</DialogTitle>
                <DialogDescription>Exibindo os últimos disparos para: {selectedEndpointForLogs?.name}</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto">
             {isLoadingLogs ? <Skeleton className="h-64 w-full" /> : (
                <Table>
                    <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Evento</TableHead><TableHead>Status</TableHead><TableHead>Resposta</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {logs.length > 0 ? logs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="text-xs">{log.timestamp ? format(log.timestamp.toDate(), "dd/MM/yy HH:mm:ss", { locale: ptBR }) : '...'}</TableCell>
                                <TableCell><code className="text-xs bg-muted p-1 rounded">{log.eventType}</code></TableCell>
                                <TableCell><span className={cn('font-bold', log.success ? 'text-green-600' : 'text-red-600')}>{log.responseStatus}</span></TableCell>
                                <TableCell><pre className="text-xs max-w-xs truncate">{log.responseBody || 'N/A'}</pre></TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum envio registrado para este endpoint.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
             )}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button">Fechar</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTokenDialogOpen} onOpenChange={setIsTokenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Novo Token de Acesso</DialogTitle>
             <DialogDescription>{newToken ? "Copie seu token. Ele não será exibido novamente por segurança." : "Dê um nome ao seu token para fácil identificação."}</DialogDescription>
          </DialogHeader>
          {newToken ? (
            <div className="pt-4 space-y-4">
                <div className="relative">
                    <Input readOnly value={newToken} className="pr-10 font-mono text-sm" />
                    <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={copyToClipboard}>
                        {copied ? <Check className="text-green-500" /> : <Copy />}
                    </Button>
                </div>
                <DialogFooter><DialogClose asChild><Button>Fechar</Button></DialogClose></DialogFooter>
            </div>
          ) : (
            <Form {...tokenForm}>
                <form onSubmit={tokenForm.handleSubmit(handleGenerateToken)} className="space-y-4 pt-4">
                    <FormField control={tokenForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome do Token</FormLabel><FormControl><Input placeholder="Ex: Integração Zapier" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit" disabled={tokenForm.formState.isSubmitting}>
                           {tokenForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Gerar Token
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
