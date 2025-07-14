import UsersClient from '@/components/admin/users/users-client';

export default function AdminUsersPage() {
    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-headline mb-2">Gerenciar Usuários</h1>
            <p className="text-muted-foreground mb-8">
              Crie novos usuários ou edite os existentes, atribuindo-os a casamentos e gerenciando suas permissões.
            </p>
            <UsersClient />
        </div>
    );
}
