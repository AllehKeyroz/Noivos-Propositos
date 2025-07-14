import AutomationsClient from '@/components/admin/automations/automations-client';

export default function AdminAutomationsPage() {
    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-headline mb-2">Gerenciar Automações</h1>
            <p className="text-muted-foreground mb-8">
              Crie notificações agendadas e condicionais que são enviadas automaticamente aos usuários.
            </p>
            <AutomationsClient />
        </div>
    );
}
