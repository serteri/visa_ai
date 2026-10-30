/**
 * Analytics policy: which environment may send analytics at all, which URLs may reach a vendor, and the consent / QA flags. Pure functions (no
 * window access) so the rules are unit-tested (scripts/test-analytics-privacy.ts); the browser wiring is components/analytics/analytics-provider.tsx.
 *
 * Why URLs need a policy: GA4 and the Meta Pixel collect the page URL (and the referrer) automatically, including the query string. Report links carry
 * an access token (`/full-check/result?reportId=…&t=…`), the checkout success URL carries the Stripe session id, and `?ref=` carries an agent id. Removing
 * parameters from our own custom events does not stop that automatic collection, so every location a vendor sees is rebuilt here from an allow-list.
 */

export const PRODUCTION_ANALYTICS_HOSTS = ["www.logivisa.com", "logivisa.com"] as const;
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1499026238624549";

// ── Environment ───────────────────────────────────────────────────────────────

export type AnalyticsEnvInput = {
  /** window.location.hostname */
  hostname: string;
  /** VERCEL_ENV of the build ("production" | "preview" | "development" | undefined), passed from the server layout. */
  vercelEnv: string | undefined;
  gaId?: string;
  pixelId?: string;
  /** A separate GA4 property for testing; only ever used off production, and only with `testMode`. */
  testGaId?: string;
  testMode?: boolean;
};
export type AnalyticsVendors = { environment: "production" | "test" | "off"; gaId: string | null; pixelId: string | null };

const GA_ID = /^G-[A-Z0-9]{6,14}$/;
const PIXEL_ID = /^\d{8,20}$/;

/**
 * Production analytics need BOTH a production deployment (VERCEL_ENV, not NODE_ENV: Vercel Preview builds are NODE_ENV=production) AND a production host.
 * A local `next build` that pulled the production env (VERCEL_ENV=production) is still stopped by the host check; a Preview URL is stopped by both.
 * Off production, only an explicitly configured test property can receive anything, and the Meta Pixel never loads.
 */
export function resolveAnalyticsVendors(input: AnalyticsEnvInput): AnalyticsVendors {
  const host = input.hostname.toLowerCase();
  const gaId = input.gaId?.trim();
  const pixelId = input.pixelId?.trim();
  const isProdHost = (PRODUCTION_ANALYTICS_HOSTS as readonly string[]).includes(host);
  if (isProdHost && input.vercelEnv === "production") {
    return { environment: "production", gaId: gaId && GA_ID.test(gaId) ? gaId : null, pixelId: pixelId && PIXEL_ID.test(pixelId) ? pixelId : null };
  }
  const testGa = input.testGaId?.trim();
  if (!isProdHost && input.testMode && testGa && GA_ID.test(testGa) && testGa !== gaId) {
    return { environment: "test", gaId: testGa, pixelId: null };
  }
  return { environment: "off", gaId: null, pixelId: null };
}

// ── URL policy ────────────────────────────────────────────────────────────────

const LOCALE_PREFIX = /^\/(en|tr|zh-Hans)(?=\/|$)/;
export const stripLocale = (pathname: string): string => pathname.replace(LOCALE_PREFIX, "") || "/";

/** Routes whose documents or URLs are personal or carry credentials: no analytics hit may be sent while one is shown. */
const PRIVATE_PREFIXES = ["/full-check/result", "/results", "/reports", "/dashboard", "/admin", "/admin-tools", "/agent", "/sign-in", "/login", "/register", "/journey", "/api"];
/** The checkout success page carries the Stripe session id. No page view is sent from it; a verified purchase may be, with a path-only location (see analytics-provider). */
const RESTRICTED_PREFIXES = ["/checkout"];

/** Query keys that mean "this URL is sensitive": a public route carrying one sends nothing at all. (`ref` / `agentId` affiliate ids are not a credential: the allow-list simply drops them.) */
const SENSITIVE_KEY = /^(t|token|access_token|id_token|refresh_token|session_id|sessionid|session|reportid|report_id|code|state|restore|key|secret|password|auth|callbackurl|email|e-mail|name|full_name|fullname|first_name|last_name|phone|mobile|answers?|userid|user_id|leadid|lead_id|assessmentid|payment_intent|payment_intent_client_secret)$/i;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const SAFE_TOKEN = /^[A-Za-z0-9._~-]{1,64}$/;

export type UrlDecision =
  | { kind: "allow"; location: string; path: string }
  | { kind: "restricted"; location: string; path: string } // vendors may load, but only an explicit event with this path-only location may be sent
  | { kind: "block"; reason: "private-route" | "sensitive-query" | "prefilled-form" | "invalid" };

/** The one decision every analytics path asks: may a vendor see this page, and if so as which (rebuilt, allow-listed) location? */
export function analyticsUrlDecision(raw: string, base = "https://www.logivisa.com"): UrlDecision {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return { kind: "block", reason: "invalid" };
  }
  const rel = stripLocale(url.pathname);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const under = (prefixes: string[]) => prefixes.some((p) => rel === p || rel.startsWith(`${p}/`));
  if (under(PRIVATE_PREFIXES)) return { kind: "block", reason: "private-route" };
  if (under(RESTRICTED_PREFIXES)) return { kind: "restricted", location: `${url.origin}${path}`, path };
  const keys = [...url.searchParams.keys()];
  if (rel === "/full-check" && keys.some((k) => !k.toLowerCase().startsWith("utm_"))) return { kind: "block", reason: "prefilled-form" };
  if (keys.some((k) => SENSITIVE_KEY.test(k))) return { kind: "block", reason: "sensitive-query" };
  const kept = new URLSearchParams();
  for (const [k, v] of url.searchParams) {
    const key = k.toLowerCase();
    if ((UTM_KEYS as readonly string[]).includes(key) && SAFE_TOKEN.test(v)) kept.set(key, v);
    else if ((key === "occupation" || key === "q") && /^\d{6}$/.test(v)) kept.set(key, v);
  }
  const qs = kept.toString();
  return { kind: "allow", location: `${url.origin}${path}${qs ? `?${qs}` : ""}`, path };
}

