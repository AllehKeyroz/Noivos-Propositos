import PromptsClient from '@/components/admin/prompts/prompts-client';

export default function AdminPromptsPage() {
    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-headline mb-2">Gerenciar Prompts da IA</h1>
            <p className="text-muted-foreground mb-8">
              Ajuste as instruções (prompts) que definem a personalidade e o comportamento do assistente de IA.
            </p>
            <PromptsClient />
        </div>
    );
}
