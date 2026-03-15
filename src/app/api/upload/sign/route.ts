import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "~/server/auth";
import { supabaseAdmin } from "~/lib/supabase-admin";

const ALLOWED_BUCKETS = ["avatars", "task-attachments"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

const bodySchema = z.object({
  bucket: z.enum(ALLOWED_BUCKETS),
  path: z.string().min(1),
  contentType: z.string().min(1),
});

// Max sizes per bucket (bytes)
const MAX_SIZE: Record<AllowedBucket, number> = {
  avatars: 5 * 1024 * 1024,        // 5 MB
  "task-attachments": 20 * 1024 * 1024, // 20 MB
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { bucket, path, contentType } = parsed.data;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error ?? !data) {
    console.error("Supabase sign error:", error);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path: data.path,
    maxBytes: MAX_SIZE[bucket],
  });
}
