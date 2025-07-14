'use server';
/**
 * @fileOverview Um assistente de IA para gerar devocionais diários para casais.
 *
 * - generateDevotional - Gera um devocional diário com base em temas de casamento e vida a dois.
 * - DevotionalOutput - O tipo de retorno para a função generateDevotional.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DevotionalOutputSchema = z.object({
  title: z.string().describe('Um título inspirador e conciso para o devocional.'),
  verse: z.string().describe('Uma citação de um versículo bíblico relevante (incluindo o livro, capítulo e versículo, ex: "Efésios 4:2-3").'),
  reflection: z.string().describe('Uma reflexão calorosa e prática sobre o versículo, aplicando-o ao contexto de um casal que está construindo uma vida juntos. Deve ter entre 3 e 4 parágrafos.'),
  prayer: z.string().describe('Uma oração curta e sincera para o casal, relacionada ao tema do dia.'),
});
export type DevotionalOutput = z.infer<typeof DevotionalOutputSchema>;

export async function generateDevotional(): Promise<DevotionalOutput> {
  return devotionalFlow();
}

const prompt = ai.definePrompt({
  name: 'devotionalPrompt',
  output: { schema: DevotionalOutputSchema },
  prompt: `Você é um conselheiro espiritual sábio e gentil, especializado em preparar casais para o casamento com base em princípios cristãos.
Sua tarefa é criar um devocional diário para um casal. O devocional deve ser encorajador, prático e focado em fortalecer o relacionamento deles com Deus e um com o outro.

Gere um devocional completo com os seguintes elementos:
1.  **Título:** Um título curto e inspirador.
2.  **Versículo:** Um versículo bíblico relevante para a vida a dois. Inclua a referência completa (livro, capítulo, versículo).
3.  **Reflexão:** Uma meditação de 3 a 4 parágrafos sobre o versículo, aplicando seus princípios à jornada do casamento. Use uma linguagem acessível e amorosa.
4.  **Oração:** Uma oração curta que o casal possa fazer junto, baseada na reflexão do dia.

Escolha um tema relevante para a vida de um casal que está construindo uma vida juntos, como por exemplo: amor, paciência, perdão, comunicação, finanças, intimidade, propósito, serviço mútuio, ou outro tema que seja inspirador.
Certifique-se de que a resposta esteja apenas no formato JSON solicitado.`,
});

const devotionalFlow = ai.defineFlow(
  {
    name: 'devotionalFlow',
    outputSchema: DevotionalOutputSchema,
  },
  async () => {
    const { output } = await prompt();
    if (!output) {
      throw new Error('A IA não conseguiu gerar o devocional.');
    }
    return output;
  }
);
