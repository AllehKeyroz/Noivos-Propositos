import GiftsClient from '@/components/dashboard/gifts/gifts-client';

export default function GiftsPage() {
  return (
    <div className="w-full">
        <h1 className="text-3xl font-bold font-headline mb-2">Mural do Carinho</h1>
        <p className="text-muted-foreground mb-8">Gerencie os presentes recebidos e sua lista de sugestões.</p>
        <GiftsClient />
    </div>
  );
}
