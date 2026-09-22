// THE BACKSTOP EVERY OTHER ROUTE ALREADY HAD, and this one did not.
//
// Added 2026-08-13. Every other page in this app carries `revalidate = 3600`;
// the homepage carried nothing, so it was fully static and regenerated only on
// deploy or an explicit `revalidatePath`. Combined with the webhook resolving
// `homePage.slug` (`home`) to `/home/` — a route that does not exist — the
// homepage was the ONE page with neither working webhook revalidation nor a
// time-based fallback. A live client served a stale homepage for five hours
// while every other page refreshed on the hour.
//
// The webhook is the fast path; this is the safety net. Keep both — that defect
// stayed invisible precisely because the fast path reported success.
export const revalidate = 3600

import type {Metadata} from 'next'
import {chromeNap, getHomePage, getSiteChrome} from '@/lib/sanity/fetchers'
import {HomeBody} from '@/components/layout/HomeBody'
import {expandNapTokens, resolveTokenString} from '@/lib/tokens'
import {homepageTitle, resolveTitle} from '@/lib/seoTitle'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {buildSocialMeta, SITEWIDE_OG_IMAGE_URL} from '@/lib/socialMeta'
import {hasImage, type SanityImage} from '@/lib/sanity/image'

// ─── Metadata ─────────────────────────────────────────────────────────────────
//
// The homepage now does what every other page does — carries its stored
// seoTitle through — with the one homepage-specific twist item 32 anticipated:
// it renders ABSOLUTE, bypassing the root layout's "%s - <firm name>" template.
// A homepage seoTitle from Screaming Frog almost always already contains the
// firm name (Dudley's is "Dudley & Smith |"), so routing it through the
// template would render the firm name twice. (Ruled 2026-07-24; the homepage
// was deliberately left off the shared titleFragment path in f2115ce, "blocked
// on items 44 and 40", until this decision.)
//
// ─── TECH-3: the homepage is a page like the others ──────────────────────────
//
// Ruled by Justin 2026-08-10 (`BI/rules/technical-seo.md`), built here as that
// file's queue line 1, closing `OUTSTANDING.md` item 160. `metaDescription`,
// `noIndex`, `noFollow` and `canonicalUrl` are declared on the `homePage`
// schema; until this build none of them was projected and the canonical was a
// hardcoded `'/'` literal on BOTH return paths — so the canonical an operator
// typed was not merely unread, it was contradicted. The social card is ruled in
// by the same rule: this was the one route that called `buildSocialMeta` on
// neither branch.
//
// THREE CARVE-OUTS ARE RULED TO STAND and are honoured below rather than swept:
// the absolute title (above), the absent page-name rung (`resolveTitle`'s second
// argument stays null), and the no-upload image path.
export async function generateMetadata(): Promise<Metadata> {
  // One request for the whole homepage (content, metadata, hero design),
  // shared with the page below through React cache(); the NAP tokens come
  // from the chrome the layouts already fetched (lib/sanity/fetchers.ts).
  const [all, rawTokens] = await Promise.all([getHomePage(), chromeNap()])
  const home = (all?.metadata ?? null) as {
    seoTitle?: string | null
    metaDescription?: string | null
    ogTitle?: string | null
    ogDescription?: string | null
    noIndex?: boolean | null
    noFollow?: boolean | null
    canonicalUrl?: string | null
    ogImage?: SanityImage | null
    areasOfLaw?: string[] | null
  } | null
  const tokens = expandNapTokens(rawTokens)
  // Same shared resolver as every other route. The homepage has no page-name
  // rung — a page name is not a thing it has — so the second argument is null
  // and TITLE-7's formula is supplied as the complete-title argument instead.
  // See `homepageTitle` for where practice scope is read from, and why it is
  // NOT Zite's selections.
  const {title: stored, label} = resolveTitle(
    home?.seoTitle,
    null,
    tokens,
    tokens?.firmName,
    homepageTitle(home?.areasOfLaw ?? [], tokens?.firmName, tokens?.['office.city']),
  )

  // TECH-5: no formula, no fallback rung. An absent field emits no tag.
  const description = resolveTokenString(home?.metaDescription, tokens) || undefined

  // TECH-2's override rung, which the homepage did not read. `'/'` stays the
  // DEFAULT — the homepage's own address — and is now the fallback rather than
  // a literal.
  const canonical = home?.canonicalUrl ?? '/'

  // SEARCH-1/SEARCH-8 through the shared helper, exactly as the other fifteen
  // routes do it. It reads the site-wide switch itself, so a hidden site still
  // wins over these two fields.
  const robots = await buildRobotsMeta(home?.noIndex, home?.noFollow)

  // TECH-3's social card, and TECH-4's ladder underneath it. `label` is the
  // fallback title; on this route it equals the title tag's own string on both
  // branches, which is what the ruling says the ladder produces.
  //
  // THE NO-UPLOAD IMAGE IS THE RULED CARVE-OUT, and the shared builder does not
  // produce it: with no `ogImageOverride` it generates a TITLED
  // `/api/og?title=…`, while TECH-3 rules the image byte-identical to the root
  // layout's untitled card. Next REPLACES `openGraph` across segments rather
  // than merging it, so emitting a card at all means restating the image to be
  // kept — hence the swap below rather than an omission, which would drop the
  // image entirely. The strings change; the picture does not.
  const ogImage = home?.ogImage
  const social = buildSocialMeta(label, description, ogImage, {
    ogTitle: home?.ogTitle, ogDescription: home?.ogDescription, tokens,
  })
  const socialMeta = hasImage(ogImage)
    ? social
    : {
        openGraph: {
          ...social.openGraph,
          images: [
            {url: SITEWIDE_OG_IMAGE_URL, width: 1200, height: 630, alt: tokens?.firmName ?? ''},
          ],
        },
        twitter: {...social.twitter, images: [SITEWIDE_OG_IMAGE_URL]},
      }

  if (stored) {
    // PRESENT — carry through verbatim. This was the homepage's special case
    // until 2026-07-26; TITLE-1 generalised it to every page type, so it is no
    // longer special, just first.
    return {
      title: stored,
      ...(description ? {description} : {}),
      ...robots,
      alternates: {canonical},
      ...socialMeta,
    }
  }

  // NO TITLE AT ALL. Reached only when there is no cell AND TITLE-7's formula
  // could not build one — a firm with no city and no single phrased area of
  // law. Next then falls to the root layout's title, the bare firm name, which
  // is the right answer for a firm we know almost nothing about.
  //
  // Everything else rides both branches — each is independent of the title
  // question, and an operator who sets one must get it either way.
  return {
    ...(description ? {description} : {}),
    ...robots,
    alternates: {canonical},
    ...socialMeta,
  }
}

// The body is `HomeBody` (Phase 17A), so the preview address can draw the same
// homepage over its own chrome.
export default async function HomePage() {
  const [chrome, all] = await Promise.all([getSiteChrome(), getHomePage()])
  return <HomeBody chrome={chrome} all={all} />
}
