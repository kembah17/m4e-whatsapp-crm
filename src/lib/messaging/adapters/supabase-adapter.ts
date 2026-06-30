import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  MessagingAdapter,
  ContactData,
  MessageData,
  ConversationData,
  ConversationFilters,
  LabelData,
  PaginatedResult,
} from '../adapter';

/**
 * Supabase-backed messaging adapter.
 *
 * Maps the current CRM data model (contacts, conversations, messages)
 * to the abstract MessagingAdapter interface. Uses the service-role
 * client so it can bypass RLS for server-side operations.
 */
export class SupabaseAdapter implements MessagingAdapter {
  readonly provider = 'supabase';
  private supabase: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    this.supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // ── Contacts ──────────────────────────────────────────────

  async createContact(
    contact: Omit<ContactData, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ContactData> {
    const { data, error } = await this.supabase
      .from('contacts')
      .insert({
        account_id: contact.accountId,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
        avatar_url: contact.avatarUrl,
      })
      .select()
      .single();

    if (error) throw new Error(`createContact failed: ${error.message}`);
    return this.mapContact(data);
  }

  async updateContact(id: string, updates: Partial<ContactData>): Promise<ContactData> {
    const mapped: Record<string, unknown> = {};
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.phone !== undefined) mapped.phone = updates.phone;
    if (updates.email !== undefined) mapped.email = updates.email;
    if (updates.company !== undefined) mapped.company = updates.company;
    if (updates.avatarUrl !== undefined) mapped.avatar_url = updates.avatarUrl;

    const { data, error } = await this.supabase
      .from('contacts')
      .update(mapped)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`updateContact failed: ${error.message}`);
    return this.mapContact(data);
  }

  async getContact(id: string): Promise<ContactData | null> {
    const { data, error } = await this.supabase
      .from('contacts')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`getContact failed: ${error.message}`);
    return data ? this.mapContact(data) : null;
  }

  async searchContacts(
    accountId: string,
    query: string,
    limit = 20,
  ): Promise<ContactData[]> {
    const { data, error } = await this.supabase
      .from('contacts')
      .select()
      .eq('account_id', accountId)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (error) throw new Error(`searchContacts failed: ${error.message}`);
    return (data ?? []).map((r) => this.mapContact(r));
  }

  // ── Conversations ─────────────────────────────────────────

  async createConversation(
    conv: Omit<ConversationData, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ConversationData> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        account_id: conv.accountId,
        contact_id: conv.contactId,
        status: conv.status === 'resolved' ? 'closed' : conv.status,
        assigned_agent_id: conv.assigneeId ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`createConversation failed: ${error.message}`);
    return this.mapConversation(data);
  }

  async getConversation(id: string): Promise<ConversationData | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`getConversation failed: ${error.message}`);
    return data ? this.mapConversation(data) : null;
  }

  async listConversations(
    filters: ConversationFilters,
  ): Promise<PaginatedResult<ConversationData>> {
    let query = this.supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('account_id', filters.accountId);

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      // Map 'resolved' → 'closed' for Supabase schema compatibility
      const mapped = statuses.map((s) => (s === 'resolved' ? 'closed' : s));
      query = query.in('status', mapped);
    }
    if (filters.assigneeId) {
      query = query.eq('assigned_agent_id', filters.assigneeId);
    }
    if (filters.contactId) {
      query = query.eq('contact_id', filters.contactId);
    }

    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    query = query.order('last_message_at', { ascending: false, nullsFirst: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(`listConversations failed: ${error.message}`);

    return {
      data: (data ?? []).map((r) => this.mapConversation(r)),
      total: count ?? 0,
      limit,
      offset,
    };
  }

  // ── Messages ──────────────────────────────────────────────

  async sendMessage(
    conversationId: string,
    message: Omit<MessageData, 'id' | 'conversationId' | 'createdAt'>,
  ): Promise<MessageData> {
    const senderType = message.direction === 'outbound' ? 'agent' : 'customer';

    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: senderType,
        content_type: message.contentType,
        content_text: message.content,
        status: message.status ?? 'sent',
        message_id: message.whatsappMessageId ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`sendMessage failed: ${error.message}`);

    // Update conversation last_message
    await this.supabase
      .from('conversations')
      .update({
        last_message_text: message.content.substring(0, 255),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return this.mapMessage(data);
  }

  async getMessages(
    conversationId: string,
    options?: { limit?: number; before?: string },
  ): Promise<MessageData[]> {
    let query = this.supabase
      .from('messages')
      .select()
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (options?.before) {
      query = query.lt('created_at', options.before);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(`getMessages failed: ${error.message}`);
    return (data ?? []).map((r) => this.mapMessage(r));
  }

  // ── Labels / Tags ─────────────────────────────────────────

  async addLabel(conversationId: string, label: string): Promise<void> {
    // Get conversation to find contact_id
    const conv = await this.getConversation(conversationId);
    if (!conv) throw new Error('Conversation not found');

    // Find or create tag
    const { data: existing } = await this.supabase
      .from('tags')
      .select('id')
      .ilike('name', label)
      .limit(1)
      .maybeSingle();

    let tagId = existing?.id;
    if (!tagId) {
      const { data: created } = await this.supabase
        .from('tags')
        .insert({ name: label, color: '#6366f1' })
        .select('id')
        .single();
      tagId = created?.id;
    }

    if (tagId) {
      await this.supabase
        .from('contact_tags')
        .upsert({ contact_id: conv.contactId, tag_id: tagId })
        .throwOnError();
    }
  }

  async removeLabel(conversationId: string, label: string): Promise<void> {
    const conv = await this.getConversation(conversationId);
    if (!conv) throw new Error('Conversation not found');

    const { data: tag } = await this.supabase
      .from('tags')
      .select('id')
      .ilike('name', label)
      .limit(1)
      .maybeSingle();

    if (tag?.id) {
      await this.supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', conv.contactId)
        .eq('tag_id', tag.id);
    }
  }

  // ── Assignment ────────────────────────────────────────────

  async assignAgent(conversationId: string, agentId: string | null): Promise<void> {
    const { error } = await this.supabase
      .from('conversations')
      .update({ assigned_agent_id: agentId })
      .eq('id', conversationId);

    if (error) throw new Error(`assignAgent failed: ${error.message}`);
  }

  // ── Private mappers ───────────────────────────────────────

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private mapContact(row: any): ContactData {
    return {
      id: row.id,
      accountId: row.account_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      company: row.company,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapConversation(row: any): ConversationData {
    // Map Supabase 'closed' → adapter 'resolved'
    const statusMap: Record<string, ConversationData['status']> = {
      open: 'open',
      pending: 'pending',
      closed: 'resolved',
    };
    return {
      id: row.id,
      accountId: row.account_id,
      contactId: row.contact_id,
      channel: 'whatsapp', // Current system is WhatsApp-only
      status: statusMap[row.status] ?? 'open',
      assigneeId: row.assigned_agent_id,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapMessage(row: any): MessageData {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      direction: row.sender_type === 'customer' ? 'inbound' : 'outbound',
      content: row.content_text ?? '',
      contentType: row.content_type ?? 'text',
      status: row.status,
      whatsappMessageId: row.message_id,
      createdAt: row.created_at,
    };
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
