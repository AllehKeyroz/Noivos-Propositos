'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { HomeTrousseauItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface HomeTrousseauSummaryWidgetProps {
  items: HomeTrousseauItem[];
}

export default function HomeTrousseauSummaryWidget({ items }: HomeTrousseauSummaryWidgetProps) {
  const { totalItems, acquiredItems } = useMemo(() => {
    const acquired = items.filter(item => item.status === 'have' || item.status === 'gifted').length;
    return {
      totalItems: items.length,
      acquiredItems: acquired,
    };
  }, [items]);

  const progress = totalItems > 0 ? (acquiredItems / totalItems) * 100 : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Enxoval do Lar</CardTitle>
        <Home className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
        {totalItems > 0 ? (
          <div className="w-full space-y-4">
            <div>
                <div className="text-3xl font-bold">{acquiredItems} de {totalItems}</div>
                <p className="text-sm text-muted-foreground">itens conquistados</p>
            </div>
            <Progress value={progress} />
          </div>
        ) : (
          <div className="text-muted-foreground py-4">
            <p className="text-sm">Nenhum item no enxoval.</p>
          </div>
        )}
      </CardContent>
       <CardFooter>
         <Link href="/dashboard/home-trousseau" passHref className="w-full">
            <Button variant="outline" className="w-full">Gerenciar Enxoval</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
