/**
 * The operator's notification address(es), from ONE environment variable.
 *
 *   ADMIN_NOTIFICATION_EMAIL="serter@logivisa.com,hello@logivisa.com"   (comma separated, any number)
 *
 * Every internal notification (PAID, free-unlock, quick-check lead tier, guide / PDF leads, operator alerts) goes to these addresses. When it is
 * not set, each sender keeps its previous variable and default, so nothing changes until the variable is set. The recipient list is never consulted
 * when deciding whether to send an internal notification (lib/email/suppression.ts: shouldSkipInternalNotification).
 */
const clean = (raw: string | undefined) =>
  (raw ?? "")
    .split(",")
    .map((item) => item.trim().replace(/^["']+|["']+$/g, "").trim())
    .filter(Boolean);

export function adminNotificationRecipients(legacy: { env?: string[]; fallback: string }): string[] {
  const primary = clean(process.env.ADMIN_NOTIFICATION_EMAIL);
  if (primary.length > 0) return primary;
  for (const name of legacy.env ?? []) {
    const value = clean(process.env[name]);
    if (value.length > 0) return value;
  }
  return [legacy.fallback];
}
