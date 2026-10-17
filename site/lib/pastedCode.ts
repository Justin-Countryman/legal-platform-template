// Pasted HTML, mounted on the client under the Content Security Policy (monorepo [R-785], WS-CSP-DESIGN-2026-10-16 §4).
// Two places run code an operator pasted in Studio: the cookie banner, after an accept, runs Site Settings' analytics
// box ("Google Analytics 4 snippet only"), and `HtmlEmbed` runs a form's or a reviews section's embed code (Fillout,
// Elfsight). Under the policy an inline script would be refused, and so would a script from a host the policy does not
// list, each with a console error. So the HTML is parsed, and each script in it is recreated only if it can run:
//
// - an external script from the site's own origin or a host in `lib/scriptHosts.ts` is recreated as it was written
//   (a script made by the page's own code runs when inserted, as the old `createContextualFragment` mount did);
// - Google's own GA4 snippet, the inline half (dataLayer, `gtag('js', new Date())`, `gtag('config', 'G-…')`), is
//   recognised exactly and done here, with the same global `gtag` the snippet defines (Web Vitals reports through it);
// - anything else is left out and named in the report, which the caller marks on the page for Verify and the QA
//   Checker to list. A data block (`type="application/ld+json"`, a template) stays as written: it never runs.
// - The policy refuses an inline event handler (`onclick=`), a `javascript:` link and a form posting to another site
//   (`form-action 'self'`) too, each with a console error when used; each is taken off and named the same way
//   (`handler`, `javascript-url`, `form:<host>`).

import {scriptAllowed} from './scriptHosts'

export type MountReport = {
  /** What ran: each external script's address, and `gtag` for Google's snippet done here. */
  ran: string[]
  /** What was left out: each refused address, `inline` for each inline script that was not Google's snippet,
   *  `handler` for each element that carried inline event handlers, `javascript-url` for each `javascript:` address,
   *  and `form:<host>` for each form that posted to another site. */
  skipped: string[]
}

/** Google's GA4 snippet's inline half, with every space removed: the dataLayer, the global gtag shim, `gtag('js',
 *  new Date())` and one or more `gtag('config', 'G-…')` with no options. Anything else is not this snippet. */
const GA4_SNIPPET =
  /^window\.dataLayer=window\.dataLayer\|\|\[\];?functiongtag\(\)\{dataLayer\.push\(arguments\);?\}gtag\((['"])js\1,newDate\(\)\);?((?:gtag\((['"])config\3,(['"])G-[A-Z0-9]{4,}\4\);?)+)$/

/** The measurement IDs, when `text` is exactly Google's GA4 snippet's inline half; otherwise null. */
export function ga4Snippet(text: string): string[] | null {
  const m = GA4_SNIPPET.exec(text.replace(/\s+/g, ''))
  return m ? [...m[2].matchAll(/G-[A-Z0-9]{4,}/g)].map((x) => x[0]) : null
}

const RUNNABLE_TYPE = /^(|text\/javascript|application\/javascript|text\/ecmascript|application\/ecmascript|module)$/

type Gtag = (...args: unknown[]) => void
type GtagWindow = Window & {dataLayer?: unknown[]; gtag?: Gtag}

/** Google's own shim, defined once on the page as the snippet's `function gtag(){dataLayer.push(arguments)}` did. */
function shim(w: GtagWindow): Gtag {
  if (typeof w.gtag !== 'function') {
    w.gtag = function gtag() {
      w.dataLayer = w.dataLayer || []
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments)
    }
  }
  return w.gtag
}

/** Parse `html`, keep the scripts that can run under the policy, append the rest of the markup to `container`. */
export function mountPastedHtml(container: Element, html: string): MountReport {
  const doc = container.ownerDocument
  const w = doc.defaultView as GtagWindow
  const fragment = doc.createRange().createContextualFragment(html)
  const report: MountReport = {ran: [], skipped: []}
  const configs: string[] = []
  for (const old of Array.from(fragment.querySelectorAll('script'))) {
    const type = (old.getAttribute('type') ?? '').trim().toLowerCase()
    if (!RUNNABLE_TYPE.test(type)) continue
    const src = old.getAttribute('src')
    if (src) {
      if (scriptAllowed(src, w.location.origin)) {
        const fresh = doc.createElement('script')
        for (const a of Array.from(old.attributes)) fresh.setAttribute(a.name, a.value)
        old.replaceWith(fresh)
        report.ran.push(src)
      } else {
        old.remove()
        report.skipped.push(src)
      }
      continue
    }
    const ids = ga4Snippet(old.textContent ?? '')
    old.remove()
    if (ids) configs.push(...ids)
    else report.skipped.push('inline')
  }
  for (const el of Array.from(fragment.querySelectorAll('*'))) {
    const handlers = Array.from(el.attributes).filter((a) => /^on/i.test(a.name))
    if (handlers.length) {
      for (const a of handlers) el.removeAttribute(a.name)
      report.skipped.push('handler')
    }
    for (const name of ['href', 'src', 'action', 'formaction', 'xlink:href']) {
      const v = el.getAttribute(name)
      if (v !== null && /^\s*javascript:/i.test(v)) {
        el.removeAttribute(name)
        report.skipped.push('javascript-url')
      }
    }
    if (el.tagName === 'FORM') {
      const action = el.getAttribute('action')
      let host: string | null = null
      try {
        const url = action ? new URL(action, w.location.href) : null
        if (url && url.origin !== w.location.origin) host = url.host
      } catch {
        host = 'invalid'
      }
      if (host) {
        el.removeAttribute('action')
        el.setAttribute('data-embed-blocked', `form:${host}`)
        report.skipped.push(`form:${host}`)
      }
    }
  }
  container.appendChild(fragment)
  if (configs.length) {
    const gtag = shim(w)
    gtag('js', new Date())
    for (const id of new Set(configs)) gtag('config', id)
    report.ran.push('gtag')
  }
  return report
}
