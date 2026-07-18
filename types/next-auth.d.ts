import type { DefaultSession } from "next-auth";

// Module augmentation so `session.user.role` / `user.role` / `token.role` are
// typed across the app (auth.ts callbacks, proxy.ts RBAC, portal pages).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}
