
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { searchUnsplashImages } from '@/app/actions/unsplash-actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { InspirationCategory } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UnsplashImage {
    id: string;
    urls: { regular: string; };
    alt_description: string;
}

interface ImageSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string, categoryId?: string) => void;
  categories: InspirationCategory[];
  standalone?: boolean;
}

export default function ImageSearchDialog({ isOpen, onClose, onImageSelect, categories = [], standalone = false }: ImageSearchDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  useEffect(() => {
    if (categories.length > 0 && !categories.find(c => c.id === selectedCategory)) {
        setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  const handleSearch = async (e: React.FormEvent, newSearch = true) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    
    const pageToFetch = newSearch ? 1 : currentPage + 1;
    if (newSearch) {
        setSearchResults([]);
        setCurrentPage(1);
    }
    
    const result = await searchUnsplashImages(searchQuery, pageToFetch);
    if (result.success && result.images) {
      setSearchResults(prev => newSearch ? result.images! : [...prev, ...result.images!]);
      if (!newSearch) {
        setCurrentPage(pageToFetch);
      }
    } else {
      toast({ title: "Erro na Busca", description: result.error, variant: 'destructive' });
    }
    setIsSearching(false);
  };
  
  const content = (
    <>
      {!standalone && (
          <DialogHeader>
            <DialogTitle>Buscar Imagem de Referência</DialogTitle>
            <DialogDescription>Encontre a imagem perfeita para ilustrar sua ideia.</DialogDescription>
          </DialogHeader>
      )}
      <div className={standalone ? "" : "py-4"}>
        <form onSubmit={(e) => handleSearch(e, true)} className="flex gap-2">
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ex: buquê de noiva, decoração rústica..."
            disabled={isSearching}
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching && currentPage === 1 ? <Loader2 className="animate-spin" /> : <Search />}
            <span className="hidden sm:inline ml-2">Buscar</span>
          </Button>
        </form>

        {standalone && categories.length > 0 && (
            <div className="mt-4">
                <label className="text-sm font-medium">Salvar na categoria</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma categoria..."/></SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        )}
      </div>

      <ScrollArea className="max-h-[60vh] -mr-4 pr-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {searchResults.map(img => (
            <Card key={img.id} className="group relative overflow-hidden cursor-pointer" onClick={() => onImageSelect(img.urls.regular, selectedCategory)}>
              <Image src={img.urls.regular} alt={img.alt_description || "Inspiração"} width={400} height={400} className="object-cover aspect-square bg-muted"/>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center text-white text-xs">
                {img.alt_description}
              </div>
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" className="h-8 w-8"><PlusCircle /></Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {searchResults.length > 0 && (
        <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={(e) => handleSearch(e, false)} disabled={isSearching}>
                {isSearching && currentPage > 1 ? <Loader2 className="animate-spin mr-2"/> : null}
                Carregar mais
            </Button>
        </div>
      )}
    </>
  );

  if (standalone) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Buscar Inspirações</CardTitle>
                <CardDescription>Encontre referências e adicione-as diretamente ao seu mural com um clique.</CardDescription>
            </CardHeader>
            <CardContent>
                {content}
            </CardContent>
        </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        {content}
      </DialogContent>
    </Dialog>
  );
}
