import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

export const metadata: Metadata = {
  title: 'Elevation Preview',
  robots: {index: false, follow: false},
}

// ─── Elevation configs ────────────────────────────────────────────────────────
// Mirrors ELEVATION_STYLE_MAP in lib/designTokens.ts.
// Uses rgb(var(--shadow-rgb) / α) so previews adapt to the current client palette.

const SR = 'var(--shadow-rgb)'

const ELEVATIONS = [
  {
    key: '0',
    label: 'Level 0',
    description: 'Flat — no shadows, borders only.',
    rest: 'none',
    hover: 'none',
    transform: '0px',
  },
  {
    key: '1',
    label: 'Level 1',
    description: 'Barely-there — minimal 2-layer shadow, no hover lift.',
    rest: `0 1px 1px rgb(${SR} / 0.015),0 1px 3px rgb(${SR} / 0.02)`,
    hover: `0 1px 2px rgb(${SR} / 0.02),0 2px 5px rgb(${SR} / 0.028)`,
    transform: '0px',
  },
  {
    key: '2',
    label: 'Level 2',
    description: 'Whisper — subtle 2-layer shadow, 1px hover lift.',
    rest: `0 1px 2px rgb(${SR} / 0.02),0 2px 6px rgb(${SR} / 0.03)`,
    hover: `0 1px 3px rgb(${SR} / 0.03),0 3px 9px rgb(${SR} / 0.045)`,
    transform: '-1px',
  },
  {
    key: '4',
    label: 'Level 4',
    description: 'Defined — clear 3-layer shadow, 2px hover lift.',
    rest: `0 1px 2px rgb(${SR} / 0.03),0 4px 12px rgb(${SR} / 0.04),0 10px 28px rgb(${SR} / 0.025)`,
    hover: `0 1px 3px rgb(${SR} / 0.04),0 6px 16px rgb(${SR} / 0.05),0 14px 36px rgb(${SR} / 0.03)`,
    transform: '-2px',
  },
  {
    key: '6',
    label: 'Level 6',
    description: 'Bold — strong 3-layer shadow, 3px hover lift.',
    rest: `0 2px 4px rgb(${SR} / 0.05),0 8px 20px rgb(${SR} / 0.06),0 20px 48px rgb(${SR} / 0.04)`,
    hover: `0 3px 6px rgb(${SR} / 0.06),0 12px 28px rgb(${SR} / 0.08),0 28px 64px rgb(${SR} / 0.05)`,
    transform: '-3px',
  },
] as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ElevationPreviewPage() {
  // Platform-dev tool — available only in dev. Production builds 404 this route.
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className="min-h-screen bg-muted px-[5%] py-16 md:py-24">
      <div className="container">

        <div className="mb-12">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
            Design Preview
          </p>
          <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Card Elevation Styles</h1>
          <p className="max-w-xl text-foreground-muted">
            Five elevation levels (0, 1, 2, 4, 6) with intentional gaps at 3 and 5 for future
            intermediate steps. Shadows derive from{' '}
            <code className="rounded-ui bg-bg-mid px-1.5 py-0.5 text-sm font-mono">--shadow-rgb</code>{' '}
            so they stay warm or cool to match the brand. Hover each card to preview the lift effect.
          </p>
        </div>

        {/* 5-column grid */}
        <ul role="list" aria-label="Elevation levels" className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ELEVATIONS.map((el) => (
            <li key={el.key} className="flex flex-col gap-4">

              {/* Section header */}
              <div>
                <p className="text-base font-bold text-foreground">{el.label}</p>
                <p className="mt-1 text-sm text-foreground-muted">{el.description}</p>
              </div>

              {/* Demo card — overrides card CSS vars inline so it shows the correct style */}
              <div
                style={{
                  '--shadow-card-rest': el.rest,
                  '--shadow-card-hover': el.hover,
                  '--transform-card-hover': el.transform,
                } as React.CSSProperties}
              >
                <div className="group flex flex-col overflow-hidden rounded-ui border border-border bg-background p-6 shadow-card-rest transition-[translate,box-shadow] duration-ui-slow ease-smooth hover:card-lift hover:shadow-card-hover">
                  {/* Simulated card content */}
                  <div className="mb-4 h-2 w-16 rounded-full bg-accent opacity-40" aria-hidden="true" />
                  <div className="mb-2 h-4 w-3/4 rounded-ui bg-border" aria-hidden="true" />
                  <div className="mb-1 h-3 w-full rounded-ui bg-border opacity-60" aria-hidden="true" />
                  <div className="h-3 w-5/6 rounded-ui bg-border opacity-60" aria-hidden="true" />
                  <div className="mt-6 h-8 w-24 rounded-btn bg-action opacity-80" aria-hidden="true" />
                </div>
              </div>

              {/* Token callout */}
              <dl className="space-y-1 rounded-ui border border-border bg-background p-4 text-xs font-mono">
                <div>
                  <dt className="text-foreground-muted">rest</dt>
                  <dd className="mt-0.5 break-all text-foreground">
                    {el.rest === 'none' ? 'none' : el.rest.split(',').map((s) => s.trim()).join(',\n')}
                  </dd>
                </div>
                <div className="mt-2">
                  <dt className="text-foreground-muted">transform</dt>
                  <dd className="mt-0.5 text-foreground">translateY({el.transform})</dd>
                </div>
              </dl>

            </li>
          ))}
        </ul>

        {/* Scope reference table */}
        <div className="mt-20">
          <h2 className="mb-6 text-xl font-bold text-foreground">Elevation Scope Reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  <th className="pb-3 pr-6">Component</th>
                  <th className="pb-3 pr-6">Scope</th>
                  <th className="pb-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['Scrolled header bar', 'Structural', 'shadow-elevation-md — always present'],
                  ['Dropdown nav panel', 'Structural', 'shadow-elevation-md — always present'],
                  ['Float pill (headers)', 'Structural', 'shadow-elevation-lg — always present'],
                  ['Modals (Form, Feedback)', 'Structural', 'shadow-elevation-lg — always present'],
                  ['Back-to-top button', 'Structural', 'shadow-elevation-md/lg — always present'],
                  ['Video section thumbnail', 'Structural', 'shadow-elevation-sm — always present'],
                  ['Attorney cards', 'Stylistic', 'shadow-card-rest / hover:shadow-card-hover'],
                  ['Blog post cards', 'Stylistic', 'shadow-card-rest / hover:shadow-card-hover'],
                  ['Event cards', 'Stylistic', 'shadow-card-rest / hover:shadow-card-hover'],
                  ['Service area cards', 'Stylistic', 'shadow-card-rest / hover:shadow-card-hover'],
                  ['Testimonial cards', 'Stylistic', 'shadow-card-rest only (in marquee)'],
                  ['Review platform links', 'Stylistic', 'shadow-card-rest / hover:shadow-card-hover'],
                  ['Sidebar widgets', 'Stylistic', 'shadow-card-rest only (no hover lift)'],
                  ['Inline body text', 'Never elevated', 'Plain text — no shadow appropriate'],
                  ['Navigation links', 'Never elevated', 'No shadow on link rows'],
                ].map(([component, scope, notes]) => (
                  <tr key={component} className="text-sm">
                    <td className="py-3 pr-6 font-medium text-foreground">{component}</td>
                    <td className="py-3 pr-6">
                      <span className={[
                        'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        scope === 'Structural' ? 'bg-action/10 text-action-text' :
                        scope === 'Stylistic' ? 'bg-accent/10 text-foreground-muted' :
                        'bg-muted text-foreground-muted',
                      ].join(' ')}>
                        {scope}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-xs text-foreground-muted">{notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
