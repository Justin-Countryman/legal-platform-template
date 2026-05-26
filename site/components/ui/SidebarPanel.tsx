import type {ReactNode} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  /** Optional eyebrow-style heading rendered above the body. */
  title?:     string
  children:   ReactNode
  className?: string
  /**
   * When `true`, renders a thin underline beneath the title (sits between the
   * eyebrow heading and the body content). Driven by the
   * `designSettings.sidebarWidgetHeaderLine` site-level setting — WS-Sidebar
   * Phase 2.5 — `BI/BI-Sidebar.md` §5a. No-op when `title` is absent.
   * Default `false` preserves the pre-Phase-2.5 render for any caller that
   * hasn't opted in (currently only Sidebar.tsx).
   */
  showHeaderLine?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Sidebar widget surface — the canonical container shared by every Sidebar
// block (search, TOC, nav, CTA box, form embed, attorney list). Bakes in
// the platform widget chrome and the dominant eyebrow heading treatment.
// Consumers compose body content as children and pass an optional title.

export function SidebarPanel({title, children, className, showHeaderLine = false}: Props) {
  const cls = [
    'rounded-ui border border-border bg-muted p-5 shadow-card-rest',
    className ?? '',
  ].filter(Boolean).join(' ')

  const titleCls = [
    'text-sm font-bold uppercase tracking-wider text-foreground',
    // Phase 2.5: underline beneath the eyebrow heading. The border-bottom +
    // pb-2 splits the title's mb-3 spacing into (rule above the body) +
    // (gap below the rule) so the visual rhythm stays roughly consistent
    // whether the rule is on or off. `border-foreground/10` is cascade-aware
    // — flips with the foreground token on dark surfaces via the standard
    // 8-token cascade (per skill-color-system).
    showHeaderLine && title ? 'mb-3 border-b border-foreground/10 pb-2' : 'mb-3',
  ].join(' ')

  return (
    <div className={cls}>
      {title && (
        <p className={titleCls} data-sidebar-header-line={showHeaderLine ? 'true' : 'false'}>
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
