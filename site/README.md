# Legal Platform Template — Site

The marketing site half of the Legal Platform Template. A Sanity-backed Next.js app intended to deploy to Vercel. The sibling Sanity Studio lives at `../studio/`.

This repo is the **template** that the Client Provisioning Tool clones from. New client sites are created via GitHub's "Use this template" flow (or `POST /repos/.../generate` from the tool); per-client identity strings (slug, name, Sanity project ID, domain) are then rewritten from `CS-CLIENT-CONFIG.json`.

## Stack

- Next.js `^16.2.4` (App Router, React Server Components)
- React `^19.2.5`
- TypeScript `^5` (`strict: true`)
- Tailwind CSS `^4` (config-in-CSS via `@theme` blocks in `app/globals.css`)
- Sanity client `^5.20.0` via `next-sanity ^12.2.2`
- Vitest `^4.1.5` + `@testing-library/react` for unit tests
- ESLint flat-config with custom platform rules (see `eslint-rules/`)
- Framer Motion for limited animation; Sanity image URL builder for image transforms

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. In production, set these in the Vercel project settings.

| Variable | Required for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Build + runtime | Per-client Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Build + runtime | `production` (or `staging` on preview deploys once a staging dataset exists) |
| `NEXT_PUBLIC_SITE_DOMAIN` | Build (metadataBase) | Production hostname, no protocol, no trailing slash (e.g. `www.example.com`) |
| `SANITY_API_READ_TOKEN` | Server-only (drafts, preview) | Server-side only; do NOT prefix with `NEXT_PUBLIC_`. Read-scoped token. |
| `NEXT_PUBLIC_GSC_VERIFICATION` | Production only | Google Search Console site-verification token. Leave blank in dev / preview. |
| `SANITY_REVALIDATE_SECRET` | Production webhook | Shared secret for `POST /api/revalidate`. Must match the `x-sanity-revalidate-secret` header configured on the Sanity dashboard webhook. |

`.env.local` is gitignored via the root `.gitignore` and `site/.gitignore`.

## Local development

```bash
npm install
npm run dev           # http://localhost:3000 (Turbopack)
```

## Common commands

```bash
npm run dev           # Dev server (Turbopack)
npm run build         # Production build (Turbopack)
npm run start         # Run the production build locally
npm run lint          # ESLint (flat-config + platform rules)
npx tsc --noEmit      # Type-check (CI gate)
npx vitest run        # Run the test suite once
npx vitest            # Watch mode
```

## Project layout

```
app/                  Next.js App Router
  (site)/             Public marketing routes (header/footer layout)
  api/og/             Branded 1200×630 OG image (Edge runtime, @vercel/og)
  api/revalidate/     Sanity webhook → ISR invalidation
  review/             Layer-B testimonial routes (proxy-rewritten from /review-*)
  layout.tsx          Root <html> + metadata + Organization JSON-LD
  sitemap.ts          Dynamic sitemap pulled from Sanity (excludes drafts + noIndex)
  robots.ts           Production-aware robots; disallows preview deploys
components/           UI primitives + layout + section components
  attorney/           Attorney profile layouts
  staff/              Staff profile layouts (distinct from attorney)
  layout/             Header, Footer, BackToTop, hero, page-header
  sections/           PageSections + content section blocks
  ui/                 Buttons, FormField, Breadcrumbs, etc.
eslint-rules/         Custom platform ESLint rules
fonts/                Font preset library + preload helpers
lib/
  sanity/             Sanity client + GROQ queries
  designTokens.ts     OKLCH-aware color + token math (uses culori)
  tokens.ts           NAP-shortcode resolution
proxy.ts              Next 16 proxy (rewrites /review-* → /review/[slug])
public/               Static assets
types/                Shared types
```

## Deploy

Production deploys to Vercel from `main`. Preview deploys created on PRs. See the root `TEMPLATE.md` for the full per-client provisioning flow.
