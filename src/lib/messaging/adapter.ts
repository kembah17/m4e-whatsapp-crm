/**
 * Abstract messaging adapter interface.
 *
 * Allows the CRM to swap between Supabase (current) and Chatwoot
 * (future) without changing business logic. Every data-access call
 * in the app should go through an adapter obtained from the factory.
 */

// ── Data types ──────────────────────────────────────────────

export interface ContactData {
  id?: string;
  accountId: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  avatarUrl: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageData {
  id?: string;
  conversationId: string;
  contactId?: string;
  direction: 'inbound' | 'outbound';
  content: string;
  contentType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  whatsappMessageId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface ConversationData {
  id?: string;
  accountId: string;
  contactId: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'web';
  status: 'open' | 'pending' | 'resolved' | 'snoozed';
  assigneeId?: string | null;
  lastMessageAt?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationFilters {
  accountId: string;
  status?: ConversationData['status'] | ConversationData['status'][];
  channel?: ConversationData['channel'];
  assigneeId?: string;
  contactId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LabelData {
  id?: string;
  name: string;
  color?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ── Adapter interface ───────────────────────────────────────

export interface MessagingAdapter {
  readonly provider: string;

  // ── Contacts ────────────────────────────────────────────
  createContact(contact: Omit<ContactData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContactData>;
  updateContact(id: string, updates: Partial<ContactData>): Promise<ContactData>;
  getContact(id: string): Promise<ContactData | null>;
  searchContacts(accountId: string, query: string, limit?: number): Promise<ContactData[]>;

  // ── Conversations ───────────────────────────────────────
  createConversation(
    conversation: Omit<ConversationData, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ConversationData>;
  getConversation(id: string): Promise<ConversationData | null>;
  listConversations(filters: ConversationFilters): Promise<PaginatedResult<ConversationData>>;

  // ── Messages ────────────────────────────────────────────
  sendMessage(
    conversationId: string,
    message: Omit<MessageData, 'id' | 'conversationId' | 'createdAt'>,
  ): Promise<MessageData>;
  getMessages(
    conversationId: string,
    options?: { limit?: number; before?: string },
  ): Promise<MessageData[]>;

  // ── Labels / Tags ───────────────────────────────────────
  addLabel(conversationId: string, label: string): Promise<void>;
  removeLabel(conversationId: string, label: string): Promise<void>;

  // ── Assignment ──────────────────────────────────────────
  assignAgent(conversationId: string, agentId: string | null): Promise<void>;
}
