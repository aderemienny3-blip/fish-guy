import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";

/**
 * Customer auth, kept separate from your existing admin auth.ts.
 * Mounted at /api/customer-auth so it never collides with admin routes.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/customer-auth",
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [
    Google,
    Credentials({
      id: "phone-otp",
      name: "Phone",
      credentials: { phone: {}, code: {} },
      async authorize(creds) {
        const phone = await verifyOtp(String(creds?.phone ?? ""), String(creds?.code ?? ""));
        if (!phone) return null;
        const customer = await db.customer.upsert({
          where: { phone },
          update: {},
          create: { phone },
        });
        return { id: customer.id, name: customer.name, email: customer.email };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        await db.customer.upsert({
          where: { email: profile.email },
          update: { name: profile.name ?? undefined },
          create: { email: profile.email, name: profile.name ?? null },
        });
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const c = await db.customer.findUnique({ where: { email: profile.email } });
        token.customerId = c?.id;
      } else if (user?.id) {
        token.customerId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as { customerId?: string }).customerId = token.customerId as string | undefined;
      return session;
    },
  },
});
