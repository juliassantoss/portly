import { hasSupabaseConfig, supabaseConfig } from "./config";

export type SupabaseSetupState =
  | { configured: false; reason: string }
  | { configured: true; url: string };

export function getSupabaseSetupState(): SupabaseSetupState {
  if (!hasSupabaseConfig()) {
    return {
      configured: false,
      reason: "Define EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  return {
    configured: true,
    url: supabaseConfig.url,
  };
}
