'use client'

import {CONSENT_OPEN_EVENT} from '@/lib/consent'

/** "Cookie settings" in the footer's legal links: reopens the cookie banner, so a visitor can change a choice as
 *  easily as they made it. A button, not a link: it opens something on this page and goes nowhere. The footers render
 *  it only when the site has a consent script (`hasConsentScripts`). */
export function ConsentSettingsButton({className}: {className?: string}) {
  return (
    <button
      type="button"
      data-consent-settings=""
      className={className}
      onClick={(e) => window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT, {detail: {opener: e.currentTarget}}))}
    >
      Cookie settings
    </button>
  )
}
