'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  initialImageUrl: string | null;
  onUploadComplete: (url: string) => void;
  aspectRatio?: 'aspect-square' | 'aspect-video' | 'aspect-[3/1]';
}

export default function ImageUploader({
  initialImageUrl,
  onUploadComplete,
  aspectRatio = 'aspect-square',
}: ImageUploaderProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressAndConvertToBase64 = (file: File) => {
    const MAX_WIDTH = 1920;
    const MAX_HEIGHT = 1080;
    const QUALITY = 0.7; // Use 70% quality for JPEG compression

    setIsLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // Calculate new dimensions maintaining aspect ratio
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                toast({ title: 'Erro', description: 'Não foi possível processar a imagem.', variant: 'destructive' });
                setIsLoading(false);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            
            // Get the compressed base64 string
            const base64String = canvas.toDataURL('image/jpeg', QUALITY);

            // Final check on the compressed size to ensure it fits in Firestore
            const sizeInBytes = base64String.length;
            const maxSizeInBytes = 1 * 1024 * 1024; // 1MB - Firestore document limit

            if (sizeInBytes > maxSizeInBytes) {
                toast({
                    title: 'Erro',
                    description: 'A imagem é muito grande mesmo após a compressão. Tente uma com resolução menor ou mais simples.',
                    variant: 'destructive',
                });
                setIsLoading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                return;
            }


            setPreviewUrl(base64String);
            onUploadComplete(base64String);
            setIsLoading(false);
            toast({ title: 'Sucesso!', description: 'Imagem carregada e pronta para salvar.' });
            
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        };
        
        img.onerror = () => {
            toast({ title: 'Erro', description: 'O arquivo selecionado não parece ser uma imagem válida.', variant: 'destructive' });
            setIsLoading(false);
        };
    };

    reader.onerror = (error) => {
        console.error('Error reading file:', error);
        toast({ title: 'Erro', description: 'Não foi possível ler o arquivo selecionado.', variant: 'destructive' });
        setIsLoading(false);
    };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit for original file
        toast({ title: 'Erro', description: 'O arquivo é muito grande. O limite para imagens é 5MB.', variant: 'destructive' });
        return;
      }
      compressAndConvertToBase64(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPreviewUrl(null);
    onUploadComplete('');
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className={cn(
        'relative w-full rounded-lg border-2 border-dashed border-muted-foreground/50 flex flex-col justify-center items-center text-muted-foreground bg-muted/20 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors',
        aspectRatio
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/png, image/jpeg, image/gif, image/webp"
        className="hidden"
        disabled={isLoading}
      />
      
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 text-white p-4">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm font-semibold">Processando...</p>
        </div>
      )}

      {previewUrl && !isLoading && (
        <>
          <Image src={previewUrl} alt="Prévia da imagem" layout="fill" className="object-cover" />
           <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 z-20 h-8 w-8 rounded-full"
            onClick={handleRemoveImage}
            title="Remover Imagem"
           >
            <X className="h-4 w-4" />
          </Button>
        </>
      )}

      {!previewUrl && !isLoading && (
        <div className="text-center p-4">
          <UploadCloud className="mx-auto h-12 w-12" />
          <p className="mt-2 text-sm">Clique para enviar uma imagem</p>
          <p className="text-xs text-muted-foreground/80 mt-1">PNG, JPG, GIF até 5MB</p>
        </div>
      )}
    </div>
  );
}
