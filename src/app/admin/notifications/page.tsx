import NotificationsClient from '@/components/admin/notifications/notifications-client';

export default function AdminNotificationsPage() {
    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-headline mb-2">Gerenciar Notificações</h1>
            <p className="text-muted-foreground mb-8">
              Crie e envie notificações para todos os usuários da plataforma.
            </p>
            <NotificationsClient />
        </div>
    );
}
