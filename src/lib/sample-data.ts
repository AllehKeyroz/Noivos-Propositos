'use client';

import { db } from './firebase';
import { writeBatch, doc, serverTimestamp, Timestamp, collection } from 'firebase/firestore';
import type { Task, Guest, BudgetItem, GiftSuggestion, ReceivedGift, PlaylistItem, Appointment } from './types';

// Helper to get a future date
const getFutureDate = (months: number, days: number = 0) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    date.setDate(date.getDate() + days);
    return Timestamp.fromDate(date);
}

// Sample Data Definitions
const weddingDetails = {
    brideName: 'Olivia',
    groomName: 'Benjamin',
    weddingDate: getFutureDate(6),
    weddingLocation: 'Vinícola Vale dos Sonhos, Bento Gonçalves, RS',
    totalBudget: 50000,
    coverPhotoUrl: 'https://placehold.co/1200x400.png',
};

const taskCategories = [
    { name: 'Fornecedores', createdAt: serverTimestamp() as Timestamp },
    { name: 'Documentação', createdAt: serverTimestamp() as Timestamp },
    { name: 'Trajes e Beleza', createdAt: serverTimestamp() as Timestamp },
    { name: 'Convidados', createdAt: serverTimestamp() as Timestamp },
];

const tasks = [
    { text: 'Contratar Fotógrafo e Filmagem', completed: true, createdAt: serverTimestamp() as Timestamp, categoryIndex: 0 },
    { text: 'Degustação e escolha do Buffet', completed: true, createdAt: serverTimestamp() as Timestamp, categoryIndex: 0 },
    { text: 'Contratar DJ ou Banda para a festa', completed: false, createdAt: serverTimestamp() as Timestamp, categoryIndex: 0 },
    { text: 'Entregar documentos no cartório', completed: false, createdAt: serverTimestamp() as Timestamp, categoryIndex: 1 },
    { text: 'Agendar e realizar o casamento civil', completed: false, createdAt: serverTimestamp() as Timestamp, categoryIndex: 1 },
    { text: 'Primeira prova do vestido da noiva', completed: false, createdAt: serverTimestamp() as Timestamp, categoryIndex: 2 },
    { text: 'Alugar ou comprar o traje do noivo', completed: true, createdAt: serverTimestamp() as Timestamp, categoryIndex: 2 },
    { text: 'Contratar maquiador e cabeleireiro', completed: false, createdAt: serverTimestamp() as Timestamp, categoryIndex: 2 },
    { text: 'Enviar "Save the Date"', completed: true, createdAt: serverTimestamp() as Timestamp, categoryIndex: 3 },
    { text: 'Enviar convites oficiais', completed: false, createdAt: serverTimestamp() as Timestamp, categoryIndex: 3 },
];

const guests: Omit<Guest, 'id'>[] = [
    { name: 'Carlos (Pai da Noiva)', group: 'familia_noiva', status: 'confirmado', tableNumber: 1, createdAt: serverTimestamp() as Timestamp },
    { name: 'Sofia (Mãe da Noiva)', group: 'familia_noiva', status: 'confirmado', tableNumber: 1, createdAt: serverTimestamp() as Timestamp },
    { name: 'Lucas (Irmão da Noiva)', group: 'familia_noiva', status: 'confirmado', tableNumber: 1, createdAt: serverTimestamp() as Timestamp },
    { name: 'Ricardo (Pai do Noivo)', group: 'familia_noivo', status: 'confirmado', tableNumber: 2, createdAt: serverTimestamp() as Timestamp },
    { name: 'Helena (Mãe do Noivo)', group: 'familia_noivo', status: 'confirmado', tableNumber: 2, createdAt: serverTimestamp() as Timestamp },
    { name: 'Isabela e Rafael', group: 'amigos_casal', status: 'confirmado', tableNumber: 3, createdAt: serverTimestamp() as Timestamp },
    { name: 'Mariana', group: 'amigos_casal', status: 'pendente', tableNumber: 0, createdAt: serverTimestamp() as Timestamp },
    { name: 'Thiago', group: 'amigos_casal', status: 'recusado', tableNumber: 0, createdAt: serverTimestamp() as Timestamp },
    { name: 'André (Cerimonialista)', group: 'prestador_servico', status: 'confirmado', tableNumber: 0, createdAt: serverTimestamp() as Timestamp },
];

const budgetCategories = [
    { name: 'Recepção e Festa', createdAt: serverTimestamp() as Timestamp },
    { name: 'Decoração', createdAt: serverTimestamp() as Timestamp },
    { name: 'Foto e Vídeo', createdAt: serverTimestamp() as Timestamp },
];

const budgetItems = [
    { description: 'Aluguel do Espaço', supplier: 'Vinícola Vale dos Sonhos', estimatedCost: 15000, actualCost: 15000, status: 'pago' as const, createdAt: serverTimestamp() as Timestamp, categoryIndex: 0 },
    { description: 'Buffet Completo (100 pessoas)', supplier: 'Sabor & Arte Buffet', estimatedCost: 20000, actualCost: 10000, status: 'parcial' as const, createdAt: serverTimestamp() as Timestamp, categoryIndex: 0 },
    { description: 'Flores e Arranjos', supplier: 'Flor de Lis Decorações', estimatedCost: 7000, actualCost: 0, status: 'pendente' as const, createdAt: serverTimestamp() as Timestamp, categoryIndex: 1 },
    { description: 'Fotógrafo (Cobertura Completa)', supplier: 'Luz Eterna Fotografia', estimatedCost: 8000, actualCost: 4000, status: 'parcial' as const, createdAt: serverTimestamp() as Timestamp, categoryIndex: 2 },
];

