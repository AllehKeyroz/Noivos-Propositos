
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthentication } from '@/hooks/use-authentication';
import { useWedding } from '@/context/wedding-context';
import { weddingChatFlow } from '@/ai/flows/wedding-chat-flow';
import { generateProactiveMessage } from '@/ai/flows/proactive-chat-flow';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, X, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AiChatWidget() {
  const { user } = useAuthentication();
  const { userProfile } = useWedding();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // State for proactive bubble
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState('');
  const [proactiveSuggestionsEnabled, setProactiveSuggestionsEnabled] = useState(true);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const proactiveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

  // Load user preference for proactive suggestions on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem('proactiveChatDisabled');
    if (savedPreference === 'true') {
      setProactiveSuggestionsEnabled(false);
    }
  }, []);

  // Effect to close bubble on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
            setIsBubbleVisible(false);
        }
    };
    
    if (isBubbleVisible) {
        document.addEventListener('mousedown', handleClickOutside);
    } else {
        document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBubbleVisible]);

  // Effect for proactive suggestions
  useEffect(() => {
    // Clear any existing timers when dependencies change
    if (proactiveTimeoutRef.current) clearTimeout(proactiveTimeoutRef.current);
    if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
    setIsBubbleVisible(false);

    const isCouple = userProfile?.role === 'bride' || userProfile?.role === 'groom' || userProfile?.role === 'super_admin';

    if (!proactiveSuggestionsEnabled || isOpen || !user || !isCouple) {
      return;
    }

    proactiveTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await generateProactiveMessage({ uid: user.uid, pathname });
        if (result.message) {
          setProactiveMessage(result.message);
          setIsBubbleVisible(true);

          // Auto-hide the bubble after 20 seconds
          autoHideTimeoutRef.current = setTimeout(() => {
            setIsBubbleVisible(false);
          }, 20000);
        }
      } catch (error) {
        // Fail silently, don't bother the user with a toast for a proactive feature.
        console.error('Proactive AI error:', error);
      }
    }, 3000); // Show bubble after 3 seconds

    return () => {
      if (proactiveTimeoutRef.current) clearTimeout(proactiveTimeoutRef.current);
      if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
    };
  }, [pathname, user, userProfile, isOpen, proactiveSuggestionsEnabled]);


  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const getInitialMessage = useCallback((): ChatMessage => {
    const isGuest = userProfile?.role === 'guest';
    const guestMessage = `Olá! Que alegria ter você aqui. Saiba que sua presença é muito importante para o casal. Como posso te ajudar a encontrar a lista de presentes ou a sugerir uma música para a festa?`;
    const coupleMessage = 'Olá! Sou seu assistente de casamento. Como posso ajudar com o planejamento hoje?';

    return {
      id: 'initial',
      role: 'assistant',
      content: isGuest ? guestMessage : coupleMessage,
    };
  }, [userProfile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input };
    const loadingMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', isLoading: true };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await weddingChatFlow({ message: input, uid: user.uid });
      const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: response.answer };
      setMessages(prev => [...prev.filter(m => !m.isLoading), assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: 'Desculpe, não consegui processar sua pergunta. Tente novamente.' };
       setMessages(prev => [...prev.filter(m => !m.isLoading), errorMessage]);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleDisableProactiveSuggestions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProactiveSuggestionsEnabled(false);
    setIsBubbleVisible(false);
    localStorage.setItem('proactiveChatDisabled', 'true');
    toast({ title: 'Sugestões desativadas', description: 'Você não verá mais as mensagens proativas.'});
  }

  const toggleOpen = () => {
    const newOpenState = !isOpen;
    setIsOpen(newOpenState);
    setIsBubbleVisible(false); // Hide bubble when user interacts
    if (newOpenState && messages.length === 0) {
      setMessages([getInitialMessage()]);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e);
    }
  };

  const handleResetChat = () => {
    setMessages([getInitialMessage()]);
    toast({ title: "Chat reiniciado", description: "A conversa anterior foi limpa." });
  };


  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {isBubbleVisible && (
             <div
                ref={bubbleRef}
                className="absolute bottom-full right-0 mb-2 w-72 bg-card p-4 rounded-lg shadow-2xl animate-in fade-in-50 slide-in-from-bottom-3"
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsBubbleVisible(false);
                    }}
                    >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Fechar</span>
                </Button>
                <div onClick={toggleOpen} className="cursor-pointer pr-5">
                    <p className="text-sm text-card-foreground">{proactiveMessage}</p>
                    <button onClick={handleDisableProactiveSuggestions} className="text-xs text-muted-foreground hover:text-primary transition-colors mt-3">
                        Não mostrar novamente
                    </button>
                </div>
                <div className="absolute -bottom-2 right-5 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-card"></div>
             </div>
        )}
        <Button onClick={toggleOpen} size="icon" className="rounded-full w-14 h-14 shadow-lg">
          {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </Button>
      </div>

      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-full max-w-sm h-auto max-h-[75vh] flex flex-col shadow-2xl animate-in fade-in-20 zoom-in-95">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                  <CardTitle className="font-headline text-2xl">Propósitos AI</CardTitle>
                  <CardDescription className="text-xs">Seu assistente de casamento</CardDescription>
              </div>
            </div>
             <Button variant="ghost" size="icon" onClick={handleResetChat} className="text-muted-foreground" title="Reiniciar conversa">
                <RefreshCw className="h-4 w-4" />
             </Button>
          </CardHeader>
          <CardContent ref={scrollAreaRef} className="flex-1 overflow-y-auto space-y-4 pr-3">
            {messages.map((message) => (
                <div key={message.id} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'assistant' && (
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                             <Sparkles className="h-5 w-5"/>
                        </div>
                    )}
                    <div className={cn("rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-wrap", 
                        message.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-muted'
                    )}>
                        {message.isLoading ? <Loader2 className="animate-spin" /> : message.content}
                    </div>
                </div>
            ))}
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
              <Textarea
                ref={textareaRef} 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre seu casamento..."
                disabled={isSending}
                rows={1}
                className="max-h-24 resize-none"
              />
              <Button type="submit" size="icon" disabled={isSending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
