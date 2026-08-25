import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import Email from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationRequest } from "@/lib/email/magic-link";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    // 5-minute idle timeout for the portal (ADMIN/AGENT). maxAge is the JWT's
    // lifetime from its last (re-)issue; updateAge: 0 makes every request that
    // hits an `auth()` call re-issue the token, so activity keeps sliding the
    // window forward. No activity for 5 minutes -> the token's exp lapses ->
    // auth() returns null on the next request -> proxy.ts's role-gate sends
    // the user back to /login, closing the "stale cookie left open" gap.
    maxAge: 5 * 60,
    updateAge: 0,
  },
  pages: {
    signIn: "/en/sign-in",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    // Passwordless "magic link" sign-in for the consumer Visa Vault
    // (app/[locale]/(main)/sign-in). Uses the id "email" (this provider's
    // default), so the client calls signIn("email", { email }). Delivery is
    // via Resend, not SMTP -- sendVerificationRequest below fully replaces
    // the provider's default nodemailer-based send path (see
    // lib/email/magic-link.ts), so `server` is never actually connected to.
    // It still has to be set to *something* though: the underlying
    // Nodemailer() provider factory throws at construction time (which
    // happens on every request, including in proxy.ts's Edge middleware)
    // if `server` is missing, regardless of whether sendVerificationRequest
    // is overridden. Token storage/verification is handled by PrismaAdapter
    // against the VerificationToken model already in prisma/schema.prisma.
    Email({
      server: { host: "smtp.resend.com", port: 465, auth: { user: "resend", pass: "unused" } },
      from: "LogiVisa <noreply@logivisa.com>",
      maxAge: 10 * 60, // 10 minutes -- link is single-use and short-lived
      sendVerificationRequest: ({ identifier, url }) => sendVerificationRequest({ identifier, url }),
    }),
    Credentials({
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          market: user.market,
          approvalStatus: user.approvalStatus,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      // Persist the role in the JWT on sign-in. `user` carries it from the
      // Credentials authorize() above and from the Prisma adapter (Google),
      // both of which include the users.role column. On later requests `user`
      // is undefined and the existing token.role is preserved.
      if (user && "role" in user && user.role) token.role = user.role as string;
      if (user && "market" in user && user.market) token.market = user.market as string;
      if (user && "approvalStatus" in user && user.approvalStatus) {
        token.approvalStatus = user.approvalStatus as string;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role as string;
      if (token.market) session.user.market = token.market as string;
      if (token.approvalStatus) session.user.approvalStatus = token.approvalStatus as string;
      return session;
    },
  },
});
