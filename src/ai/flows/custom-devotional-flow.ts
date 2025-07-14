'use server';
/**
 * @fileOverview Um assistente de IA para gerar devocionais com base em um tópico específico.
 *
 * - generateCustomDevotional - Gera um devocional com base em um tema fornecido pelo usuário.
 * - CustomDevotionalInput - O tipo de entrada para a função.
 * - DevotionalOutput - O tipo de retorno.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CustomDevotionalInputSchema = z.object({
  topic: z.string().describe('O tópico ou tema sobre o qual o devocional deve ser escrito.'),
});
export type CustomDevotionalInput = z.infer<typeof CustomDevotionalInputSchema>;


const DevotionalOutputSchema = z.object({
  title: z.string().describe('Um título inspirador e conciso para o devocional, relacionado ao tópico.'),
  verse: z.string().describe('Uma citação de um versículo bíblico relevante para o tópico (incluindo o livro, capítulo e versículo, ex: "Efésios 4:2-3").'),
  reflection: z.string().describe('Uma reflexão calorosa e prática sobre o versículo, aplicando-o ao contexto de um casal e ao tópico fornecido. Deve ter entre 3 e 4 parágrafos.'),
  prayer: z.string().describe('Uma oração curta e sincera para o casal, relacionada ao tópico.'),
});
export type DevotionalOutput = z.infer<typeof DevotionalOutputSchema>;


export async function generateCustomDevotional(input: CustomDevotionalInput): Promise<DevotionalOutput> {
  return customDevotionalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customDevotionalPrompt',
  input: { schema: CustomDevotionalInputSchema },
  output: { schema: DevotionalOutputSchema },
  prompt: `Você é um conselheiro espiritual sábio e gentil, especializado em preparar casais para o casamento com base em princípios cristãos.
Sua tarefa é criar um devocional para um casal com base em um tópico específico fornecido por eles. O devocional deve ser encorajador, prático e focado em fortalecer o relacionamento deles com Deus e um com o outro.

Gere um devocional completo com os seguintes elementos:
1.  **Título:** Um título curto e inspirador.
2.  **Versículo:** Um versículo bíblico relevante para o tópico. Inclua a referência completa (livro, capítulo, versículo).
3.  **Reflexão:** Uma meditação de 3 a 4 parágrafos sobre o versículo, aplicando seus princípios ao tópico no contexto do casal. Use uma linguagem acessível e amorosa.
4.  **Oração:** Uma oração curta que o casal possa fazer junto, baseada na reflexão do dia.

O tema do devocional de hoje é: {{{topic}}}

Certifique-se de que a resposta esteja apenas no formato JSON solicitado.`,
});

const customDevotionalFlow = ai.defineFlow(
  {
    name: 'customDevotionalFlow',
    inputSchema: CustomDevotionalInputSchema,
    outputSchema: DevotionalOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('A IA não conseguiu gerar o devocional.');
    }
    return output;
  }
);
