import { after } from "next/server";

import { sendRestoreEmail } from "@/lib/email/chat-restore";
import { prisma } from "@/lib/prisma";
import { getStripeBaseUrl } from "@/lib/stripe";

import type { RestoreDeps } from "./restore";
import { prismaRestoreStore } from "./stores";

export function realRestoreDeps(): RestoreDeps {
  return {
    store: prismaRestoreStore(prisma),
    sendEmail: sendRestoreEmail,
    defer: (task) => after(task),
    now: () => new Date(),
    baseUrl: getStripeBaseUrl(),
  };
}
