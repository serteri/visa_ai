"use client";

/**
 * The LogiVisa Guide launcher (bottom right). It mounts after the page has loaded and the browser is idle, shows a small non-blocking prompt after about
 * 13 seconds or 35% scroll, and loads the panel only when the visitor opens it. The prompt is suppressed for 7 days after a dismissal; the launcher
 * itself stays available. It does not render on checkout, payment, the Assessment form and result, report, account or admin routes.
 */
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { trackGuideEvent } from "@/lib/site-guide/analytics";
import { analyticsPageType, resolvePageContext } from "@/lib/site-guide/page-context";
import { NUDGE_DELAY_MS, readSuppression, shouldNudge, writeDismissal } from "@/lib/site-guide/timing";
import { GuideLauncherView } from "./site-guide-views";

const SiteGuidePanel = dynamic(() => import("./site-guide-panel"), { ssr: false });

export function SiteGuide({ locale }: { locale: string }) {
  const pathname = usePathname() ?? "/";
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const shownRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = `site-guide-${useId().replace(/:/g, "")}`;

  const context = resolvePageContext(pathname, typeof window === "undefined" ? "" : window.location.search);
  const source = analyticsPageType(context);

  // Mount after the page is interactive and the browser is idle: the guide never competes with the first render.
  useEffect(() => {
    const start = () => setReady(true);
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const run = () => (idle ? idle(start, { timeout: 4000 }) : window.setTimeout(start, 1500));
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });
    return () => window.removeEventListener("load", run);
  }, []);

  // A new page: close the panel and allow one prompt on it.
  useEffect(() => {
    setOpen(false);
    setShowNudge(false);
    shownRef.current = false;
  }, [pathname]);

  const hidden = context.hidden;

  useEffect(() => {
    if (!ready || hidden) return;
    trackGuideEvent("site_guide_impression", { sourcePageType: source, country: context.country, interaction: "launcher" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hidden, pathname]);

  // The proactive prompt: about 13 seconds on the page or 35% scroll, whichever comes first.
  useEffect(() => {
    if (!ready || hidden) return;
    const started = Date.now();
    const suppressed = readSuppression(started);
    const check = () => {
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const ratio = window.scrollY / scrollable;
      const nudge = shouldNudge({ hidden, suppressed, elapsedMs: Date.now() - started, scrollRatio: ratio, panelOpen: open, alreadyShown: shownRef.current });
      if (nudge) {
        shownRef.current = true;
        setShowNudge(true);
        trackGuideEvent("site_guide_impression", { sourcePageType: source, country: context.country, interaction: "nudge" });
      }
    };
    const timer = window.setTimeout(check, NUDGE_DELAY_MS);
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hidden, pathname, open]);

  const openPanel = useCallback(() => {
    setOpen(true);
    setShowNudge(false);
    trackGuideEvent("site_guide_open", { sourcePageType: source, country: context.country, interaction: showNudge ? "nudge" : "launcher" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, context.country, showNudge]);

  const closePanel = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  const dismissNudge = useCallback(() => {
    setShowNudge(false);
    writeDismissal(Date.now());
    trackGuideEvent("site_guide_dismiss", { sourcePageType: source, country: context.country, interaction: "dismiss" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, context.country]);

  if (!ready || hidden) return null;

  return (
    <>
      {open ? <SiteGuidePanel locale={locale} context={context} panelId={panelId} onClose={closePanel} /> : null}
      <GuideLauncherView locale={locale} open={open} showNudge={showNudge} onOpen={open ? closePanel : openPanel} onDismissNudge={dismissNudge} buttonRef={buttonRef} panelId={panelId} />
    </>
  );
}
