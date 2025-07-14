import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center rounded-full bg-secondary/20 p-3">
             <Sparkles className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="font-headline text-5xl font-bold text-gray-800">
            Propósitos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Seu espaço para cultivar e alcançar seus objetivos.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
