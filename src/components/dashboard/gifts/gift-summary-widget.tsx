'use client';

import Link from 'next/link';
import type { GiftSuggestion, ReceivedGift } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';

interface GiftSummaryWidgetProps {
  suggestions: GiftSuggestion[];
  receivedGifts: ReceivedGift[];
}

export default function GiftSummaryWidget({ suggestions, receivedGifts }: GiftSummaryWidgetProps) {
  const totalSuggestions = suggestions.length;
  const totalReceived = receivedGifts.length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Mural do Carinho</CardTitle>
        <Gift className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
        {totalSuggestions > 0 || totalReceived > 0 ? (
          <div>
            <div className="text-3xl font-bold">{totalReceived}</div>
            <p className="text-sm text-muted-foreground">
              presentes recebidos de {totalSuggestions} sugestões
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground py-4">
            <p className="text-sm">Nenhum presente ou sugestão.</p>
          </div>
        )}
      </CardContent>
       <CardFooter>
         <Link href="/dashboard/gifts" passHref className="w-full">
            <Button variant="outline" className="w-full">Gerenciar Presentes</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
