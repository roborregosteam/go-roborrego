import { createClient } from "@supabase/supabase-js";
import { env } from "~/env.js";

// Browser-safe client (uses anon key)
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;

export function getPublicUrl(bucket: string, path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
