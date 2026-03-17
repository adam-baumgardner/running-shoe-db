import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
