"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  analyticsUrlDecision,
  CONSENT_STORAGE_KEY,
  isQaCookie,
  META_PIXEL_ID,
  parseConsent,
  QA_COOKIE,
  readCookie,
  planAnalytics,
  sanitizeReferrer,
  type ConsentState,
} from "@/lib/analytics/policy";

/**
 * The only place GA4 and the Meta Pixel are loaded. It replaces <GoogleAnalytics> (which sends `page_view` with the real URL, query string and referrer, and
 * follows history changes by itself) and the inline Pixel snippet in the root layout (which ran on every page, including the report pages).
 *
 * Order of the gates, all decided in the browser before a vendor script exists:
 *   1. environment  -- a production deployment AND a production host (lib/analytics/policy.ts); local, Preview and any other host load nothing.
 *   2. QA mode      -- an admin-issued QA cookie loads nothing (the session is not counted).
 *   3. consent      -- GA after "analytics", the Pixel after "marketing"; no stored choice loads nothing.
 *   4. the page     -- private routes send nothing, ever; the checkout success page may only send an explicit, path-only purchase.
 * After loading, every page view is sent by this component with a rebuilt, allow-listed `page_location` and a sanitised `page_referrer`, and the same
 * location is `set` for every other event, so the automatic URL collection never sees a query string.
 */

