'use client';

import Link from 'next/link';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ClipboardCheck } from 'lucide-react';

interface TaskSummaryWidgetProps {
  tasks: Task[];
}

export default function TaskSummaryWidget({ tasks }: TaskSummaryWidgetProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Resumo das Tarefas</CardTitle>
        <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
        {totalTasks > 0 ? (
          <div className="w-full space-y-4">
            <div>
              <div className="text-3xl font-bold">{completedTasks} de {totalTasks}</div>
              <p className="text-sm text-muted-foreground">tarefas concluídas</p>
            </div>
            <Progress value={progress} />
          </div>
        ) : (
          <div className="text-muted-foreground py-4">
            <p className="text-sm">Nenhuma tarefa criada ainda.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/dashboard/planner" passHref className="w-full">
            <Button variant="outline" className="w-full">Ver todas as tarefas</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
