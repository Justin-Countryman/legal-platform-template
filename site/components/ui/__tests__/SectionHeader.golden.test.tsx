import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// ─── SectionHeader, rendered across its whole prop space ─────────────────────
//
// A golden of the markup `SectionHeader` produces for every combination of its
// props, and of the four consumers no other test renders, captured at template
// `1c84a15` before any Phase 11 code landed (monorepo WS-V1-PHASE11-DESIGN §7,
// amendment 2).
//
// WHY IT EXISTS. Nothing else executable sees this component's markup: the a11y
// shared-components test mocks it, the homepage parity golden never renders it,
// the stub build greps text, and Verify counts `<h1>`s. Every interior section
// renders its heading through it, so a change here is a change on every page.
//
// WHEN IT CHANGES ON PURPOSE. Phase 16 routes `SectionHeader` through
// `HeadingUnit` and adds the heading rule per scope. The diff this file produces
// then is the reviewed artifact, in that PR, before propagation. Update with
// `vitest -u` and say why in the commit. Until then it must not move.

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

import {SectionHeader} from '@/components/ui/SectionHeader'
import {TestimonialsGridSection} from '@/components/sections/TestimonialsGridSection'
import {FaqSectionBlock} from '@/components/sections/FaqSectionBlock'
import {ReviewsSectionBlock} from '@/components/sections/ReviewsSectionBlock'
import {VideoLibraryClient} from '@/components/sections/VideoLibraryClient'

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

const SCALES = ['md', 'lg', 'xl'] as const
const ALIGNMENTS = [undefined, 'center', 'left'] as const

const matrix: Case[] = []
for (const scale of SCALES)
  for (const alignment of ALIGNMENTS)
    for (const noTrailingGap of [false, true])
      for (const tagline of [undefined, 'Eyebrow & more'])
        for (const description of [undefined, 'A <description> line.'])
          for (const className of [undefined, 'mx-auto mb-12 max-w-2xl']) {
            const props = {scale, alignment, noTrailingGap, tagline, description, className}
            matrix.push([JSON.stringify(props), <SectionHeader key="h" heading="Why Acme & Sons" {...props} />])
          }
matrix.push(['empty heading', <SectionHeader key="h" heading="" tagline="t" />])
matrix.push(['undefined heading', <SectionHeader key="h" heading={undefined as unknown as string} description="d" />])

const tokens = {firmName: 'Acme Law'}
const testimonials = [{_id: 't1', quote: 'Superb.', name: 'A client', caseType: 'Injury', numberOfStars: 5}]
const faqAnswer = [{_type: 'block', _key: 'b', style: 'normal', markDefs: [], children: [{_type: 'span', _key: 's', text: 'A.', marks: []}]}]

const consumers: Case[] = []
for (const withTagline of [true, false])
  for (const withDescription of [true, false]) {
    const tagline = withTagline ? 'Clients on {{firmName}}' : null
    const description = withDescription ? 'What they said.' : null
    const suffix = `tagline=${withTagline} description=${withDescription}`
    consumers.push([
      `TestimonialsGridSection ${suffix}`,
      <TestimonialsGridSection key="c" data={{tagline, heading: 'Why {{firmName}}', description, testimonials, appearance: {surface: 'dark'}} as never} napTokens={tokens} />,
    ])
    consumers.push([
      `ReviewsSectionBlock ${suffix}`,
      <ReviewsSectionBlock key="c" data={{_type: 'reviewsSection', tagline, heading: 'Reviews', description, reviewsEmbed: '<div>embed</div>'} as never} napTokens={tokens} />,
    ])
    consumers.push([
      `VideoLibraryClient ${suffix}`,
      <VideoLibraryClient key="c" videos={[{id: 'v1', title: 'Intro', youTubeUrl: 'https://www.youtube.com/watch?v=abc123xyz00'}]} tagline={tagline} heading="Videos" description={description} />,
    ])
  }
for (const withDescription of [true, false])
  consumers.push([
    `FaqSectionBlock description=${withDescription}`,
    <FaqSectionBlock key="c" data={{_type: 'faqSection', heading: 'FAQs', description: withDescription ? 'Answers.' : null, questions: [{question: 'Q?', answer: faqAnswer}]} as never} napTokens={tokens} />,
  ])

describe('SectionHeader golden', () => {
  it('renders the golden markup across the prop matrix', async () => {
    expect(matrix).toHaveLength(146)
    await expect(capture(matrix)).toMatchFileSnapshot('./__snapshots__/SectionHeader.matrix.html')
  })

  it('renders the golden markup for the consumers no other test renders', async () => {
    expect(consumers).toHaveLength(14)
    await expect(capture(consumers)).toMatchFileSnapshot('./__snapshots__/SectionHeader.consumers.html')
  })
})
