'use server';
/**
 * @fileOverview A Genkit tool to fetch information about available subscription plans.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const plansToolOutputSchema = z.object({
  plans: z.array(z.any()).describe('A lista de planos de assinatura disponíveis.'),
  features: z.array(z.any()).describe('A tabela de comparação de funcionalidades entre os planos.'),
});

// Hardcoded data that matches the static page
const staticPlansData = {
    plans: [
        { id: 'sonho', name: 'O Sonho', price: 'Grátis', priceDescription: 'Para sempre', description: 'O essencial para começar a jornada e organizar as ideias.', features: ['Painel de Controle', 'Planejador de Tarefas', 'Lista de Convidados (até 50)', 'Controle Financeiro Básico', 'Trilha Sonora Colaborativa'], cta: 'Começar Gratuitamente', variant: 'outline', recommended: false },
        { id: 'jornada', name: 'A Jornada', price: 'R$ 49,90', priceDescription: '/mês', description: 'A experiência completa para construir cada detalhe com a ajuda da IA.', features: ['Tudo do plano "O Sonho"', 'Convidados Ilimitados', 'Linha do Tempo do Casal', 'Cápsula do Tempo Emocional', 'Agenda de Compromissos', 'Assistente de IA para Votos', 'Devocional Diário com IA', 'Propósitos AI (Chat Inteligente)', 'Adicionar Colaboradores'], cta: 'Assinar A Jornada', variant: 'default', recommended: true },
        { id: 'legado', name: 'O Legado', price: 'R$ 69,90', priceDescription: '/mês', description: 'Para casais que querem ir além e eternizar cada momento.', features: ['Tudo do plano "A Jornada"', 'Suporte Prioritário via WhatsApp', 'Backup e Exportação de Todos os Dados', 'Acesso a Funcionalidades Pós-Casamento', 'Gerador de Identidade Visual (Em Breve)', 'Concierge Digital para Convidados (Em Breve)'], cta: 'Assinar O Legado', variant: 'outline', recommended: false },
    ],
    features: [
        { id: '1', feature: 'Painel Nupcial', description: 'Visão geral do seu casamento com resumos e contagem regressiva.', osonho: true, ajornada: true, olegado: true },
        { id: '2', feature: 'Planejador de Tarefas', description: 'Organize todas as suas pendências com categorias e checklists.', osonho: true, ajornada: true, olegado: true },
        { id: '3', feature: 'Lista de Convidados', description: 'Gerencie seus convidados, confirme presenças e organize as mesas.', osonho: 'Até 50 convidados', ajornada: true, olegado: true },
        { id: '4', feature: 'Controle Financeiro', description: 'Acompanhe seu orçamento, registre despesas e controle os gastos.', osonho: 'Básico', ajornada: true, olegado: true },
        { id: '5', feature: 'Trilha Sonora Colaborativa', description: 'Deixe seus convidados sugerirem e votarem nas músicas da festa.', osonho: true, ajornada: true, olegado: true },
        { id: '6', feature: 'Propósitos AI (Chat)', description: 'Converse com a IA para obter informações sobre seu planejamento em tempo real.', osonho: false, ajornada: true, olegado: true },
        { id: '7', feature: 'Assistente de Votos com IA', description: 'Receba ajuda da IA para escrever os votos de casamento mais emocionantes.', osonho: false, ajornada: true, olegado: true },
        { id: '8', feature: 'Devocional Diário com IA', description: 'Comece o dia com uma reflexão inspiradora para o casal, gerada por IA.', osonho: false, ajornada: true, olegado: true },
        { id: '9', feature: 'Linha do Tempo do Casal', description: 'Crie uma linda linha do tempo visual com os momentos mais importantes da sua história.', osonho: false, ajornada: true, olegado: true },
        { id: '10', feature: 'Cápsula do Tempo Emocional', description: 'Permita que amigos e familiares gravem mensagens para serem reveladas no dia do casamento.', osonho: false, ajornada: true, olegado: true },
        { id: '11', feature: 'Suporte Prioritário', description: 'Acesso direto à nossa equipe de suporte via WhatsApp para qualquer dúvida.', osonho: false, ajornada: false, olegado: true },
        { id: '12', feature: 'Backup e Exportação de Dados', description: 'Exporte todos os seus dados de planejamento para guardar como recordação.', osonho: false, ajornada: false, olegado: true },
    ]
};

export const getPlansInfoTool = ai.defineTool(
  {
    name: 'getPlansInfo',
    description: 'Busca informações detalhadas sobre os planos de assinatura, incluindo preços, funcionalidades e a tabela comparativa. Use quando o usuário perguntar sobre planos, preços, ou qual plano escolher.',
    inputSchema: z.object({}),
    outputSchema: plansToolOutputSchema,
  },
  async () => {
    // Return a simplified version of the static data for the AI to use
    return {
        plans: staticPlansData.plans.map(({ name, price, priceDescription, description, features }) => ({ name, price, priceDescription, description, features })),
        features: staticPlansData.features.map(({ feature, description, osonho, ajornada, olegado }) => ({ feature, description, osonho, ajornada, olegado }))
    };
  }
);
