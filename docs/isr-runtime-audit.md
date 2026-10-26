# Runtime ISR audit (2026-10-27)

Build output is the source of truth (`.next/prerender-manifest.json`): after the change no prerendered route has a revalidate interval.

| Route / file | Mechanism | Before | ISR write at runtime? | Now |
| --- | --- | --- | --- | --- |
| `/[locale]/occupations/[id]` (2,079 URLs, EN / TR / zh-Hans) | `revalidate = 3600`, but the page read `getAdminStateData()` (`unstable_cache`, `revalidate: 60`), which lowers the page to 60 s | prerendered, revalidate **60 s** | **Yes, per page, every minute on traffic** | prerendered, `revalidate = false`; state data read once at build |
| `/[locale]/visas/[subclass]` (36 URLs) | `force-static` + `revalidate = 3600`; static params had no `locale`, so nothing was built at deployment | generated on the first request, then hourly (60 s via the same cache entry) | Yes | prerendered at build, `revalidate = false` |
| `/[locale]/guides/[slug]` (51 URLs) | static params without `locale` | generated on the first request | Yes, once per URL | prerendered at build |
| `revalidatePath("/", "layout")` in 7 admin / CRM / agent actions | on-demand | invalidated every cached page | Yes, each page on its next visit after any admin action | `revalidateAdminViews()` invalidates only `/[locale]/admin` and `/[locale]/agent` |
| `/rounds` (300), `/rehber`, `/guide`, `/tools/invitation-rounds` (3600) | `export const revalidate` on pages that render per request | inert (the routes are dynamic, `ƒ`) | No | exports removed (no behaviour change) |
| `unstable_cache` in `lib/admin-data/loader.ts`, `lib/cache/public-read-models.ts` | data cache (60 s / 3600 s / 86400 s, tags) | kept | Data-cache entries, not page regeneration (about one write per key per interval while read) | **kept** on purpose |
| `revalidateTag("public-invitation-rounds" / "public-guide-download-stats")` | on-demand data-cache tags | kept | one refetch per admin save / download | **kept** |
| Pages without `generateStaticParams` under `[locale]` (tools, points calculators, state nomination, resources) | server-rendered per request (`ƒ`) | unchanged | No ISR | unchanged |
| CDN / browser caching | n/a | unchanged | n/a | unchanged |

## What now needs a new deployment to refresh

- State and territory program data shown on occupation pages and on the subclass 190 / 491 visa pages (the admin state data). Admin saves still update chat answers, reports and other server-rendered pages at once.
- Everything repository-backed (occupation dataset, authority data, guides, visa details) already needed a deployment.

Unchanged: invitation rounds (`/tools/invitation-rounds`, server-rendered, data cache refreshed on admin save), state nomination, the points calculators.

If the build cannot read the database, the pages bake in the bundled seed state data until the next deployment (logged as `[admin-data] static pages: could not read state programs`).

To restore timed freshness later, set a `revalidate` on the page and read `getAdminStateData()` again; `scripts/test-isr-config.ts` will need updating.
