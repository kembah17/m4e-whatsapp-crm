import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { IMPORT_LIMITS } from '@/lib/import/import-limits';

interface BulkContact {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export async function POST(req: NextRequest) {
  try {
    const rlIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`contactImport:${rlIp}`, RATE_LIMITS.contactImport);
    if (!rl.success) return rateLimitResponse(rl);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) {
      return NextResponse.json(
        { error: 'No account found' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { contacts: rawContacts, tagName } = body as {
      contacts: BulkContact[];
      tagName?: string;
    };

    if (!Array.isArray(rawContacts) || rawContacts.length === 0) {
      return NextResponse.json(
        { error: 'contacts array is required and must not be empty' },
        { status: 400 },
      );
    }

    // Enforce bulk import limit
    const limit = IMPORT_LIMITS.session.maxContactsPerSession;
    const originalCount = rawContacts.length;
    let truncated = false;
    let warning: string | undefined;
    let contacts = rawContacts;

    if (contacts.length > limit) {
      warning = `Request contained ${originalCount.toLocaleString()} contacts. Only the first ${limit.toLocaleString()} were processed. Please submit the remaining contacts in a separate request.`;
      contacts = contacts.slice(0, limit);
      truncated = true;
    }

    const accountId = profile.account_id;
    const userId = user.id;

    let imported = 0;
    let duplicates = 0;
    let failed = 0;
    const importedContactIds: string[] = [];

    // Process contacts one by one to handle duplicates gracefully
    for (const c of contacts) {
      if (!c.phone || c.phone.trim().length === 0) {
        failed++;
        continue;
      }

      const phone = c.phone.trim();
      const phoneDigits = phone.replace(/\D/g, '');

      // Check for existing contact with same normalized phone in this account
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('account_id', accountId)
        .eq('phone_normalized', phoneDigits)
        .limit(1)
        .maybeSingle();

      if (existing) {
        duplicates++;
        continue;
      }

      // Insert new contact
      const { data: inserted, error: insertErr } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          account_id: accountId,
          phone,
          name: c.name?.trim() || null,
          email: c.email?.trim() || null,
          company: null,
          avatar_url: null,
        })
        .select('id')
        .single();

      if (insertErr) {
        // Handle unique constraint violation as duplicate
        if (
          insertErr.code === '23505' ||
          insertErr.message?.includes('unique') ||
          insertErr.message?.includes('duplicate')
        ) {
          duplicates++;
        } else {
          console.error('[bulk-import] insert error:', insertErr);
          failed++;
        }
        continue;
      }

      imported++;
      if (inserted?.id) {
        importedContactIds.push(inserted.id);
      }
    }

    // Handle tag assignment if tagName provided
    if (tagName && tagName.trim() && importedContactIds.length > 0) {
      const trimmedTag = tagName.trim();

      // Find or create tag
      let tagId: string | null = null;

      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('account_id', accountId)
        .ilike('name', trimmedTag)
        .limit(1)
        .maybeSingle();

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag } = await supabase
          .from('tags')
          .insert({
            user_id: userId,
            account_id: accountId,
            name: trimmedTag,
            color: '#f59e0b', // amber for import tags
          })
          .select('id')
          .single();

        tagId = newTag?.id ?? null;
      }

      // Assign tag to all imported contacts
      if (tagId) {
        const tagAssignments = importedContactIds.map((contactId) => ({
          contact_id: contactId,
          tag_id: tagId!,
        }));

        // Insert in batches of 100
        for (let i = 0; i < tagAssignments.length; i += 100) {
          const batch = tagAssignments.slice(i, i + 100);
          await supabase.from('contact_tags').insert(batch).throwOnError();
        }
      }
    }

    // Record import history
    await supabase.from('import_history').insert({
      account_id: accountId,
      source: 'csv',
      total_records: contacts.length,
      imported,
      duplicates,
      failed,
      status: 'completed',
      metadata: {
        tag: tagName?.trim() || null,
        imported_by: userId,
      },
    });

    return NextResponse.json({ imported, duplicates, failed, originalCount, truncated, ...(warning && { warning }) });
  } catch (err) {
    console.error('[bulk-import] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bulk import failed' },
      { status: 500 },
    );
  }
}
