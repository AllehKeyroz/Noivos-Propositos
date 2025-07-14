import CapsuleClient from '@/components/dashboard/capsule/capsule-client';

export default function CapsulePage() {
  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold font-headline mb-2">Cápsula do Tempo</h1>
      <p className="text-muted-foreground mb-8">Mensagens e memórias que serão reveladas no grande dia.</p>
      <CapsuleClient />
    </div>
  );
}
