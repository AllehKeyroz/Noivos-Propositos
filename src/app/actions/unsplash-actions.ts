'use server';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UnsplashImage {
    id: string;
    urls: {
        raw: string;
        full: string;
        regular: string;
        small: string;
        thumb: string;
    };
    links: {
        html: string;
    };
    alt_description: string;
    user: {
        name: string;
    };
}

export async function searchUnsplashImages(query: string): Promise<{ success: boolean; images?: UnsplashImage[]; error?: string }> {
    if (!query) {
        return { success: false, error: 'A busca não pode ser vazia.' };
    }

    let accessKey: string | undefined;

    try {
        const keysDocRef = doc(db, 'configs', 'api_keys');
        const keysDocSnap = await getDoc(keysDocRef);
        if (keysDocSnap.exists()) {
            accessKey = keysDocSnap.data()?.unsplashAccessKey;
        }

        if (!accessKey) {
            console.error("Unsplash Access Key not found in Firestore configs/api_keys.");
            return { success: false, error: 'A chave da API do Unsplash não está configurada no painel de admin.' };
        }
    } catch (dbError) {
        console.error("Error fetching Unsplash API key from Firestore:", dbError);
        return { success: false, error: 'Não foi possível buscar a chave da API.' };
    }

    const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&lang=pt`;

    try {
        const response = await fetch(endpoint, {
            headers: {
                Authorization: `Client-ID ${accessKey}`,
            },
        });

        if (!response.ok) {
            console.error(`Unsplash API error: ${response.status} ${response.statusText}`);
            const errorBody = await response.json();
            console.error("Unsplash error body:", errorBody);
            return { success: false, error: `Erro na API do Unsplash: ${errorBody.errors?.[0] || response.statusText}` };
        }

        const data = await response.json();
        return { success: true, images: data.results };

    } catch (fetchError: any) {
        console.error("Error fetching from Unsplash API:", fetchError);
        return { success: false, error: 'Não foi possível conectar à API do Unsplash.' };
    }
}
