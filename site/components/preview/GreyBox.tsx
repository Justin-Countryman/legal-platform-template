import {frameOf, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {type HomepageCtaData} from '@/components/layout/HomepageCta'
import {type SiteChrome} from '@/components/layout/SiteShell'
import {type HomePageData} from '@/components/layout/HomeBody'
import {visibleResults} from '@/components/sections/CaseResultsSection'
import {visibleItems} from '@/components/sections/PracticeAreaNavBlock'
import {resolveResultsDisclaimer} from '@/lib/legal'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'

// ─── The grey box ─────────────────────────────────────────────────────────────
//
// Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §2.4, `[R-507]`). The homepage the build
// composed, drawn as a wireframe: its real sections, real copy and real order, and no
// design at all. This is what a client approves before any design is shown: the story,
// not the look.
//
// No design means no token, no palette, no type scale and no image: it draws in fixed
// greys and the system font from its own stylesheet below, never the site's, so no
// style set or palette can leak in. Each band is a skeleton of its LAYOUT with its
// real counts (a grid of six outlines for six attorneys, two columns for two-column
// text), because old requirement 4 asked for bands "sized by layout".
//
// WHAT IT DRAWS IS WHAT THE LIVE PAGE DRAWS. Whether a band renders is `frameOf`'s
// answer, the same one the homepage's walk uses; a band the live page leaves out is
// drawn as a dashed box saying so, because a missing band is exactly what the story
// approval should see.
//
// LABELS. Every band says its section type and layout. A beat is said only where the
// build recorded it, in the member's key (`BE/_shared/homepage_member_table.py`): a
// content section can serve several beats and merges move them, so a beat is never
// guessed from the type (§7.2 finding 7).

const TYPE_NAMES: Record<string, string> = {
  practiceAreaNavInline: 'Areas of law',
  attorneySectionInline: 'Attorneys',
  badgesSectionInline: 'Badges',
  testimonialsGridInline: 'Testimonials',
  featuredTestimonialInline: 'Featured testimonial',
  videoSectionInline: 'Video',
  caseResultsSectionInline: 'Case results',
  contentSectionInline: 'Content section',
  reviewsSectionInline: 'Reviews',
}

const CONTENT_LAYOUTS: Record<string, string> = {
  split: 'split', twoColumnText: 'two-column text', statement: 'statement', ribbon: 'ribbon', statRow: 'stat row',
}

/** The beats the build records in a member's key, and what the story framework calls them. */
export const RECORDED_BEATS: Record<string, string> = {
  'hp-differentiatorBlock': 'Beat 2 · pain and value',
  'hp-caseResultsBlock': 'Beat 3 · social proof',
  'hp-siloNavBlock': 'Beat 4 · areas of law',
  'hp-narrativeBlock': 'Beat 5 · the guide',
  'hp-attorneyHighlightBlock': 'Beat 6 · attorneys',
  'hp-badgesBlock': 'Beat 7 · awards',
}

type Member = HomepageBlock & Record<string, unknown>
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const list = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []

/** Portable Text as plain paragraphs: the words, none of the marks. */
export function plainText(blocks: unknown): string[] {
  return list(blocks)
    .map((b) => list(b.children).map((c) => text(c.text)).join(''))
    .filter(Boolean)
}

function layoutOf(m: Member): string {
  if (m._type === 'contentSectionInline') return CONTENT_LAYOUTS[text(m.layout)] ?? 'split'
  return text(m.layout) || 'default layout'
}

function Label({children}: {children: React.ReactNode}) {
  return <p className="gb-label">{children}</p>
}

function Heading({m, tokens}: {m: Member; tokens: NapTokens | null}) {
  const tagline = resolveTokenString(text(m.tagline), tokens)
  const heading = resolveTokenString(text(m.heading), tokens)
  const intro = resolveTokenString(text(m.description) || text(m.intro), tokens)
  return (
    <>
      {tagline && <p className="gb-kicker">{tagline}</p>}
      {heading && <p className="gb-heading">{heading}</p>}
      {intro && <p className="gb-text">{intro}</p>}
    </>
  )
}

function Slot({children, wide = false}: {children: React.ReactNode; wide?: boolean}) {
  return <div className={wide ? 'gb-slot gb-slot-wide' : 'gb-slot'}>{children}</div>
}

function Buttons({buttons, tokens}: {buttons: unknown; tokens: NapTokens | null}) {
  const titles = list(buttons).map((b) => resolveTokenString(text(b.title), tokens)).filter(Boolean)
  if (!titles.length) return null
  return (
    <div className="gb-row">
      {titles.map((t, i) => <span key={i} className="gb-button">{t}</span>)}
    </div>
  )
}

function Skeleton({m, tokens, disclaimer}: {m: Member; tokens: NapTokens | null; disclaimer: string}) {
  switch (m._type) {
    case 'practiceAreaNavInline': {
      const items = visibleItems(m as never)
      return (
        <>
          <Heading m={m} tokens={tokens} />
          <p className="gb-count">{items.length} {items.length === 1 ? 'area' : 'areas'} of law</p>
          <div className="gb-grid">{items.map((i) => <Slot key={i._key}>{text(i.label)}</Slot>)}</div>
        </>
      )
    }
    case 'attorneySectionInline': {
      const people = list(m.attorneys)
      return (
        <>
          <Heading m={m} tokens={tokens} />
          <p className="gb-count">{people.length} {people.length === 1 ? 'attorney' : 'attorneys'}</p>
          <div className="gb-grid">
            {people.map((a, i) => (
              <div key={text(a._id) || i} className="gb-card">
                <Slot>photo</Slot>
                <p className="gb-text">{text(a.title)}</p>
                {text(a.jobTitle) && <p className="gb-small">{text(a.jobTitle)}</p>}
              </div>
            ))}
          </div>
        </>
      )
    }
    case 'badgesSectionInline': {
      const badges = list(m.badges)
      return (
        <>
          <Heading m={m} tokens={tokens} />
          <p className="gb-count">{badges.length} {badges.length === 1 ? 'badge' : 'badges'}</p>
          <div className="gb-row">{badges.map((b, i) => <Slot key={i}>{text(b.alt) || 'badge'}</Slot>)}</div>
          <Buttons buttons={m.buttons} tokens={tokens} />
        </>
      )
    }
    case 'testimonialsGridInline': {
      const quotes = list(m.testimonials).filter((t) => text(t.quote))
      return (
        <>
          <Heading m={m} tokens={tokens} />
          <p className="gb-count">{quotes.length} {quotes.length === 1 ? 'testimonial' : 'testimonials'}</p>
          <div className="gb-grid">
            {quotes.map((t, i) => (
              <div key={text(t._id) || i} className="gb-card">
                <p className="gb-text">“{text(t.quote)}”</p>
                <p className="gb-small">{text(t.name)}</p>
              </div>
            ))}
          </div>
        </>
      )
    }
    case 'featuredTestimonialInline': {
      const t = (m.testimonial ?? {}) as Record<string, unknown>
      return (
        <>
          <Heading m={m} tokens={tokens} />
          <p className="gb-heading">“{text(t.quote)}”</p>
          <p className="gb-small">{text(t.name)}</p>
        </>
      )
    }
    case 'videoSectionInline': {
      const videos = list(m.videos)
      return (
        <>
          <Heading m={m} tokens={tokens} />
          <p className="gb-count">{videos.length} {videos.length === 1 ? 'video' : 'videos'}</p>
          <div className="gb-grid">{videos.map((v, i) => <Slot key={text(v._id) || i} wide>video: {text(v.title)}</Slot>)}</div>
        </>
      )
    }
    case 'caseResultsSectionInline': {
      const results = visibleResults(m as never)
      return (
        <>
          <Heading m={m} tokens={tokens} />
          <p className="gb-count">{results.length} {results.length === 1 ? 'result' : 'results'}</p>
          <div className="gb-grid">
            {results.map((r, i) => (
              <div key={r._id ?? i} className="gb-card">
                {r.amount && <p className="gb-heading">{r.amount}</p>}
                {r.caption && <p className="gb-small">{r.caption}</p>}
              </div>
            ))}
          </div>
          <p className="gb-small">{disclaimer}</p>
        </>
      )
    }
    case 'reviewsSectionInline':
      return (
        <>
          <Heading m={m} tokens={tokens} />
          <Slot wide>reviews widget (the firm&apos;s own embed)</Slot>
          <Buttons buttons={m.buttons} tokens={tokens} />
        </>
      )
    case 'contentSectionInline':
      return <ContentSkeleton m={m} tokens={tokens} disclaimer={disclaimer} />
    default:
      return null
  }
}

function ContentSkeleton({m, tokens, disclaimer}: {m: Member; tokens: NapTokens | null; disclaimer: string}) {
  const layout = text(m.layout)
  const body = plainText(m.body)
  const items = list(m.items).filter((i) => text(i.title) || text(i.body))
  const proof = (m.proof ?? null) as Record<string, unknown> | null
  const quote = (m.pullQuote ?? null) as Record<string, unknown> | null
  const media = (m.media ?? null) as Record<string, unknown> | null
  const copy = (
    <div>
      <Heading m={m} tokens={tokens} />
      {body.map((p, i) => <p key={i} className="gb-text">{p}</p>)}
      {quote && text(quote.text) && <p className="gb-text">“{text(quote.text)}” {text(quote.attribution)}</p>}
      {proof && text(proof.number) && <p className="gb-text">{text(proof.number)} {text(proof.caption)}</p>}
      <Buttons buttons={m.buttons} tokens={tokens} />
    </div>
  )
  const itemsBox = (className: string) => (
    <div className={className}>
      {items.map((it, i) => (
        <div key={text(it._key) || i} className="gb-card">
          {text(it.title) && <p className="gb-text">{text(it.title)}</p>}
          {text(it.body) && <p className="gb-small">{text(it.body)}</p>}
        </div>
      ))}
    </div>
  )
  if (layout === 'twoColumnText') return <>{copy}{itemsBox('gb-cols2')}</>
  if (layout === 'ribbon' || layout === 'statRow') {
    return <>{copy}{itemsBox('gb-row')}{layout === 'statRow' && <p className="gb-small">{disclaimer}</p>}</>
  }
  if (layout === 'statement') return copy
  // split: the copy beside its media.
  const what = media?.kind === 'video' ? 'video' : media ? 'photo' : 'no photo set'
  return <div className="gb-cols2">{copy}<Slot wide>{what}</Slot></div>
}

export function GreyBox({chrome, home}: {chrome: SiteChrome; home: HomePageData}) {
  const tokens = (chrome?.nap ?? null) as NapTokens | null
  const page = (home?.page ?? null) as Record<string, unknown> | null
  const hero = (page?.hero ?? null) as Record<string, unknown> | null
  const heroDesign = home?.heroDesign ?? null
  const canvas = list(page?.canvas) as Member[]
  const disclaimer = resolveResultsDisclaimer(text(page?.resultsDisclaimer) || null)
  const cta: HomepageCtaData = {
    ...((chrome?.globalCta ?? {}) as HomepageCtaData),
    ...((page?.ctaOverride ?? {}) as Partial<HomepageCtaData>),
  }
  const firmName = text(chrome?.header?.siteSettings?.firmName)
  const navCount = list(chrome?.header?.mainNavigation?.navItems).length

  return (
    <div className="gb" data-grey-box="">
      <style dangerouslySetInnerHTML={{__html: GREY_CSS}} />
      <section className="gb-band gb-chrome"><Label>Site header · {navCount} navigation {navCount === 1 ? 'item' : 'items'}</Label></section>

      <section className="gb-band">
        {text(hero?.heading) && heroDesign ? (
          <>
            <Label>Beat 1 · Hero</Label>
            {text(hero?.eyebrow) && <p className="gb-kicker">{resolveTokenString(text(hero?.eyebrow), tokens)}</p>}
            <p className="gb-title">{resolveTokenString(text(hero?.heading), tokens)}</p>
            {text(hero?.description) && <p className="gb-text">{resolveTokenString(text(hero?.description), tokens)}</p>}
            <Buttons buttons={hero?.buttons} tokens={tokens} />
            <Slot wide>hero image, if the design sets one</Slot>
          </>
        ) : (
          <>
            <Label>Hero · not set up: the page shows the firm&apos;s name</Label>
            <p className="gb-title">{firmName}</p>
          </>
        )}
      </section>

      {canvas.length === 0 && (
        <section className="gb-band gb-missing"><Label>The homepage list is empty: only the hero and the close show</Label></section>
      )}

      {canvas.map((m, i) => {
        const type = TYPE_NAMES[m._type] ?? null
        const beat = RECORDED_BEATS[text(m._key)]
        const where = [beat ? `${beat} (as built)` : null, type ?? 'Unknown section type', type ? layoutOf(m) : null]
          .filter(Boolean).join(' · ')
        if (!type || frameOf(m).empty) {
          return (
            <section key={text(m._key) || i} className="gb-band gb-missing">
              <Label>{where} · not shown: {type ? 'no content yet' : 'this site does not know it'}</Label>
            </section>
          )
        }
        return (
          <section key={text(m._key) || i} className="gb-band">
            <Label>{where}</Label>
            <Skeleton m={m} tokens={tokens} disclaimer={disclaimer} />
          </section>
        )
      })}

      {page?.hideCtaForm ? (
        <section className="gb-band gb-missing"><Label>Closing call to action · hidden on this page</Label></section>
      ) : (
        <section className="gb-band">
          <Label>Beat 9 · Closing call to action</Label>
          {text(cta.tagline) && <p className="gb-kicker">{resolveTokenString(text(cta.tagline), tokens)}</p>}
          {text(cta.heading) && <p className="gb-heading">{resolveTokenString(text(cta.heading), tokens)}</p>}
          {text(cta.description) && <p className="gb-text">{resolveTokenString(text(cta.description), tokens)}</p>}
          <Buttons buttons={cta.buttons} tokens={tokens} />
          {text(cta.formEmbed) && <Slot wide>contact form</Slot>}
        </section>
      )}

      <section className="gb-band gb-chrome"><Label>Site footer</Label></section>
    </div>
  )
}

// Fixed greys and the system font, scoped to the grey box. Nothing here reads a site
// token, on purpose: the grey box shows no design.
const GREY_CSS = `
.gb{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#2b2b2b;background:#f4f4f4;padding:16px;padding-bottom:40vh}
.gb *{font-family:inherit;letter-spacing:normal;text-transform:none;font-style:normal}
.gb-band{background:#fff;border:1px solid #c8c8c8;margin:0 auto 12px;max-width:1100px;padding:16px 20px}
.gb-chrome{background:#e6e6e6}
.gb-missing{background:transparent;border-style:dashed;color:#6b6b6b}
.gb-label{font-size:12px;font-weight:600;color:#6b6b6b;margin:0 0 10px}
.gb-kicker{font-size:12px;color:#555;margin:0 0 4px}
.gb-title{font-size:26px;font-weight:600;line-height:1.25;margin:0 0 8px}
.gb-heading{font-size:19px;font-weight:600;line-height:1.3;margin:0 0 6px}
.gb-text{font-size:15px;line-height:1.5;margin:0 0 6px}
.gb-small{font-size:13px;line-height:1.4;color:#555;margin:4px 0 0}
.gb-count{font-size:12px;color:#6b6b6b;margin:0 0 8px}
.gb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.gb-cols2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.gb-row{display:flex;flex-wrap:wrap;gap:10px;margin:6px 0}
.gb-card{border:1px solid #d6d6d6;padding:10px}
.gb-slot{background:#e9e9e9;border:1px solid #d0d0d0;color:#555;font-size:12px;min-height:56px;display:flex;align-items:center;justify-content:center;text-align:center;padding:6px}
.gb-slot-wide{min-height:140px}
.gb-button{border:1px solid #9a9a9a;font-size:13px;padding:6px 12px}
`
