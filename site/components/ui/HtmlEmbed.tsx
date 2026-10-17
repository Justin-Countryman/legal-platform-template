'use client'

import {useEffect, useRef} from 'react'
import {mountPastedHtml} from '@/lib/pastedCode'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  /** Raw HTML string (typically from a Sanity rich-text field). */
  html:        string
  className?:  string
  /** Optional accessible label for the embed container. */
  'aria-label'?: string
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Mounts raw HTML client-side so embedded <script> tags execute.
// dangerouslySetInnerHTML does not run scripts — this matters for form embeds
// (Fillout) and review-platform widgets (Elfsight). Under the Content Security
// Policy (monorepo [R-785]) only a script the policy allows is recreated
// (`lib/pastedCode.ts`); anything else is left out and named in
// `data-embed-blocked`, which Verify and the QA Checker list, never left to
// fail with a console error.

export function HtmlEmbed({html, className, 'aria-label': ariaLabel}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''
    container.removeAttribute('data-embed-blocked')
    const {skipped} = mountPastedHtml(container, html)
    if (skipped.length) container.setAttribute('data-embed-blocked', skipped.join(' '))
  }, [html])

  return <div ref={containerRef} className={className} aria-label={ariaLabel} />
}
