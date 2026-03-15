import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "~/env.js";

// Server-only client with service role key — never expose to the browser
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
