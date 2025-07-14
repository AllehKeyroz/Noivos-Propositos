
'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import AuthGuard from '@/components/auth/auth-guard';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import AiChatWidget from '@/components/dashboard/ai-chat/ai-chat-widget';
import { WeddingProvider, useWedding } from '@/context/wedding-context';
import FirstStepsModal from '@/components/dashboard/first-steps-modal';

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { weddingData, activeWeddingId, loading } = useWedding();

  const needsSetup = !loading && activeWeddingId && (!weddingData?.brideName || !weddingData?.groomName || weddingData.brideName === 'A definir' || weddingData.groomName === 'A definir');

  return (
    <>
      <div className="min-h-screen bg-background">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="md:ml-64">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-4 md:p-8">
            {children}
          </main>
        </div>
        <AiChatWidget />
      </div>
      {activeWeddingId && <FirstStepsModal isOpen={needsSetup} activeWeddingId={activeWeddingId} />}
    </>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <WeddingProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </WeddingProvider>
    </AuthGuard>
  );
}
