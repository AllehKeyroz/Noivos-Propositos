import SoundtrackClient from '@/components/dashboard/soundtrack/soundtrack-client';

export default function SoundtrackPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline mb-2">Trilha Sonora do Amor</h1>
        <p className="text-muted-foreground">Sugira músicas e ajude a criar a playlist perfeita para a festa!</p>
      </div>
      <SoundtrackClient />
    </div>
  );
}
