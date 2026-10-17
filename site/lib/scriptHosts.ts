// The outside hosts a firm's site may load scripts from, in one list (monorepo [R-785], WS-CSP-DESIGN-2026-10-16 §3.3
// and §4). The Content Security Policy's `script-src` names exactly these (`lib/securityHeaders.ts`), and the code that
// mounts pasted HTML (`lib/pastedCode.ts`: the analytics box, form and reviews embeds) runs a script only from one of
// them, so a script the policy would block is skipped and named, never left to fail with a console error.
//
// A vendor not here does not run on any firm's site until its host is added to this list (a template change).

export type ScriptHost = {source: string; why: string}

export const SCRIPT_HOSTS: readonly ScriptHost[] = [
  // Google's CSP guide for its tags (developers.google.com/tag-platform/security/guides/csp) lists
  // www.googletagmanager.com for Google Analytics and adds www.googleadservices.com and www.google.com for Google Ads;
  // gtag.js also loads googleads.g.doubleclick.net/pagead/viewthroughconversion as a script, which the guide lists
  // only for images (measured, ADV-CSP-B, 2026-10-16).
  {source: 'https://www.googletagmanager.com', why: 'Google Analytics 4 and the Google Ads tag (gtag.js)'},
  {source: 'https://www.googleadservices.com', why: 'the Google Ads tag'},
  {source: 'https://www.google.com', why: 'the Google Ads tag'},
  {source: 'https://googleads.g.doubleclick.net', why: 'the Google Ads tag (view-through conversions)'},
  // Meta: "allow JavaScript to load from https://connect.facebook.net".
  {source: 'https://connect.facebook.net', why: 'the Meta pixel'},
  // Microsoft UET: bat.js and its bat.bing.com/p/action script. Microsoft Clarity, which UET loads when the firm turns
  // on "Enable Clarity" for the tag, is left out on purpose (Studio's help text says to leave it off).
  {source: 'https://bat.bing.com', why: 'Microsoft Advertising UET'},
  {source: 'https://snap.licdn.com', why: 'the LinkedIn Insight Tag'},
  // Fillout's embed script makes only iframes and style elements.
  {source: 'https://server.fillout.com', why: 'Fillout form embeds'},
  // Elfsight: today's snippet loads elfsightcdn.com itself (a *.elfsightcdn.com source would not match it), its widget
  // code comes from universe-static.elfsightcdn.com, and the older snippet from static.elfsight.com.
  {source: 'https://elfsightcdn.com', why: 'Elfsight reviews widgets (the platform script)'},
  {source: 'https://universe-static.elfsightcdn.com', why: 'Elfsight reviews widgets (the widget code)'},
  {source: 'https://static.elfsight.com', why: 'Elfsight reviews widgets (the older snippet)'},
]

/** Whether a script at `src` (as written, resolved against the page) may run under the policy: the site's own
 *  origin, or https on a listed host, exactly (the list holds no wildcard, so CSP's own matching is host equality). */
export function scriptAllowed(src: string, pageOrigin: string): boolean {
  let url: URL
  try {
    url = new URL(src, pageOrigin)
  } catch {
    return false
  }
  if (url.origin === new URL(pageOrigin).origin) return true
  if (url.protocol !== 'https:') return false
  return url.port === '' && SCRIPT_HOSTS.some(({source}) => source === `https://${url.hostname.toLowerCase()}`)
}
