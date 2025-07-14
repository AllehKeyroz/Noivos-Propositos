import ProfileForm from '@/components/dashboard/profile-form';

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold font-headline mb-2">Meu Perfil</h1>
        <p className="text-muted-foreground mb-8">Gerencie suas informações pessoais e de contato.</p>
        <ProfileForm />
    </div>
  );
}
