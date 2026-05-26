'use client'

import {useState} from 'react'
import {MOTION_TEMPO_MAP} from '@/lib/designTokens'

// ─── Tempo configs (single source of truth: MOTION_TEMPO_MAP) ─────────────────

const TEMPO_LABELS = [
  {key: 'snappy',   label: 'Snappy'},
  {key: 'balanced', label: 'Balanced'},
  {key: 'relaxed',  label: 'Relaxed'},
] as const

const TEMPOS = TEMPO_LABELS.map(({key, label}) => ({
  key,
  label,
  fast: MOTION_TEMPO_MAP[key].uiFast,
  base: MOTION_TEMPO_MAP[key].uiBase,
  slow: MOTION_TEMPO_MAP[key].uiSlow,
}))

// ─── TempoCard ────────────────────────────────────────────────────────────────

function TempoCard({fast, base, slow, label}: {fast: string; base: string; slow: string; label: string}) {
  const [active, setActive] = useState(false)

  const vars = {
    '--motion-ui-fast': fast,
    '--motion-ui-base': base,
    '--motion-ui-slow': slow,
  } as React.CSSProperties

  return (
    <div style={vars} className="flex flex-col gap-6 rounded-ui border border-border bg-background p-6">
      <div>
        <p className="text-base font-bold text-foreground">{label}</p>
        <dl className="mt-3 space-y-1 text-sm font-mono">
          <div className="flex justify-between gap-4">
            <dt className="text-foreground-muted">ui-fast</dt>
            <dd className="text-foreground">{fast}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-foreground-muted">ui-base</dt>
            <dd className="text-foreground">{base}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-foreground-muted">ui-slow</dt>
            <dd className="text-foreground">{slow}</dd>
          </div>
        </dl>
      </div>

      {/* Hover demo: card lift at ui-slow */}
      <div className="group rounded-ui border border-border p-4 shadow-card-rest transition-[translate,box-shadow] duration-ui-slow ease-smooth hover:card-lift hover:shadow-card-hover">
        <p className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">Hover me</p>
        <p className="mt-1 text-sm text-foreground">Card lift — ui-slow</p>
      </div>

      {/* Color toggle: fills at ui-fast, bg at ui-base */}
      <button
        onClick={() => setActive((p) => !p)}
        className={[
          'rounded-btn px-5 py-2.5 text-sm font-semibold transition-colors duration-ui-fast',
          active
            ? 'bg-action text-action-fg'
            : 'border border-border bg-muted text-foreground hover:border-action hover:text-action-text',
        ].join(' ')}
      >
        {active ? 'Active — click to reset' : 'Click to toggle'}
      </button>

      {/* Opacity demo: hover ui-fast */}
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className="text-sm font-medium text-action-text transition-opacity duration-ui-fast hover:opacity-50"
      >
        Hover me — opacity at ui-fast →
      </a>
    </div>
  )
}

// ─── AccordionDemo ─────────────────────────────────────────────────────────────

function AccordionDemo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-ui border border-border bg-background">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-6 py-5 text-left text-sm font-semibold text-foreground hover:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        <span>Click to expand (structural-base: 250ms fixed)</span>
        <span
          className={[
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border',
            'transition-[transform,background-color,border-color] duration-structural-base ease-smooth',
            open ? 'rotate-180 bg-action border-action text-action-fg' : 'bg-transparent text-foreground',
          ].join(' ')}
          aria-hidden="true"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      <div
        className={[
          'grid transition-[grid-template-rows] duration-structural-base ease-smooth',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className={['px-6 pb-5 text-sm text-foreground-muted transition-opacity duration-structural-base ease-smooth', open ? 'opacity-100' : 'opacity-0'].join(' ')}>
            This panel uses <code className="rounded-ui bg-muted px-1 py-0.5 font-mono text-xs">duration-structural-base</code> (250ms, fixed) regardless of the client&apos;s motionTempo setting. Structural animations never change.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MotionPreviewClient() {
  return (
    <div className="min-h-screen bg-muted px-[5%] py-16 md:py-24">
      <div className="container">

        <div className="mb-12">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">Design Preview</p>
          <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Motion System</h1>
          <p className="max-w-xl text-foreground-muted">
            Two token families: UI tokens scale with the client&apos;s motionTempo setting;
            structural tokens (header, modals, accordion) are always fixed at 150/250/400ms.
          </p>
        </div>

        {/* ── Section 1: UI Motion Tempo ── */}
        <section className="mb-20">
          <h2 className="mb-2 text-xl font-bold text-foreground">UI Motion — motionTempo</h2>
          <p className="mb-8 text-sm text-foreground-muted">
            Hover each card&apos;s demo card, click the toggle button, and hover the link to compare tempo.
            Each column scopes its own <code className="rounded-ui bg-muted px-1 py-0.5 font-mono text-xs">--motion-ui-*</code> variables inline.
          </p>
          <ul role="list" aria-label="Motion tempo presets" className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TEMPOS.map((t) => (
              <li key={t.key}>
                <TempoCard label={t.label} fast={t.fast} base={t.base} slow={t.slow} />
              </li>
            ))}
          </ul>
        </section>

        {/* ── Section 2: Structural Motion ── */}
        <section className="mb-20">
          <h2 className="mb-2 text-xl font-bold text-foreground">Structural Motion — always fixed</h2>
          <p className="mb-6 text-sm text-foreground-muted">
            Header scroll, modals, drawers, and accordions use these fixed values regardless of motionTempo.
          </p>
          <div className="mb-8 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  <th className="pb-3 pr-8">Token</th>
                  <th className="pb-3 pr-8">Tailwind utility</th>
                  <th className="pb-3 pr-8">Value</th>
                  <th className="pb-3">Used for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {[
                  ['--motion-structural-fast', 'duration-structural-fast', '150ms', 'Modal overlay fade'],
                  ['--motion-structural-base', 'duration-structural-base', '250ms', 'Accordion, subnav expand'],
                  ['--motion-structural-slow', 'duration-structural-slow', '400ms', 'Header scroll state, modal panel, drawer'],
                ].map(([token, util, val, use]) => (
                  <tr key={token}>
                    <td className="py-3 pr-8 text-foreground">{token}</td>
                    <td className="py-3 pr-8 text-action-text">{util}</td>
                    <td className="py-3 pr-8 font-semibold text-foreground">{val}</td>
                    <td className="py-3 font-sans text-foreground-muted">{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AccordionDemo />
        </section>

      </div>
    </div>
  )
}
