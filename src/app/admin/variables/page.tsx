import VariablesClient from '@/components/admin/variables/variables-client';

export default function AdminVariablesPage() {
    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-headline mb-2">Variáveis Customizadas</h1>
            <p className="text-muted-foreground mb-8">
              Gerencie chaves de API e outras variáveis usadas pela plataforma.
            </p>
            <VariablesClient />
        </div>
    );
}