type LvState = {
  gaId: string | null;
  pixelId: string | null;
  /** The shown page is private, or the session is QA / non-consenting: no hit may leave. */
  blocked: boolean;
  /** Checkout success: only explicit events with a path-only location. */
  restricted: boolean;
  analyticsConsent: boolean;
  marketingConsent: boolean;
  location: string;
};
type W = Window & {
  __lv?: LvState;
  __lvGuards?: boolean;
  dataLayer?: unknown[];
  gtag?: (...a: unknown[]) => void;
  fbq?: ((...a: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown; disablePushState?: boolean; allowDuplicatePageViews?: boolean };
  _fbq?: unknown;
  [k: string]: unknown;
};

const win = () => window as unknown as W;

function readConsent(): ConsentState | null {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** GA is switched off through its documented `ga-disable-<ID>` flag (it stops every hit, including a vendor's own history page views); the Pixel through consent. */
function setDisabled(gaBlocked: boolean, pixelBlocked: boolean = gaBlocked) {
  const w = win();
  if (w.__lv) w.__lv.blocked = gaBlocked;
  const id = w.__lv?.gaId;
  if (id) w[`ga-disable-${id}`] = gaBlocked;
  if (typeof w.fbq === "function") w.fbq("consent", pixelBlocked ? "revoke" : "grant");
}

function loadGa(id: string, initialBlocked: boolean) {
  const w = win();
  if (w.gtag) return;
  w[`ga-disable-${id}`] = initialBlocked;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    (w.dataLayer as unknown[]).push(arguments);
  };
  // Analytics storage only after the visitor chose it; advertising storage and personalisation are never granted (the Pixel has its own consent).
  w.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  w.gtag("js", new Date());
  w.gtag("config", id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

function loadPixel(id: string) {
  const w = win();
  if (w.fbq) return;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else (n.queue as unknown[]).push(args);
  } as NonNullable<W["fbq"]>;
  w.fbq = n;
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  // The Pixel reads document.location itself and cannot be told otherwise, so its own history tracking and "automatic configuration" (button text,
  // page metadata) are off; page views are sent from here, and only for URLs it can see in full without a private parameter.
  n.disablePushState = true;
  n.allowDuplicatePageViews = true;
  n("consent", "revoke");
  n("set", "autoConfig", false, id);
  n("init", id);
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(t);
}

function eraseVendorCookies(prefixes: string[]) {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0].trim();
    if (prefixes.some((p) => name === p || name.startsWith(`${p}_`))) {
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname.replace(/^www\./, ".")}`;
    }
  }
}

/** Sets the "blocked" flag before a navigation to a private or restricted URL completes, so a vendor's own history listener sends nothing for it. */
function installNavigationGuards() {
  const w = win();
  if (w.__lvGuards) return;
  w.__lvGuards = true;
  const guard = (target: unknown) => {
    if (!target || !w.__lv) return;
    const d = analyticsUrlDecision(String(target), window.location.href);
    if (d.kind === "block" || d.kind === "restricted") setDisabled(true);
  };
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method];
    window.history[method] = function (this: History, data: unknown, unused: string, url?: string | URL | null) {
      guard(url);
      return original.call(this, data, unused, url);
    } as History[typeof method];
  }
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target instanceof Element ? e.target : null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      guard(a.href);
    },
    true,
  );
  window.addEventListener("popstate", () => guard(window.location.href), true);
}

export function AnalyticsProvider({ vercelEnv, gaId, pixelId = META_PIXEL_ID, testGaId, testMode }: { vercelEnv?: string; gaId?: string; pixelId?: string; testGaId?: string; testMode?: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [tick, setTick] = useState(0); // bumped when the consent choice changes
  const prev = useRef<{ sent: string; location: string } | null>(null);

  useLayoutEffect(() => {
    const onConsent = () => setTick((t) => t + 1);
    window.addEventListener("lv:consent", onConsent);
    window.addEventListener("storage", onConsent);
    return () => {
      window.removeEventListener("lv:consent", onConsent);
      window.removeEventListener("storage", onConsent);
    };
  }, []);

  useLayoutEffect(() => {
    const w = win();
    const qa = isQaCookie(readCookie(document.cookie, QA_COOKIE));
    const plan = planAnalytics({ env: { hostname: window.location.hostname, vercelEnv, gaId, pixelId, testGaId, testMode }, consent: readConsent(), qa, href: window.location.href });
    const { vendors, analyticsOk, marketingOk, decision } = plan;

    const state: LvState = (w.__lv ??= { gaId: null, pixelId: null, blocked: true, restricted: false, analyticsConsent: false, marketingConsent: false, location: "" });
    // Withdrawn consent: stop sending and remove the vendors' first-party cookies.
    if (state.analyticsConsent && !analyticsOk && state.gaId) {
      w[`ga-disable-${state.gaId}`] = true;
      eraseVendorCookies(["_ga", "_gid", "_gat"]);
    }
    if (state.marketingConsent && !marketingOk && typeof w.fbq === "function") {
      w.fbq("consent", "revoke");
      eraseVendorCookies(["_fbp", "_fbc"]);
    }
    state.analyticsConsent = analyticsOk;
    state.marketingConsent = marketingOk;
    if (!plan.loadGa && !plan.loadPixel) {
      state.blocked = true;
      return;
    }

    if (plan.loadGa && vendors.gaId) {
      state.gaId = vendors.gaId;
      loadGa(vendors.gaId, plan.gaBlocked);
    }
    if (plan.loadPixel && vendors.pixelId) {
      state.pixelId = vendors.pixelId;
      loadPixel(vendors.pixelId);
    }
    installNavigationGuards();

    state.restricted = decision.kind === "restricted";
    // GA also stays off while its consent is withdrawn; the Pixel is never active on the checkout success page (its Purchase is sent from an isolated frame).
    setDisabled(plan.gaBlocked, plan.pixelBlocked);
    if (plan.location === null) {
      prev.current = { sent: "", location: "" };
      state.location = "";
      return;
    }

    const location = plan.location;
    state.location = location;
    const referrer = prev.current ? prev.current.location : sanitizeReferrer(document.referrer);
    if (typeof w.gtag === "function" && state.gaId) w.gtag("set", { page_location: location, page_referrer: referrer });
    if (decision.kind === "restricted") {
      prev.current = { sent: prev.current?.sent ?? "", location: "" };
      return;
    }
    if (prev.current?.sent === location) return;
    prev.current = { sent: location, location };
    if (plan.sendGaPageView && typeof w.gtag === "function" && state.gaId) w.gtag("event", "page_view", { page_location: location, page_referrer: referrer, page_title: document.title });
    if (plan.sendPixelPageView && typeof w.fbq === "function") w.fbq("track", "PageView");
  }, [pathname, search, tick, vercelEnv, gaId, pixelId, testGaId, testMode]);

  return null;
}
