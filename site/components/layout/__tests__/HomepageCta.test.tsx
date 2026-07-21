import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

vi.mock('@/components/layout/footers/FormEmbed', () => ({
  FormEmbed: ({html}: {html: string}) => <div data-testid="form-embed">{html}</div>,
}))

import {HomepageCta, type HomepageCtaData} from '../HomepageCta'

const cta = (over: Partial<HomepageCtaData> = {}): HomepageCtaData => ({
  layout: 'centered',
  tagline: 'Free consultation',
  heading: 'Talk to someone today',
  description: 'No obligation, and the call is confidential.',
  buttons: [
    {title: 'Call 651-291-1717', url: 'tel:6512911717', variant: 'primary'},
    {title: 'Schedule a consultation', url: '/contact/', variant: 'secondary'},
  ],
  ...over,
})

describe('HomepageCta — renders at MARKETING scale, not the interior tier', () => {
  // The reason this component exists at all. <GlobalCta> renders its heading
  // through SectionHeader at scale="xl" = text-4xl md:text-5xl, the interior
  // three-tier table. On the homepage that would make
  // designSettings.marketingScale do nothing to the page's closing headline.
  it('renders the heading with marketing-h2', () => {
    const {container} = render(<HomepageCta data={cta()} />)
    const h2 = container.querySelector('h2')
    expect(h2?.className).toContain('marketing-h2')
  })

  it('does NOT render the heading at the interior xl tier', () => {
    const {container} = render(<HomepageCta data={cta()} />)
    const h2 = container.querySelector('h2')
    expect(h2?.className).not.toMatch(/\btext-4xl\b/)
    expect(h2?.className).not.toMatch(/\bmd:text-5xl\b/)
  })
})

describe('HomepageCta — both conversion paths (Beat 9)', () => {
  it('renders a tap-to-call link and a form/schedule path together', () => {
    const {getAllByRole} = render(<HomepageCta data={cta()} />)
    const hrefs = getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('tel:6512911717')
    expect(hrefs.some((h) => h && !h.startsWith('tel:'))).toBe(true)
  })

  it('renders the form embed when the global CTA carries one', () => {
    const {getByTestId} = render(<HomepageCta data={cta({formEmbed: '<form/>'})} />)
    expect(getByTestId('form-embed')).not.toBeNull()
  })
})

describe('HomepageCta — the per-page override', () => {
  // Matches the interior-page precedent: a present override field wins, an
  // absent one leaves the singleton value in place. This is what makes
  // homePage.ctaFormOverride mean something; it was never projected before
  // (OUTSTANDING item 53).
  it('lets the page override the heading while keeping the global buttons', () => {
    const {container, getAllByRole} = render(
      <HomepageCta data={cta()} override={{heading: 'Your case deserves a real answer'}} />,
    )
    expect(container.querySelector('h2')?.textContent).toBe('Your case deserves a real answer')
    expect(getAllByRole('link')).toHaveLength(2)
  })

  it('falls back to the global CTA entirely when there is no override', () => {
    const {container} = render(<HomepageCta data={cta()} override={null} />)
    expect(container.querySelector('h2')?.textContent).toBe('Talk to someone today')
  })
})

describe('HomepageCta — empty renders nothing', () => {
  it('renders nothing when the global CTA is absent', () => {
    expect(render(<HomepageCta data={null} />).container.innerHTML).toBe('')
  })

  it('renders nothing when the CTA has no heading', () => {
    // Same bail condition as <GlobalCta>, so the two cannot diverge on what
    // counts as an unauthored CTA.
    expect(render(<HomepageCta data={cta({heading: null})} />).container.innerHTML).toBe('')
  })
})
