import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "VIEWER" | "MEMBER" | "ADMIN";
    } & DefaultSession["user"];
  }
}

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db) as any,
  callbacks: {
    async signIn({ user }) {
      // Bootstrap: if no users exist yet, allow the first sign-in
      const userCount = await db.user.count();
      if (userCount === 0) return true;

      // Otherwise only allow emails that have been pre-registered by an admin
      const registered = await db.user.findUnique({
        where: { email: user.email ?? undefined },
        select: { id: true },
      });
      return !!registered;
    },
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        role:
          (user as { role?: "VIEWER" | "MEMBER" | "ADMIN" }).role ?? "VIEWER",
      },
    }),
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }
    },
  },
} satisfies NextAuthConfig;
