import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// ─── The fifteen bands, as they render BEFORE the section frame ───────────────
//
// A golden of every `<section>` the seven components off `SectionShell` produce,
// captured at template `aec9b75` before any Phase 13 code landed (monorepo
// WS-V1-PHASE13-DESIGN §7, amendment 5; the method is Phase 11's amendment 2).
//
// WHY IT EXISTS. Phase 13 moves thirteen of these bands onto `SectionShell` so a
// theme's `surfaceRhythm` can reach them at all (§7 amendment 16). Requirement 5
// says "existing datasets keep their look", and nothing executable holds that
// today: `HomepageCanvas.parity.test.tsx`'s fixture holds only the retired block
// types, Verify never reads a band, and the stub build greps text. So the claim
// is held HERE, by a capture committed before the move, as the PR's first commit.
//
// WHAT THE BAR IS. Not byte-identity, which `SectionShell`'s fixed class order
// makes unreachable: it joins classes in one order and always emits a
// `<div class="container relative">`, so a grid that sat on the container gains
// one wrapper. The bar is IDENTICAL COMPUTED GEOMETRY plus that one allowed
// wrapper, and every line of this diff is reviewed in the PR that moves them.
//
// WHEN IT CHANGES ON PURPOSE. In the Phase 13 PR itself, once per moved band,
// with the reason in the commit. Two changes are deliberate and are called out
// in §7: `cta/background` gains `bg-brand-dark` (Justin, 2026-09-16 — today it
// sets a dark ring context and `text-foreground` with NO background class, so
// white text lands on the page background: a live contrast bug), and
// `cta/centered` moves from `py-10 md:py-12` to the new operator-hidden `tight`
// preset. `badges/scrolling` does NOT move and must not change at all: its
// `py-12` matches no preset at `md`, and it needs the container for its heading
// and none for its full-bleed strip.
//
// Update with `vitest -u` and say why in the commit. Never update it to make a
// red test green.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))

import {CtaSectionBlock} from '@/components/sections/CtaSectionBlock'
import {BadgesSectionBlock} from '@/components/sections/BadgesSectionBlock'
import {ReviewsSectionBlock} from '@/components/sections/ReviewsSectionBlock'
import {VideoSectionBlock} from '@/components/sections/VideoSectionBlock'
import {FaqSectionBlock} from '@/components/sections/FaqSectionBlock'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {HomepageCta} from '@/components/layout/HomepageCta'

type Case = [label: string, element: React.ReactElement]

function capture(cases: Case[]): string {
  return cases
    .map(([label, element]) => {
      const {container, unmount} = render(element)
      const html = container.innerHTML
      unmount()
      return `<!-- ${label} -->\n${html}\n`
    })
    .join('\n')
}

const tokens = {firmName: 'Acme Law', firmNameShort: 'Acme', primaryPhone: '(555) 010-2030', primaryTollFree: null}

// A Sanity image reference shaped the way `hasImage` accepts, so the image
// branches of cta/split and cta/background are exercised rather than skipped.
const image = {
  _type: 'image' as const,
  asset: {_ref: 'image-abc123def456789012345678901234567890abcd-1600x900-jpg', _type: 'reference' as const},
  alt: 'An office',
}

const buttons = [
  {title: 'Call {{firmName}}', url: '/contact', variant: 'primary' as const},
  {title: 'Case review', url: '/review', variant: 'secondary' as const},
]

const badges = [
  {src: 'https://cdn.example.com/a.png', alt: 'Super Lawyers', width: 120, height: 60},
  {src: 'https://cdn.example.com/b.png', alt: 'AV Preeminent', width: 120, height: 60},
]

const faqAnswer = [
  {_type: 'block', _key: 'b', style: 'normal', markDefs: [], children: [{_type: 'span', _key: 's', text: 'An answer.', marks: []}]},
]

const videos = [{_id: 'v1', title: 'Intro', youTubeUrl: 'https://www.youtube.com/watch?v=abc123xyz00', description: 'A video.', videoType: 'educational'}]

// ─── The cases, one per `<section>` each component can emit ──────────────────
// Every layout of every component, plus the branches that change the band
// itself (cta/background with and without an image; the reviews section's three
// shapes, which are chosen by layout AND by whether buttons exist).

