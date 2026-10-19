/**
 * Page-load events must not be lost. On production, occupation_page_view / comparison_page_view fire on mount, before the GoogleAnalytics component has
 * initialised gtag; @next/third-parties' sendGAEvent then logs "GA has not been initialized" and drops them (observed 2026-10-19). trackEvent now queues
 * until window.gtag exists. Database-free; fakes a browser window.
 */
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_GA_ID = "G-TESTQUEUE";
const calls: unknown[][] = [];
const win: Record<string, unknown> = {};
(globalThis as unknown as { window: unknown }).window = win;

async function main() {
  const { trackEvent } = await import("../lib/analytics/events");
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // 1. fired before gtag exists: nothing is sent yet, nothing throws
  trackEvent("occupation_page_view", { occupation_code: "351311", locale: "en", email: "x@example.com", report_id: "private" });
  assert.equal(calls.length, 0);

  // 2. gtag appears later (as the GoogleAnalytics script initialises): the queued event is sent, sanitised
  win.gtag = (...args: unknown[]) => calls.push(args);
  await wait(450);
  assert.equal(calls.length, 1, "queued event was not sent once gtag existed");
  assert.deepEqual(calls[0], ["event", "occupation_page_view", { occupation_code: "351311", locale: "en" }]);

  // 3. gtag already there: sent immediately
  trackEvent("comparison_page_view", { locale: "tr", page_type: "visa_comparison" });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], ["event", "comparison_page_view", { locale: "tr", page_type: "visa_comparison" }]);

  // 4. the disable flag set after queueing (private assessment pages) drops the event at send time
  delete win.gtag;
  trackEvent("occupation_tool_click", { occupation_code: "351311", destination: "skills_assessment" });
  win["ga-disable-G-TESTQUEUE"] = true;
  win.gtag = (...args: unknown[]) => calls.push(args);
  await wait(450);
  assert.equal(calls.length, 2, "an event queued before the privacy flag was set must not be sent");
  trackEvent("occupation_tool_click", { occupation_code: "351311" });
  assert.equal(calls.length, 2, "disabled pages send nothing");

  // 5. free text / ids never reach gtag
  win["ga-disable-G-TESTQUEUE"] = false;
  trackEvent("professional_help_click", { source_page_type: "occupation", source_page_id: "351311", name: "A Person", answers: "x y", locale: "zh-Hans" });
  assert.deepEqual(calls[2], ["event", "professional_help_click", { source_page_type: "occupation", source_page_id: "351311", locale: "zh-Hans" }]);
  console.log("PASS analytics queue: early events are sent once gtag exists, sanitised, and honour the privacy flag at send time");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