/**
 * The referrer a vendor may see. A cross-origin referrer is already reduced by the browser (strict-origin-when-cross-origin sends the origin only); a
 * same-origin referrer is the full previous URL, which can be a private one, so it goes through the same policy and is dropped when the page was private.
 */
export function sanitizeReferrer(referrer: string, siteOrigin = "https://www.logivisa.com"): string {
  if (!referrer) return "";
  try {
    const r = new URL(referrer);
    if (r.origin !== siteOrigin && !(PRODUCTION_ANALYTICS_HOSTS as readonly string[]).includes(r.hostname)) return `${r.origin}/`;
    const d = analyticsUrlDecision(referrer, siteOrigin);
    return d.kind === "allow" ? d.location : d.kind === "restricted" ? d.location : "";
  } catch {
    return "";
  }
}

/** Can a hit from this page be sent at all (a vendor is loaded and the page is not private)? */
export const isBlockedLocation = (raw: string, base?: string): boolean => analyticsUrlDecision(raw, base).kind === "block";

// ── The combined decision ─────────────────────────────────────────────────────

export type AnalyticsPlan = {
  vendors: AnalyticsVendors;
  analyticsOk: boolean;
  marketingOk: boolean;
  decision: UrlDecision;
  /** The rebuilt location for hits, or null on a private page. */
  location: string | null;
  loadGa: boolean;
  loadPixel: boolean;
  gaBlocked: boolean;
  pixelBlocked: boolean;
  sendGaPageView: boolean;
  /** The Pixel sends document.location itself, so a page view is sent only when nothing had to be removed from the URL. */
  sendPixelPageView: boolean;
};

/**
 * Every gate in one pure function: environment, QA session, consent and the page's URL. The browser provider only carries the result out, so the whole
 * policy is covered by tests (scripts/test-analytics-privacy.ts) without a browser.
 */
export function planAnalytics(i: { env: AnalyticsEnvInput; consent: ConsentState | null; qa: boolean; href: string }): AnalyticsPlan {
  const vendors = resolveAnalyticsVendors(i.env);
  const analyticsOk = Boolean(vendors.gaId && i.consent?.analytics && !i.qa);
  const marketingOk = Boolean(vendors.pixelId && i.consent?.marketing && !i.qa);
  const decision = analyticsUrlDecision(i.href);
  const blocked = decision.kind === "block";
  const location = blocked ? null : decision.location;
  const noHash = i.href.split("#")[0];
  const cleanForPixel = location !== null && (noHash === location || noHash === `${location}/`);
  return {
    vendors,
    analyticsOk,
    marketingOk,
    decision,
    location,
    loadGa: analyticsOk,
    loadPixel: marketingOk,
    gaBlocked: blocked || !analyticsOk,
    pixelBlocked: blocked || !marketingOk || decision.kind === "restricted",
    sendGaPageView: analyticsOk && decision.kind === "allow",
    sendPixelPageView: marketingOk && decision.kind === "allow" && cleanForPixel,
  };
}

// ── Consent ───────────────────────────────────────────────────────────────────

export const CONSENT_STORAGE_KEY = "lv_consent_v1";
export const CONSENT_COOKIE = "lv_consent";
export type ConsentState = { v: 1; analytics: boolean; marketing: boolean; ts: number };

export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  try {
    const x = JSON.parse(raw) as Partial<ConsentState>;
    if (x && x.v === 1 && typeof x.analytics === "boolean" && typeof x.marketing === "boolean" && typeof x.ts === "number") return { v: 1, analytics: x.analytics, marketing: x.marketing, ts: x.ts };
  } catch {
    /* fall through */
  }
  return null;
}
export const makeConsent = (analytics: boolean, marketing: boolean, now = Date.now()): ConsentState => ({ v: 1, analytics, marketing, ts: now });
/** The cookie mirrors the choice so the server can honour it (the checkout success page); it holds no identifier. */
export const consentCookieValue = (c: ConsentState): string => `${c.analytics ? "a" : "-"}${c.marketing ? "m" : "-"}`;
export const marketingConsentFromCookie = (cookieValue: string | undefined): boolean => Boolean(cookieValue && cookieValue[1] === "m");

// ── QA mode ───────────────────────────────────────────────────────────────────

export const QA_COOKIE = "lv_qa";
export const QA_MAX_AGE_SECONDS = 8 * 60 * 60;
/** A QA cookie is only ever issued by the admin-only server action (app/[locale]/(portal)/admin/qa-mode). It suppresses analytics for that browser; it grants nothing. */
export function isQaCookie(value: string | undefined | null, now = Date.now()): boolean {
  const m = /^v1\.(\d{10,13})$/.exec(value ?? "");
  if (!m) return false;
  const issued = Number(m[1]) < 1e12 ? Number(m[1]) * 1000 : Number(m[1]);
  return issued <= now + 60_000 && now - issued <= QA_MAX_AGE_SECONDS * 1000;
}
export const makeQaCookieValue = (now = Date.now()): string => `v1.${Math.floor(now / 1000)}`;
export function readCookie(cookieString: string, name: string): string | undefined {
  for (const part of cookieString.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}