const bands: Case[] = [
  ['cta/centered', <CtaSectionBlock key="c" data={{_type: 'ctaSection', layout: 'centered', tagline: 'Talk to us', heading: 'Speak with {{firmName}}', description: 'We answer the phone.', buttons}} napTokens={tokens} />],
  ['cta/split with image', <CtaSectionBlock key="c" data={{_type: 'ctaSection', layout: 'split', tagline: 'Talk to us', heading: 'Speak with {{firmName}}', description: 'We answer the phone.', buttons, image}} napTokens={tokens} />],
  ['cta/split no image', <CtaSectionBlock key="c" data={{_type: 'ctaSection', layout: 'split', heading: 'Speak with us', buttons}} napTokens={tokens} />],
  ['cta/background with image', <CtaSectionBlock key="c" data={{_type: 'ctaSection', layout: 'background', tagline: 'Talk to us', heading: 'Speak with {{firmName}}', description: 'We answer the phone.', buttons, image}} napTokens={tokens} />],
  ['cta/background NO image (the live contrast bug)', <CtaSectionBlock key="c" data={{_type: 'ctaSection', layout: 'background', heading: 'Speak with us', description: 'White text on the page background.', buttons}} napTokens={tokens} />],
  ['cta/textOnly', <CtaSectionBlock key="c" data={{_type: 'ctaSection', layout: 'textOnly', tagline: 'Talk to us', heading: 'Speak with {{firmName}}', description: 'We answer the phone.', buttons}} napTokens={tokens} />],
  ['cta/no layout (falls through to textOnly)', <CtaSectionBlock key="c" data={{_type: 'ctaSection', heading: 'Speak with us'}} napTokens={tokens} />],

  ['badges/centeredGrid', <BadgesSectionBlock key="b" data={{_type: 'badgesSection', layout: 'centeredGrid', tagline: 'Recognised', heading: 'Awards', description: 'What we hold.', badges, buttons} as never} napTokens={tokens} />],
  ['badges/inline', <BadgesSectionBlock key="b" data={{_type: 'badgesSection', layout: 'inline', heading: 'Awards', badges, buttons} as never} napTokens={tokens} />],
  ['badges/split', <BadgesSectionBlock key="b" data={{_type: 'badgesSection', layout: 'split', tagline: 'Recognised', heading: 'Awards', description: 'What we hold.', badges, buttons} as never} napTokens={tokens} />],
  ['badges/scrolling (does NOT move)', <BadgesSectionBlock key="b" data={{_type: 'badgesSection', layout: 'scrolling', heading: 'Awards', badges} as never} napTokens={tokens} />],

  ['reviews/plain', <ReviewsSectionBlock key="r" data={{_type: 'reviewsSection', tagline: 'Clients', heading: 'Reviews', description: 'What they say.', reviewsEmbed: '<div>embed</div>'} as never} napTokens={tokens} />],
  ['reviews/buttons', <ReviewsSectionBlock key="r" data={{_type: 'reviewsSection', heading: 'Reviews', reviewsEmbed: '<div>embed</div>', buttons} as never} napTokens={tokens} />],
  ['reviews/split', <ReviewsSectionBlock key="r" data={{_type: 'reviewsSection', layout: 'split', heading: 'Reviews', description: 'What they say.', reviewsEmbed: '<div>embed</div>', buttons} as never} napTokens={tokens} />],

  ['video/centered', <VideoSectionBlock key="v" data={{_type: 'videoSection', tagline: 'Watch', heading: 'Videos', description: 'Learn more.', videos} as never} napTokens={tokens} />],
  ['video/split', <VideoSectionBlock key="v" data={{_type: 'videoSection', layout: 'split', heading: 'Videos', videos} as never} napTokens={tokens} />],

  ['faq', <FaqSectionBlock key="f" data={{_type: 'faqSection', heading: 'FAQs', description: 'Answers.', questions: [{question: 'Q?', answer: faqAnswer}]} as never} napTokens={tokens} />],

  ['globalCta/centered', <GlobalCta key="g" data={{layout: 'centered', tagline: 'Talk to us', heading: 'Speak with {{firmName}}', description: 'We answer.', buttons}} napTokens={tokens} />],
  ['globalCta/split', <GlobalCta key="g" data={{layout: 'split', tagline: 'Talk to us', heading: 'Speak with {{firmName}}', description: 'We answer.', buttons}} napTokens={tokens} />],

  // NOTE, captured deliberately: `HomepageCta` takes no `napTokens` and resolves
  // NO tokens, while `GlobalCta` resolves them. `app/(site)/page.tsx:227` hands it
  // raw `globalCtaData`, so the same CTA content renders `{{firmName}}` literally
  // on the homepage and resolved on an interior page. Pre-existing, not Phase 13's;
  // the raw token below is the evidence.
  ['homepageCta (resolves no tokens)', <HomepageCta key="h" data={{tagline: 'Talk to us', heading: 'Speak with {{firmName}}', description: 'We answer.', buttons}} />],
]

describe('the section frame, before-capture', () => {
  it('captures every band the seven off-shell components render today', async () => {
    // Twenty cases across seven components. The count is asserted so a band
    // added to one of them without a case here is a red test, not a silent gap.
    expect(bands).toHaveLength(20)
    await expect(capture(bands)).toMatchFileSnapshot('./__snapshots__/SectionFrame.before.html')
  })
})
