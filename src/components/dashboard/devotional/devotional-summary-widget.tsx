'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Devotional } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookHeart } from 'lucide-react';

interface DevotionalSummaryWidgetProps {
  devotionals: Devotional[];
}

export default function DevotionalSummaryWidget({ devotionals }: DevotionalSummaryWidgetProps) {
  const { totalCount, completedCount } = useMemo(() => {
    return {
      totalCount: devotionals.length,
      completedCount: devotionals.filter(d => d.completed).length,
    };
  }, [devotionals]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Devocionais</CardTitle>
        <BookHeart className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
        {totalCount > 0 ? (
          <div>
            <div className="text-3xl font-bold">{completedCount}</div>
            <p className="text-sm text-muted-foreground">
              concluídos de {totalCount}
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground py-4">
            <p className="text-sm">Nenhum devocional gerado.</p>
          </div>
        )}
      </CardContent>
       <CardFooter>
         <Link href="/dashboard/devotional" passHref className="w-full">
            <Button variant="outline" className="w-full">Ver Devocionais</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
