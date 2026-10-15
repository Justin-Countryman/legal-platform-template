'use client'

import {CONSENT_OPEN_EVENT} from '@/lib/consent'

/** "Cookie settings" in the footer's legal links: reopens the cookie banner, so a visitor can change a choice as
 *  easily as they made it. Site Settings can name it "Your Privacy Choices" or "Do Not Sell or Share My Personal
 *  Information" for a firm whose lawyer says the law requires that link (monorepo WS-AD-PIXELS-DESIGN-2026-10-15). A button, not a link: it opens something on this page and goes nowhere. The footers render
 *  it only when the site has a consent script (`hasConsentScripts`). */
export function ConsentSettingsButton({className, label}: {className?: string; label?: string | null}) {
  return (
    <button
      type="button"
      data-consent-settings=""
      className={className}
      onClick={(e) => window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT, {detail: {opener: e.currentTarget}}))}
    >
      {label || 'Cookie settings'}
    </button>
  )
}
