import type {
  MessagingAdapter,
  ContactData,
  MessageData,
  ConversationData,
  ConversationFilters,
  PaginatedResult,
} from '../adapter';

/**
 * Chatwoot-backed messaging adapter (stub).
 *
 * Each method documents the correct Chatwoot API v2 endpoint and
 * expected payload. Implementation is deferred until the Chatwoot
 * migration is approved and infrastructure is provisioned.
 *
 * Chatwoot API docs: https://www.chatwoot.com/developers/api/
 * Base URL pattern: https://<instance>.chatwoot.com/api/v2
 */
export class ChatwootAdapter implements MessagingAdapter {
  readonly provider = 'chatwoot';

  private baseUrl: string;
  private apiToken: string;
  private accountId: number;

  constructor() {
    this.baseUrl = process.env.CHATWOOT_BASE_URL ?? '';
    this.apiToken = process.env.CHATWOOT_API_TOKEN ?? '';
    this.accountId = parseInt(process.env.CHATWOOT_ACCOUNT_ID ?? '0', 10);
  }

  // ── Contacts ──────────────────────────────────────────────

  /**
   * POST /api/v1/accounts/{account_id}/contacts
   * Body: { name, email, phone_number, avatar_url, identifier, custom_attributes }
   * Returns: { id, name, email, phone_number, ... }
   */
  async createContact(
    _contact: Omit<ContactData, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ContactData> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  /**
   * PUT /api/v1/accounts/{account_id}/contacts/{contact_id}
   * Body: { name, email, phone_number, avatar_url, custom_attributes }
   * Returns: updated contact object
   */
  async updateContact(
    _id: string,
    _updates: Partial<ContactData>,
  ): Promise<ContactData> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  /**
   * GET /api/v1/accounts/{account_id}/contacts/{contact_id}
   * Returns: contact object with conversations, contact_inboxes
   */
  async getContact(_id: string): Promise<ContactData | null> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  /**
   * GET /api/v1/accounts/{account_id}/contacts/search?q={query}&page=1
   * Returns: { payload: [...contacts], meta: { ... } }
   */
  async searchContacts(
    _accountId: string,
    _query: string,
    _limit?: number,
  ): Promise<ContactData[]> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  // ── Conversations ─────────────────────────────────────────

  /**
   * POST /api/v1/accounts/{account_id}/conversations
   * Body: { source_id, inbox_id, contact_id, status, assignee_id, message: { content } }
   * Returns: { id, inbox_id, contact_last_seen_at, status, ... }
   */
  async createConversation(
    _conv: Omit<ConversationData, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ConversationData> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  /**
   * GET /api/v1/accounts/{account_id}/conversations/{conversation_id}
   * Returns: conversation object with meta, messages
   */
  async getConversation(_id: string): Promise<ConversationData | null> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  /**
   * GET /api/v1/accounts/{account_id}/conversations
   * Query: ?status=open&assignee_type=assigned&page=1
   * Returns: { data: { meta: {}, payload: [...conversations] } }
   */
  async listConversations(
    _filters: ConversationFilters,
  ): Promise<PaginatedResult<ConversationData>> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  // ── Messages ──────────────────────────────────────────────

  /**
   * POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/messages
   * Body: { content, message_type: 'outgoing', content_type: 'text', private: false }
   * Returns: { id, content, message_type, content_type, created_at, ... }
   */
  async sendMessage(
    _conversationId: string,
    _message: Omit<MessageData, 'id' | 'conversationId' | 'createdAt'>,
  ): Promise<MessageData> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  /**
   * GET /api/v1/accounts/{account_id}/conversations/{conversation_id}/messages
   * Query: ?before={timestamp}
   * Returns: { payload: [...messages], meta: { ... } }
   */
  async getMessages(
    _conversationId: string,
    _options?: { limit?: number; before?: string },
  ): Promise<MessageData[]> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  // ── Labels / Tags ─────────────────────────────────────────

  /**
   * POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/labels
   * Body: { labels: ['label_name'] }
   * Note: Chatwoot labels are conversation-level, not contact-level
   */
  async addLabel(
    _conversationId: string,
    _label: string,
  ): Promise<void> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  /**
   * DELETE label from conversation labels array
   * GET labels first, filter out target, PUT remaining
   * PUT /api/v1/accounts/{account_id}/conversations/{conversation_id}/labels
   * Body: { labels: [...remaining_labels] }
   */
  async removeLabel(
    _conversationId: string,
    _label: string,
  ): Promise<void> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }

  // ── Assignment ────────────────────────────────────────────

  /**
   * POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/assignments
   * Body: { assignee_id: agent_id } or { assignee_id: null } to unassign
   * Returns: updated conversation object
   */
  async assignAgent(
    _conversationId: string,
    _agentId: string | null,
  ): Promise<void> {
    throw new Error('Not implemented - Chatwoot migration pending');
  }
}
