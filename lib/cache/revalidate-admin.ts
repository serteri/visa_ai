import { revalidatePath } from "next/cache";

/**
 * Refreshes the signed-in admin and agent views after a change made there (a note, an agent decision, a monitor run ...).
 *
 * These actions used `revalidatePath("/", "layout")`, which invalidates every cached route on the site. Public pages that are statically generated
 * (the occupation, visa and guide pages in three locales) were then regenerated on their next visit, one Vercel ISR write each. The admin and agent
 * pages are the only routes that show this data, so only their route trees are invalidated.
 */
export async function revalidateAdminViews(): Promise<void> {
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]/agent", "layout");
}
