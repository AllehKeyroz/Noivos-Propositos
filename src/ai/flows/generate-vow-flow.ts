'use server';
/**
 * @fileOverview Um assistente de IA para gerar votos de casamento.
 *
 * - generateVow - Uma função que gera votos de casamento com base nas informações do usuário.
 * - GenerateVowInput - O tipo de entrada para a função generateVow.
 * - GenerateVowOutput - O tipo de retorno para a função generateVow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVowInputSchema = z.object({
  toWhom: z.string().describe('O nome da pessoa para quem os votos são destinados.'),
  theme: z.enum(['romantico', 'engracado', 'tradicional', 'moderno']).describe('O tema principal dos votos.'),
  tone: z.enum(['emocionante', 'leve', 'poetico', 'sincero']).describe('O tom emocional dos votos.'),
  personalDetails: z.string().describe('Detalhes, memórias e sentimentos pessoais para incluir nos votos.'),
});
export type GenerateVowInput = z.infer<typeof GenerateVowInputSchema>;

const GenerateVowOutputSchema = z.object({
  vowText: z.string().describe('O texto dos votos de casamento gerado.'),
});
export type GenerateVowOutput = z.infer<typeof GenerateVowOutputSchema>;

export async function generateVow(input: GenerateVowInput): Promise<GenerateVowOutput> {
  return generateVowFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateVowPrompt',
  input: {schema: GenerateVowInputSchema},
  prompt: `Você é um escritor especialista e sensível, especializado em criar votos de casamento emocionantes e personalizados em Português do Brasil.
Sua tarefa é escrever um rascunho de votos de casamento com base nas seguintes informações fornecidas pelo usuário.
O texto gerado deve ser apenas o texto dos votos, sem introduções ou meta comentários.

Use estas informações para criar os votos:
- Para quem são os votos: {{{toWhom}}}
- Tema: {{{theme}}}
- Tom: {{{tone}}}
- Detalhes pessoais, memórias e sentimentos: {{{personalDetails}}}

Concentre-se em usar os detalhes pessoais como a base principal para o conteúdo, tecendo-os de forma natural ao longo dos votos.
Estruture os votos com um começo, meio e fim claros: comece com uma saudação carinhosa, desenvolva com as memórias e promessas, e termine com uma declaração de amor e compromisso para o futuro.`,
});

const generateVowFlow = ai.defineFlow(
  {
    name: 'generateVowFlow',
    inputSchema: GenerateVowInputSchema,
    outputSchema: GenerateVowOutputSchema,
  },
  async input => {
    const response = await prompt(input);
    const vowText = response.text;
    return { vowText };
  }
);
