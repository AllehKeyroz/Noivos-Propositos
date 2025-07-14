import WeddingsClient from '@/components/admin/weddings/weddings-client';

export default function AdminWeddingsPage() {
    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-headline mb-2">Gerenciar Casamentos</h1>
            <p className="text-muted-foreground mb-8">Crie e gerencie as subcontas (casamentos).</p>
            <WeddingsClient />
        </div>
    );
}
