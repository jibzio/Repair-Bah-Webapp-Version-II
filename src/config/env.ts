export const DEFAULT_SUPABASE_URL = 'https://kgykpamsffhdkhvpfqrn.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_Vm6oqE4qXq-CWLslg1JlcA_cb9vQ54K';
export const MAPBOX_DEMO_TOKEN =
  'pk.eyJ1IjoicmVwYWlyYmFoLXNhYmFoIiwiYSI6ImNtM3JlcGFpcmJhaGRlbW90b2tlbiJ9.demo_sabah_kk';

export const RUNTIME_CONFIG_STORAGE_KEY = 'repairbah_runtime_config_v1';

interface RuntimeConfigOverrides {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  mapboxAccessToken?: string;
  geminiApiKey?: string;
}

export interface ResolvedRuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  mapboxAccessToken: string;
  geminiApiKey: string;
}

function readViteEnv(): Record<string, string | undefined> {
  return (
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
      .env || {}
  );
}

function readLocalOverrides(): RuntimeConfigOverrides {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RuntimeConfigOverrides;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getRuntimeConfig(): ResolvedRuntimeConfig {
  const env = readViteEnv();
  const overrides = readLocalOverrides();

  return {
    supabaseUrl:
      overrides.supabaseUrl?.trim() ||
      env.VITE_SUPABASE_URL?.trim() ||
      DEFAULT_SUPABASE_URL,
    supabaseAnonKey:
      overrides.supabaseAnonKey?.trim() ||
      env.VITE_SUPABASE_ANON_KEY?.trim() ||
      DEFAULT_SUPABASE_ANON_KEY,
    mapboxAccessToken:
      overrides.mapboxAccessToken?.trim() ||
      env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ||
      MAPBOX_DEMO_TOKEN,
    geminiApiKey: overrides.geminiApiKey?.trim() || '',
  };
}

export function saveRuntimeConfigOverride(
  patch: RuntimeConfigOverrides
): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const current = readLocalOverrides();
    const next: RuntimeConfigOverrides = { ...current };
    if (patch.supabaseUrl !== undefined) {
      next.supabaseUrl = patch.supabaseUrl.trim();
    }
    if (patch.supabaseAnonKey !== undefined) {
      next.supabaseAnonKey = patch.supabaseAnonKey.trim();
    }
    if (patch.mapboxAccessToken !== undefined) {
      next.mapboxAccessToken = patch.mapboxAccessToken.trim();
    }
    if (patch.geminiApiKey !== undefined) {
      next.geminiApiKey = patch.geminiApiKey.trim();
    }
    localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
}

export function getMapboxAccessToken(): string {
  return getRuntimeConfig().mapboxAccessToken;
}
