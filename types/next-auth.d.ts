import type { DefaultSession } from "next-auth";

// Module augmentation so `session.user.role` / `user.role` / `token.role` are
// typed across the app (auth.ts callbacks, proxy.ts RBAC, portal pages).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      market?: string;
      approvalStatus?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    market?: string | null;
    approvalStatus?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    market?: string;
    approvalStatus?: string;
  }
}
