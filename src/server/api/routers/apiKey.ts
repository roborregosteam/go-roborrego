import crypto from "crypto";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function makeToken() {
  return "rbg_" + crypto.randomBytes(32).toString("hex");
}

export const apiKeyRouter = createTRPCRouter({
  // Returns current key metadata (never the plain token)
  getInfo: protectedProcedure.query(async ({ ctx }) => {
    const key = await ctx.db.apiKey.findUnique({
      where: { userId: ctx.session.user.id },
      select: { createdAt: true, expiresAt: true, lastUsedAt: true },
    });
    if (!key) return null;
    return { ...key, isExpired: key.expiresAt < new Date() };
  }),

  // Creates (or replaces) the user's key. Returns the plain token — only time it's shown.
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    const token = makeToken();
    const keyHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TTL_MS);

    await ctx.db.apiKey.upsert({
      where: { userId: ctx.session.user.id },
      create: { userId: ctx.session.user.id, keyHash, expiresAt },
      update: { keyHash, expiresAt, lastUsedAt: null, createdAt: new Date() },
    });

    return { token, expiresAt };
  }),

  revoke: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.apiKey.deleteMany({ where: { userId: ctx.session.user.id } });
  }),
});
