'use client';

import Link from 'next/link';
import type { TimelineEvent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GalleryHorizontal } from 'lucide-react';

interface TimelineSummaryWidgetProps {
  events: TimelineEvent[];
}

export default function TimelineSummaryWidget({ events }: TimelineSummaryWidgetProps) {
  const totalEvents = events.length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Linha do Tempo</CardTitle>
        <GalleryHorizontal className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
        {totalEvents > 0 ? (
          <div>
            <div className="text-3xl font-bold">{totalEvents}</div>
            <p className="text-sm text-muted-foreground">
              {totalEvents === 1 ? 'momento registrado' : 'momentos registrados'}
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground py-4">
            <p className="text-sm">Nenhuma lembrança adicionada.</p>
          </div>
        )}
      </CardContent>
       <CardFooter>
         <Link href="/dashboard/timeline" passHref className="w-full">
            <Button variant="outline" className="w-full">Ver Linha do Tempo</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
