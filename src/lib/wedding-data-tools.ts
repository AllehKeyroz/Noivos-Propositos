import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { Guest, BudgetItem, Task, PlaylistItem, WeddingVow, Appointment, WeddingData, AppUser, TaskCategory, BudgetCategory, GiftSuggestion, ReceivedGift, Devotional, TimelineEvent, TimeCapsuleItem } from './types';

/**
 * Busca todos os dados relacionados ao casamento de um usuário no Firestore.
 * @param uid O ID do usuário.
 * @returns Um objeto consolidado com todos os dados do casamento.
 */
export async function fetchAllWeddingData(uid: string) {
  if (!uid) {
    throw new Error("User ID (uid) is required.");
  }

  try {
    // 1. Fetch user profile to get their assigned activeWeddingId
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
       return { error: "User profile not found." };
    }
    const profileData = userDocSnap.data() as AppUser;
    const weddingId = profileData.activeWeddingId;

    if (!weddingId) {
        return { error: "Nenhum casamento ativo selecionado. Por favor, selecione um casamento no painel para interagir com o assistente." };
    }

    // 2. Fetch all data for the assigned wedding
    const weddingDocRef = doc(db, 'weddings', weddingId);
    
    const collectionsToFetch = {
      guests: query(collection(db, 'weddings', weddingId, 'guests'), orderBy('name', 'asc')),
      budgetItems: query(collection(db, 'weddings', weddingId, 'budgetItems'), orderBy('createdAt', 'asc')),
      budgetCategories: query(collection(db, 'weddings', weddingId, 'budgetCategories'), orderBy('name', 'asc')),
      tasks: query(collection(db, 'weddings', weddingId, 'tasks'), orderBy('createdAt', 'asc')),
      taskCategories: query(collection(db, 'weddings', weddingId, 'taskCategories'), orderBy('name', 'asc')),
      playlist: query(collection(db, 'weddings', weddingId, 'playlist'), orderBy('createdAt', 'desc')),
      vows: query(collection(db, 'weddings', weddingId, 'vows'), orderBy('createdAt', 'desc')),
      appointments: query(collection(db, 'weddings', weddingId, 'appointments'), orderBy('date', 'asc')),
      giftSuggestions: query(collection(db, 'weddings', weddingId, 'giftSuggestions'), orderBy('name', 'asc')),
      receivedGifts: query(collection(db, 'weddings', weddingId, 'receivedGifts'), orderBy('createdAt', 'desc')),
      devotionals: query(collection(db, 'weddings', weddingId, 'devotionals'), orderBy('date', 'desc')),
      timelineEvents: query(collection(db, 'weddings', weddingId, 'timelineEvents'), orderBy('date', 'asc')),
      timeCapsuleItems: query(collection(db, 'weddings', weddingId, 'timeCapsuleItems'), orderBy('createdAt', 'asc')),
    };
    
    const [
      weddingDocSnap,
      guestsSnap,
      budgetItemsSnap,
      budgetCategoriesSnap,
      tasksSnap,
      taskCategoriesSnap,
      playlistSnap,
      vowsSnap,
      appointmentsSnap,
      giftSuggestionsSnap,
      receivedGiftsSnap,
      devotionalsSnap,
      timelineEventsSnap,
      timeCapsuleItemsSnap,
    ] = await Promise.all([
        getDoc(weddingDocRef),
        ...Object.values(collectionsToFetch).map(q => getDocs(q))
    ]);

    const weddingData = weddingDocSnap.exists() ? (weddingDocSnap.data() as WeddingData) : null;
    
    const guests = guestsSnap.docs.map(d => ({id: d.id, ...d.data()})) as Guest[];
    const budgetItems = budgetItemsSnap.docs.map(d => ({id: d.id, ...d.data()})) as BudgetItem[];
    const budgetCategories = budgetCategoriesSnap.docs.map(d => ({id: d.id, ...d.data()})) as BudgetCategory[];
    const tasks = tasksSnap.docs.map(d => ({id: d.id, ...d.data()})) as Task[];
    const taskCategories = taskCategoriesSnap.docs.map(d => ({id: d.id, ...d.data()})) as TaskCategory[];
    const playlist = playlistSnap.docs.map(s => ({id: s.id, ...s.data()})) as PlaylistItem[];
    const vows = vowsSnap.docs.map(d => ({id: d.id, ...d.data()})) as WeddingVow[];
    const appointments = appointmentsSnap.docs.map(d => ({id: d.id, ...d.data()})) as Appointment[];
    const giftSuggestions = giftSuggestionsSnap.docs.map(d => ({id: d.id, ...d.data()})) as GiftSuggestion[];
    const receivedGifts = receivedGiftsSnap.docs.map(d => ({id: d.id, ...d.data()})) as ReceivedGift[];
    const devotionals = devotionalsSnap.docs.map(d => ({id: d.id, ...d.data()})) as Devotional[];
    
    // Remove heavy image data before sending to LLM
    const timelineEvents = timelineEventsSnap.docs.map(d => {
        const event = {id: d.id, ...d.data()} as TimelineEvent;
        if (event.imageUrl) {
            event.imageUrl = "[imagem presente]";
        }
        return event;
    });
    const timeCapsuleItems = timeCapsuleItemsSnap.docs.map(d => {
        const item = {id: d.id, ...d.data()} as TimeCapsuleItem;
        if (item.imageUrl) {
            item.imageUrl = "[imagem presente]";
        }
        return item;
    });

    // Retorna um objeto completo para o LLM consumir
    return {
      userProfile: {
        id: userDocSnap.id,
        name: profileData.name,
        role: profileData.role,
      },
      weddingDetails: weddingData ? {
        id: weddingDocSnap.id,
        ...weddingData,
        weddingDate: weddingData.weddingDate.toDate().toISOString(),
      } : null,
      guests,
      budgetItems,
      budgetCategories,
      tasks,
      taskCategories,
      playlist,
      vows,
      appointments,
      giftSuggestions,
      receivedGifts,
      devotionals,
      timelineEvents,
      timeCapsuleItems,
    };

  } catch (error) {
    console.error("Error fetching wedding data:", error);
    // Retornar uma mensagem de erro que o LLM pode usar
    return { error: "Failed to fetch wedding data. Inform the user there was an issue connecting to the database." };
  }
}
