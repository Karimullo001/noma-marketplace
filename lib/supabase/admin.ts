import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isServiceRoleConfigured } from "@/lib/config";

/**
 * Server-only privileged client using SUPABASE_SERVICE_ROLE_KEY.
 * NEVER import this module in Client Components.
 */
export function createAdminSupabaseClient(): SupabaseClient | null {
  if (!isServiceRoleConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
