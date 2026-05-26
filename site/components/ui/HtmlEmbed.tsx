'use client'

import {useEffect, useRef} from 'react'

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
// Mounts raw HTML client-side using createContextualFragment so embedded
// <script> tags execute. dangerouslySetInnerHTML does not run scripts —
// this matters for form embeds (HubSpot, etc.) and review-platform widgets.

export function HtmlEmbed({html, className, 'aria-label': ariaLabel}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''
    const fragment = document.createRange().createContextualFragment(html)
    container.appendChild(fragment)
  }, [html])

  return <div ref={containerRef} className={className} aria-label={ariaLabel} />
}
