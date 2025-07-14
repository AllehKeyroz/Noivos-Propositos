'use server';

import { z } from 'zod';
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp, query, where, writeBatch, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WebhookEndpoint } from '@/lib/types';
import crypto from 'crypto';

const generateTokenSchema = z.object({
  weddingId: z.string().min(1),
  name: z.string().min(2, "O nome do token é obrigatório."),
});

export async function generateApiToken(data: { weddingId: string, name: string }): Promise<{ success: boolean; token?: string; error?: string }> {
  const validation = generateTokenSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }
  
  const { weddingId, name } = validation.data;
  const token = `ppt_${crypto.randomBytes(24).toString('hex')}`;

  try {
    const tokenRef = collection(db, 'weddings', weddingId, 'apiTokens');
    await addDoc(tokenRef, {
      name,
      token,
      createdAt: serverTimestamp()
    });
    return { success: true, token };
  } catch (error) {
    console.error("Error generating API token:", error);
    return { success: false, error: 'Não foi possível gerar o token.' };
  }
}

async function getFirstApiToken(weddingId: string): Promise<string | null> {
    const tokensQuery = query(collection(db, 'weddings', weddingId, 'apiTokens'), orderBy('createdAt', 'desc'));
    const tokensSnap = await getDocs(tokensQuery);
    if (tokensSnap.empty) {
        console.warn(`Webhook auth failed for wedding ${weddingId}: No API tokens found.`);
        return null;
    }
    return tokensSnap.docs[0].data().token;
}

export async function triggerWebhook(weddingId: string, eventType: string, payload: any): Promise<void> {
    if (!weddingId) return;

    try {
        const webhooksQuery = query(
            collection(db, 'weddings', weddingId, 'webhooks'),
            where('isActive', '==', true)
        );
        const webhooksSnap = await getDocs(webhooksQuery);
        if (webhooksSnap.empty) return;
        
        const apiToken = await getFirstApiToken(weddingId);
        if (!apiToken) return; // No token, no authorization

        const body = JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            payload,
            weddingId: weddingId,
        });

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
        };

        webhooksSnap.forEach(webhookDoc => {
            const webhook = webhookDoc.data() as WebhookEndpoint;
            const eventIsEnabled = webhook.events && webhook.events[eventType as keyof typeof webhook.events];

            if (eventIsEnabled) {
                // Fire and forget the request and logging, so it doesn't block the main thread.
                (async () => {
                    let responseStatus = 0;
                    let responseBody = '';
                    let success = false;
                    try {
                        const response = await fetch(webhook.url, {
                            method: 'POST',
                            headers: headers,
                            body: body,
                        });
                        responseStatus = response.status;
                        responseBody = await response.text();
                        success = response.ok;
                    } catch (e: any) {
                        responseStatus = 503; // Service Unavailable
                        responseBody = e.message || 'Fetch failed';
                        success = false;
                        console.error(`Webhook failed for URL ${webhook.url}:`, e);
                    } finally {
                        try {
                           const logRef = collection(db, webhookDoc.ref.path, 'logs');
                            await addDoc(logRef, {
                                timestamp: serverTimestamp(),
                                eventType,
                                payload: JSON.stringify(payload),
                                responseStatus,
                                responseBody: responseBody.substring(0, 500),
                                success,
                            });
                        } catch (logError) {
                            console.error(`Failed to write webhook log for ${webhook.id}:`, logError);
                        }
                    }
                })();
            }
        });

    } catch (error) {
        console.error("Error triggering webhooks:", error);
    }
}
