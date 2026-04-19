export const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function hasSupabaseConfig() {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}
