import type { Timestamp } from 'firebase/firestore';

export type AppRole = 'super_admin' | 'bride' | 'groom' | 'collaborator' | 'guest';

export interface AppUser {
  id?: string; // User UID
  name?: string;
  photoUrl?: string;
  dateOfBirth?: Timestamp;
  contactEmail?: string;
  contactPhone?: string;
  role?: AppRole;
  weddingIds?: string[]; // IDs of the wedding sub-accounts the user has access to
  activeWeddingId?: string | null; // The currently selected wedding
  createdAt?: Timestamp; // Added for notification triggers
}

export interface WeddingData {
  id?: string; // Auto-generated ID
  groomName: string;
  brideName: string;
  weddingDate: Timestamp;
  weddingLocation: string;
  coverPhotoUrl: string;
  totalBudget?: number;
}

export interface TaskCategory {
  id: string;
  name: string;
  createdAt: Timestamp;
}

export interface Task {
  id:string;
  categoryId: string;
  text: string;
  completed: boolean;
  createdAt: Timestamp;
}

export type GuestGroup = 'familia_noiva' | 'familia_noivo' | 'amigos_casal' | 'colegas_trabalho' | 'prestador_servico';
export type GuestStatus = 'pendente' | 'confirmado' | 'recusado';

export interface Guest {
  id: string;
  name: string;
  group: GuestGroup;
  status: GuestStatus;
  tableNumber: number;
  createdAt: Timestamp;
}

export interface BudgetCategory {
  id: string;
  name: string;
  createdAt: Timestamp;
}

export type BudgetItemStatus = 'pendente' | 'pago' | 'parcial';

export interface BudgetItem {
  id: string;
  categoryId: string;
  description: string;
  supplier?: string;
  estimatedCost: number;
  actualCost: number;
  status: BudgetItemStatus;
  createdAt: Timestamp;
}

export interface GiftSuggestion {
  id: string;
  name: string;
  description?: string;
  claimed: boolean;
  createdAt: Timestamp;
}

export interface ReceivedGift {
  id: string;
  giftName: string;
  giverName: string;
  isAnonymous: boolean;
  createdAt: Timestamp;
}

export interface WeddingVow {
  id: string;
  title: string;
  text: string;
  generatedWithAI: boolean;
  createdAt: Timestamp;
}

export interface PlaylistItem {
  id: string;
  title: string;
  artist: string;
  suggestedBy: string;
  youtubeUrl: string;
  upvotes: number;
  downvotes: number;
  voters: string[]; // Array of user UIDs who have voted
  createdAt: Timestamp;
}

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  date: Timestamp;
  createdAt: Timestamp;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isLoading?: boolean;
}

export interface Devotional {
  id: string;
  date: Timestamp;
  title: string;
  verse: string;
  reflection: string;
  prayer: string;
  completed: boolean;
  isFavorite?: boolean;
  isDaily?: boolean;
}

export interface Invitation {
  id: string;
  name: string;
  email: string;
  weddingId: string | null;
  role: AppRole;
  status: 'pending' | 'claimed';
  createdAt: Timestamp;
  claimedAt?: Timestamp;
  claimedBy?: string; // UID of the user who claimed it
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: Timestamp;
  description: string;
  imageUrl: string;
  createdAt: Timestamp;
}

export interface TimeCapsuleItem {
  id: string;
  message: string;
  imageUrl?: string;
  senderName: string;
  senderUid: string;
  createdAt: Timestamp;
}

export interface InspirationCategory {
  id: string;
  name: string;
  createdAt: Timestamp;
}

export interface Inspiration {
  id: string;
  categoryId: string;
  imageUrl: string;
  notes?: string;
  link?: string;
  createdAt: Timestamp;
}

export interface InspirationComment {
  id: string;
  text: string;
  authorUid: string;
  authorName?: string;
  authorRole: 'bride' | 'groom';
  createdAt: Timestamp;
}

export interface HomeTrousseauCategory {
  id: string;
  name: string;
  createdAt: Timestamp;
}

export type HomeTrousseauItemStatus = 'needed' | 'have' | 'gifted';

export interface HomeTrousseauItem {
  id: string;
  categoryId: string;
  name: string;
  notes?: string;
  link?: string;
  imageUrl?: string;
  status: HomeTrousseauItemStatus;
  createdAt: Timestamp;
}


export interface ApiToken {
  id: string;
  name: string;
  token: string;
  createdAt: Timestamp;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  events: {
    guestRsvp: boolean;
    taskCompleted: boolean;
    budgetItemAdded: boolean;
    giftReceived: boolean;
    songSuggested: boolean;
  };
  createdAt: Timestamp;
}

export interface WebhookLog {
  id: string;
  timestamp: Timestamp;
  eventType: string;
  payload: string;
  responseStatus: number;
  responseBody: string;
  success: boolean;
}

// ---- NOTIFICATION TYPES ----

// A static notification sent manually by the admin.
export interface Notification {
  id: string;
  title: string;
  description: string;
  target: 'all' | 'couples';
  buttonLabel?: string;
  buttonUrl?: string;
  createdAt: Timestamp;
}

// A rule for a notification that should be triggered automatically.
export interface NotificationCampaign {
  id: string;
  name: string; // For admin identification, e.g., "Lembrete 15 dias antes"
  title: string;
  description: string;
  buttonLabel?: string;
  buttonUrl?: string;
  
  triggerType: 'relativeToSignup' | 'relativeToWeddingDate';
  offsetDays: number; // e.g., 5 for 5 days AFTER, -15 for 15 days BEFORE
  
  isActive: boolean;
  createdAt: Timestamp;
}


// A user-specific state for a notification (read/deleted).
// Stored in a subcollection under the user document.
export interface UserNotificationState {
  id: string; // Corresponds to Notification.id or NotificationCampaign.id
  read?: boolean;
  deleted?: boolean;
}
