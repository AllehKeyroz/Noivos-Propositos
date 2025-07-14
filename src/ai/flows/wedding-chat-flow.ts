'use server';
/**
 * @fileOverview Um assistente de IA para responder a perguntas sobre o casamento do usuário.
 *
 * - weddingChatFlow - A função principal que lida com o chat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { fetchAllWeddingData } from '@/lib/wedding-data-tools';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPlansInfoTool } from '@/ai/tools/plans-tool';

// Cache simples na memória para os prompts do sistema
const promptCache = new Map<string, string>();

const DEFAULT_COUPLE_PROMPT = `Você é "Propósitos AI", um assistente de casamento prestativo e amigável.
Sua função é ajudar o usuário a planejar seu casamento, respondendo a perguntas com base nos dados fornecidos abaixo.
Se a informação não estiver nos dados, diga que não encontrou a informação.
Se o usuário perguntar sobre planos de assinatura, preços ou funcionalidades, use a ferramenta "getPlansInfo" para obter as informações mais recentes e ajudá-lo a escolher.
Seja conciso, mas informativo. Responda sempre em Português do Brasil.
**IMPORTANTE: Não use NENHUMA formatação markdown (como *, **, #, etc.). Use quebras de linha para formatar sua resposta de forma clara e legível.**`;

const DEFAULT_GUEST_PROMPT = `Você é "Propósitos AI", a anfitriã digital e assistente para os convidados do casamento de {{weddingData.weddingDetails.brideName}} e {{weddingData.weddingDetails.groomName}}.
Sua função é ser extremamente calorosa, amigável e prestativa. Cumprimente o convidado pelo nome ({{weddingData.userProfile.name}}). Diga a ele que o casal está muito feliz por ele estar aqui e que ele é muito importante.
Seja proativa em ajudar. Pergunte se ele quer ajuda com a lista de presentes ("Mural do Carinho"), como sugerir músicas para a "Trilha Sonora do Amor" ou qualquer outra dúvida sobre as funcionalidades disponíveis para ele.
Se o usuário perguntar sobre planos de assinatura, preços ou funcionalidades, use a ferramenta "getPlansInfo" para obter as informações mais recentes e ajudá-lo a escolher.
Se a pergunta for sobre algo que não está nos seus dados (como o planejamento do casal), explique gentilmente que essa informação é privada do casal, mas que você pode ajudar com as áreas de convidado.
Responda sempre em Português do Brasil.
**IMPORTANTE: Não use NENHUMA formatação markdown (como *, **, #, etc.). Use quebras de linha para formatar sua resposta de forma clara e legível.**`;


/**
 * Obtém o prompt do sistema, usando um cache para evitar buscas repetidas no DB.
 * O cache é invalidado na reinicialização do servidor.
 */
async function getSystemPrompt(promptId: 'guest_system_prompt' | 'couple_system_prompt'): Promise<string> {
  if (promptCache.has(promptId)) {
    return promptCache.get(promptId)!;
  }

  try {
    const promptDoc = await getDoc(doc(db, 'prompts', promptId));
    let systemPrompt: string;

    if (promptDoc.exists()) {
      systemPrompt = promptDoc.data().content;
    } else {
      // Usa o prompt padrão caso não exista no banco de dados
      systemPrompt = promptId === 'guest_system_prompt' ? DEFAULT_GUEST_PROMPT : DEFAULT_COUPLE_PROMPT;
    }

    promptCache.set(promptId, systemPrompt); // Armazena no cache
    return systemPrompt;
  } catch (error) {
    console.error(`Error fetching prompt ${promptId}:`, error);
    // Retorna o prompt padrão em caso de erro, garantindo que o chat continue funcionando
    return promptId === 'guest_system_prompt' ? DEFAULT_GUEST_PROMPT : DEFAULT_COUPLE_PROMPT;
  }
}

const WeddingChatInputSchema = z.object({
  message: z.string().describe('A mensagem/pergunta do usuário.'),
  uid: z.string().describe('O ID do usuário para buscar os dados corretos.'),
});
export type WeddingChatInput = z.infer<typeof WeddingChatInputSchema>;

const WeddingChatOutputSchema = z.object({
  answer: z.string().describe('A resposta do assistente de IA.'),
});
export type WeddingChatOutput = z.infer<typeof WeddingChatOutputSchema>;


const PromptWithDataContextSchema = z.object({
    message: z.string(),
    weddingData: z.any().describe("Um objeto JSON com todas as informações do casamento do usuário."),
    systemPrompt: z.string().describe("A instrução de sistema que define a personalidade da IA."),
    currentDateTime: z.string().describe("A data e hora atuais no formato ISO para referência de tempo real."),
});

const weddingChatPrompt = ai.definePrompt({
    name: 'weddingChatPrompt',
    input: { schema: PromptWithDataContextSchema },
    tools: [getPlansInfoTool],
    system: `{{{systemPrompt}}}

A data e hora atual para sua referência é: {{{currentDateTime}}}. Use esta informação para responder a qualquer pergunta relacionada a tempo (ex: "quantos dias faltam para o casamento?").

Aqui estão os dados do casamento do usuário para seu contexto:
\`\`\`json
{{{json weddingData}}}
\`\`\`
`,
    prompt: '{{{message}}}'
});


export async function weddingChatFlow(input: WeddingChatInput): Promise<WeddingChatOutput> {
  const weddingData = await fetchAllWeddingData(input.uid);
  const isGuest = weddingData?.userProfile?.role === 'guest';
  
  const promptId = isGuest ? 'guest_system_prompt' : 'couple_system_prompt';
  const systemPrompt = await getSystemPrompt(promptId);
  const currentDateTime = new Date().toISOString();

  const llmResponse = await weddingChatPrompt({ 
      message: input.message,
      weddingData,
      systemPrompt,
      currentDateTime,
  });
  
  const answer = llmResponse.text;
  return { answer };
}
