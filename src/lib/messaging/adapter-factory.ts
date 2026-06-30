import type { MessagingAdapter } from './adapter';
import { SupabaseAdapter } from './adapters/supabase-adapter';
import { ChatwootAdapter } from './adapters/chatwoot-adapter';

type ProviderName = 'supabase' | 'chatwoot';

let cachedAdapter: MessagingAdapter | null = null;
let cachedProvider: ProviderName | null = null;

/**
 * Return a singleton MessagingAdapter based on the MESSAGING_PROVIDER
 * environment variable. Defaults to 'supabase' when unset.
 *
 * The adapter is cached for the lifetime of the process so that
 * connection pools and internal state are reused across requests.
 */
export function getMessagingAdapter(): MessagingAdapter {
  const provider = (process.env.MESSAGING_PROVIDER ?? 'supabase') as ProviderName;

  // Return cached instance if provider hasn't changed
  if (cachedAdapter && cachedProvider === provider) {
    return cachedAdapter;
  }

  switch (provider) {
    case 'chatwoot':
      cachedAdapter = new ChatwootAdapter();
      break;
    case 'supabase':
    default:
      cachedAdapter = new SupabaseAdapter();
      break;
  }

  cachedProvider = provider;
  return cachedAdapter;
}

/**
 * Reset the cached adapter. Useful for testing or when
 * environment variables change at runtime.
 */
export function resetMessagingAdapter(): void {
  cachedAdapter = null;
  cachedProvider = null;
}
