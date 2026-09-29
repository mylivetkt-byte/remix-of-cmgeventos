import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

function getSupabaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_supabase_url');
    if (custom && custom.trim()) return custom.trim();
  }
  return import.meta.env.VITE_SUPABASE_URL ?? "https://cfochenzkgjahdphgwqp.supabase.co";
}

function getSupabaseKey(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_supabase_key');
    if (custom && custom.trim()) return custom.trim();
  }
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmb2NoZW56a2dqYWhkcGhnd3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTUyNDMsImV4cCI6MjA4OTk5MTI0M30.whws1t0C2_ToQOTzpdEyuV4k4q3_zg41LcnFqiLGpLU";
}

function createDefaultClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  const isNewKey = key.startsWith('sb_publishable_') || key.startsWith('sb_secret_');

  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) {
          new Headers(init.headers).forEach((value, k) => headers.set(k, value));
        }
        if (isNewKey && headers.get('Authorization') === `Bearer ${key}`) {
          headers.delete('Authorization');
        }
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabaseClient = createDefaultClient();

export const supabase = new Proxy({} as ReturnType<typeof createDefaultClient>, {
  get(_, prop, receiver) {
    return Reflect.get(_supabaseClient, prop, receiver);
  },
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'custom_supabase_url' || e.key === 'custom_supabase_key') {
      _supabaseClient = createDefaultClient();
    }
  });
  window.addEventListener('supabase_credentials_updated', () => {
    _supabaseClient = createDefaultClient();
  });
}
