import SettingsForm from '@/components/dashboard/settings-form';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold font-headline mb-2">Configurações do Casamento</h1>
        <p className="text-muted-foreground mb-8">Gerencie todos os detalhes do seu grande dia aqui.</p>
        <SettingsForm />
    </div>
  );
}
