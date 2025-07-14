'use client';

import Link from 'next/link';
import type { TimeCapsuleItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface CapsuleSummaryWidgetProps {
  items: TimeCapsuleItem[];
}

export default function CapsuleSummaryWidget({ items }: CapsuleSummaryWidgetProps) {
  const totalItems = items.length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Cápsula do Tempo</CardTitle>
        <Clock className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
        {totalItems > 0 ? (
          <div>
            <div className="text-3xl font-bold">{totalItems}</div>
            <p className="text-sm text-muted-foreground">
              {totalItems === 1 ? 'mensagem guardada' : 'mensagens guardadas'}
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground py-4">
            <p className="text-sm">Nenhuma mensagem na cápsula.</p>
          </div>
        )}
      </CardContent>
       <CardFooter>
         <Link href="/dashboard/capsule" passHref className="w-full">
            <Button variant="outline" className="w-full">Ver Cápsula do Tempo</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
