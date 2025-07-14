'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Guest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

interface GuestSummaryWidgetProps {
  guests: Guest[];
}

export default function GuestSummaryWidget({ guests }: GuestSummaryWidgetProps) {
  const { totalGuests, confirmedGuests } = useMemo(() => {
    const confirmed = guests.filter(g => g.status === 'confirmado').length;
    return {
      totalGuests: guests.length,
      confirmedGuests: confirmed,
    };
  }, [guests]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Resumo dos Convidados</CardTitle>
        <Users className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
        {totalGuests > 0 ? (
          <div>
            <div className="text-3xl font-bold">{confirmedGuests}</div>
            <p className="text-sm text-muted-foreground">
              convidados confirmados de {totalGuests}
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground py-4">
            <p className="text-sm">Nenhum convidado adicionado.</p>
          </div>
        )}
      </CardContent>
       <CardFooter>
         <Link href="/dashboard/guests" passHref className="w-full">
            <Button variant="outline" className="w-full">Gerenciar convidados</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