const giftSuggestions: Omit<GiftSuggestion, 'id'>[] = [
    { name: 'Jogo de Panelas Tramontina Solar', description: '5 peças, inox', claimed: false, createdAt: serverTimestamp() as Timestamp },
    { name: 'Air Fryer 12L', description: 'Qualquer marca, cor preta', claimed: false, createdAt: serverTimestamp() as Timestamp },
    { name: 'Conjunto de Taças de Cristal', description: 'Para vinho tinto, 6 unidades', claimed: true, createdAt: serverTimestamp() as Timestamp },
    { name: 'Cota para Lua de Mel', description: 'Qualquer valor é bem-vindo!', claimed: false, createdAt: serverTimestamp() as Timestamp },
];

const receivedGifts: Omit<ReceivedGift, 'id'>[] = [
    { giftName: 'Conjunto de Taças de Cristal', giverName: 'Tia Helena', isAnonymous: false, createdAt: serverTimestamp() as Timestamp }
];

const playlist: Omit<PlaylistItem, 'id'>[] = [
    { title: 'Perfect', artist: 'Ed Sheeran', suggestedBy: 'Noiva', youtubeUrl: 'https://www.youtube.com/watch?v=2Vv-BfVoq44', upvotes: 15, downvotes: 1, voters: [], createdAt: serverTimestamp() as Timestamp },
    { title: 'A Thousand Years', artist: 'Christina Perri', suggestedBy: 'Noivo', youtubeUrl: 'https://www.youtube.com/watch?v=rtOvBOTyX00', upvotes: 12, downvotes: 0, voters: [], createdAt: serverTimestamp() as Timestamp },
    { title: 'All of Me', artist: 'John Legend', suggestedBy: 'Amiga da Noiva', youtubeUrl: 'https://www.youtube.com/watch?v=450p7goxZqg', upvotes: 8, downvotes: 2, voters: [], createdAt: serverTimestamp() as Timestamp },
];

const appointments: Omit<Appointment, 'id'>[] = [
    { title: 'Reunião com a cerimonialista', description: 'Alinhamento final dos detalhes', date: getFutureDate(0, -7), createdAt: serverTimestamp() as Timestamp },
    { title: 'Degustação do bolo', description: 'Com a confeitaria Doce Sonho', date: getFutureDate(1, 15), createdAt: serverTimestamp() as Timestamp },
    { title: 'Prova final do vestido', description: 'Ateliê Fio de Ouro', date: getFutureDate(4), createdAt: serverTimestamp() as Timestamp },
];


export async function populateWeddingWithSampleData(weddingId: string) {
    if (!weddingId) {
        console.error("Wedding ID is required to populate sample data.");
        return;
    }

    const batch = writeBatch(db);

    // 1. Update Wedding Details
    const weddingDocRef = doc(db, 'weddings', weddingId);
    batch.update(weddingDocRef, weddingDetails);

    // 2. Populate Task Categories and Tasks
    const categoryIds: string[] = [];
    taskCategories.forEach(categoryData => {
        const categoryDocRef = doc(collection(db, 'weddings', weddingId, 'taskCategories'));
        batch.set(categoryDocRef, categoryData);
        categoryIds.push(categoryDocRef.id);
    });

    tasks.forEach(taskData => {
        const taskDocRef = doc(collection(db, 'weddings', weddingId, 'tasks'));
        const { categoryIndex, ...restOfTaskData } = taskData;
        batch.set(taskDocRef, { ...restOfTaskData, categoryId: categoryIds[categoryIndex] });
    });

    // 3. Populate Guests
    guests.forEach(guestData => {
        const guestDocRef = doc(collection(db, 'weddings', weddingId, 'guests'));
        batch.set(guestDocRef, guestData);
    });

    // 4. Populate Budget Categories and Items
    const budgetCategoryIds: string[] = [];
    budgetCategories.forEach(categoryData => {
        const categoryDocRef = doc(collection(db, 'weddings', weddingId, 'budgetCategories'));
        batch.set(categoryDocRef, categoryData);
        budgetCategoryIds.push(categoryDocRef.id);
    });

    budgetItems.forEach(itemData => {
        const itemDocRef = doc(collection(db, 'weddings', weddingId, 'budgetItems'));
        const { categoryIndex, ...restOfItemData } = itemData;
        batch.set(itemDocRef, { ...restOfItemData, categoryId: budgetCategoryIds[categoryIndex] });
    });
    
    // 5. Populate Gift Suggestions & Received Gifts
    giftSuggestions.forEach(giftData => {
        const giftDocRef = doc(collection(db, 'weddings', weddingId, 'giftSuggestions'));
        batch.set(giftDocRef, giftData);
    });
     receivedGifts.forEach(giftData => {
        const receivedGiftDocRef = doc(collection(db, 'weddings', weddingId, 'receivedGifts'));
        batch.set(receivedGiftDocRef, giftData);
    });

    // 6. Populate Playlist
    playlist.forEach(itemData => {
        const playlistItemDocRef = doc(collection(db, 'weddings', weddingId, 'playlist'));
        batch.set(playlistItemDocRef, itemData);
    });

    // 7. Populate Appointments
    appointments.forEach(appointmentData => {
        const appointmentDocRef = doc(collection(db, 'weddings', weddingId, 'appointments'));
        batch.set(appointmentDocRef, appointmentData);
    });

    // Commit the batch
    await batch.commit();
}
