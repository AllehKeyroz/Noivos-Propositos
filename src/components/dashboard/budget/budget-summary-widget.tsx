
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { BudgetItem, WeddingData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, PiggyBank, ListChecks, Landmark } from 'lucide-react';

interface BudgetSummaryWidgetProps {
  budgetItems: BudgetItem[];
  weddingData: WeddingData | null;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function BudgetSummaryWidget({ budgetItems, weddingData }: BudgetSummaryWidgetProps) {
  const { totalActual, totalEstimated } = useMemo(() => {
    return budgetItems.reduce(
      (acc, item) => {
        acc.totalActual += item.actualCost;
        acc.totalEstimated += item.estimatedCost;
        return acc;
      },
      { totalActual: 0, totalEstimated: 0 }
    );
  }, [budgetItems]);

  const totalBudget = weddingData?.totalBudget || 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Resumo Financeiro</CardTitle>
        <Wallet className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex items-center">
            <PiggyBank className="h-5 w-5 text-muted-foreground" />
            <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">Orçamento</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(totalBudget)}</p>
            </div>
        </div>
        <div className="flex items-center">
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">Previsto</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(totalEstimated)}</p>
            </div>
        </div>
         <div className="flex items-center">
            <Landmark className="h-5 w-5 text-muted-foreground" />
            <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">Gasto Real</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(totalActual)}</p>
            </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href="/dashboard/budget" passHref className="w-full">
          <Button variant="outline" className="w-full">
            Gerenciar orçamento
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
