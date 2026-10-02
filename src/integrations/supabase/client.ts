import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const DEFAULT_SUPABASE_URL = "https://czypeiuywtchqfsnsbem.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_KY8NElnPtYVyB7GRib-Miw_sWyVYQn0";

function getSupabaseUrl(): string {
  // 1. Variable de entorno configurada en build/Vercel/.env
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes("cfochenzkgjahdphgwqp") && !envUrl.includes("enedqugagdewrnmexayz")) {
    return envUrl.trim();
  }

  // 2. LocalStorage si se configuró manualmente
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_supabase_url');
    if (custom && custom.trim() && !custom.includes("cfochenzkgjahdphgwqp") && !custom.includes("enedqugagdewrnmexayz")) {
      return custom.trim();
    }
  }

  // 3. Conexión maestra oficial por defecto
  return DEFAULT_SUPABASE_URL;
}

function getSupabaseKey(): string {
  // 1. Variable de entorno
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (envKey && envKey.trim()) return envKey.trim();

  // 2. LocalStorage si se configuró manualmente
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_supabase_key');
    if (custom && custom.trim()) return custom.trim();
  }

  // 3. Clave maestra oficial por defecto
  return DEFAULT_SUPABASE_KEY;
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
