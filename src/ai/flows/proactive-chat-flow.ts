'use server';
/**
 * @fileOverview An AI flow to generate proactive, contextual chat messages.
 *
 * - generateProactiveMessage - Generates a message based on the user's current page and wedding data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { fetchAllWeddingData } from '@/lib/wedding-data-tools';

const ProactiveChatInputSchema = z.object({
  uid: z.string().describe("The ID of the user to fetch data for."),
  pathname: z
    .string()
    .describe('The current URL path the user is on (e.g., /dashboard/budget).'),
});
export type ProactiveChatInput = z.infer<typeof ProactiveChatInputSchema>;

const ProactiveChatOutputSchema = z.object({
  message: z.string().describe('The generated proactive message.'),
});
export type ProactiveChatOutput = z.infer<typeof ProactiveChatOutputSchema>;

const proactiveSystemPrompt = `Você é "Propósitos AI", um assistente de casamento proativo, perspicaz e amigável.
Sua tarefa é analisar os dados do casamento do usuário e o contexto da página em que ele está para oferecer uma dica, sugestão ou observação útil e oportuna.
Seja breve, amigável e direto ao ponto. A mensagem deve ser curta o suficiente para caber em uma bolha de chat.
O objetivo é iniciar uma conversa, não resolver tudo de uma vez.
NUNCA use markdown.

**Contexto da Página:** {{{pathname}}}

**Dados do Casamento:**
\`\`\`json
{{{json weddingData}}}
\`\`\`

**Instruções com base no contexto:**
- Se o pathname for '/dashboard/plans': Ofereça ajuda para escolher o plano ideal. Diga algo como: "Explorando os planos? Cada um foi pensado para um momento da jornada. Me diga o que é mais importante para você e te ajudo a decidir!".
- Se o pathname for '/dashboard/budget': Analise o orçamento. Se os gastos estão perto do limite, alerte-os gentilmente. Se não há itens, sugira adicionar a primeira despesa. Se tudo estiver bem, elogie o controle financeiro.
- Se o pathname for '/dashboard/planner': Olhe as tarefas. Se muitas estiverem incompletas, ofereça ajuda para priorizar. Se poucas tarefas foram criadas, sugira adicionar mais. Se o progresso for bom, dê parabéns.
- Se o pathname for '/dashboard/guests': Verifique a proporção de convidados confirmados. Se for baixa, sugira enviar um lembrete. Se a maioria já confirmou, comemore com eles.
- Se o pathname for '/dashboard/vows': Se não houver votos criados, ofereça ajuda para começar com a IA. Se já existirem, sugira revisá-los ou pensar em um novo ângulo.
- Se o pathname for '/dashboard/soundtrack': Se a playlist estiver vazia, sugira adicionar a primeira música. Se já houver músicas, comente sobre a mais votada.
- Se o pathname for '/dashboard': Dê uma mensagem geral de boas-vindas ou comente sobre o item mais urgente (por exemplo, a tarefa mais próxima do prazo ou o orçamento estourando).
- Para outras páginas ou se os dados forem insuficientes, gere uma mensagem de ajuda genérica e amigável, como "Estou por aqui se precisar de alguma ideia ou ajuda no planejamento!".

Gere apenas a mensagem final.
`;

const proactiveChatPrompt = ai.definePrompt({
  name: 'proactiveChatPrompt',
  input: { schema: z.object({ pathname: z.string(), weddingData: z.any() }) },
  prompt: proactiveSystemPrompt,
  output: { schema: ProactiveChatOutputSchema },
});

export async function generateProactiveMessage(
  input: ProactiveChatInput
): Promise<ProactiveChatOutput> {
  const weddingData = await fetchAllWeddingData(input.uid);

  // Don't generate proactive messages for guests or if there's an error
  if (weddingData?.userProfile?.role === 'guest' || weddingData?.error) {
    return { message: '' };
  }

  const llmResponse = await proactiveChatPrompt({
    pathname: input.pathname,
    weddingData,
  });

  if (!llmResponse.output) {
    return { message: 'Estou por aqui se precisar de uma mãozinha! ✨' };
  }

  return llmResponse.output;
}
