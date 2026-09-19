import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

function validateSupabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("supabase.co")) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL, for example https://xyz.supabase.co");
    }
    if (parsed.pathname !== "/" && parsed.pathname !== "") {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL must be the root Supabase project URL, not a REST or auth path. Use https://<project>.supabase.co",
      );
    }
  } catch (error) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL (${url}). It must be your Supabase project root URL, for example https://xyz.supabase.co`,
    );
  }
}

function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  validateSupabaseUrl(supabaseUrl);

  supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseInstance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
