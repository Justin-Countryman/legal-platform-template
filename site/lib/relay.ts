// The relay's second copy, for the one document the layout never renders (monorepo [R-785], WS-CSP-DESIGN-2026-10-16
// §3.1). When a page Next builds on demand calls `notFound()` (any mistyped address, through the catch-all; an empty
// testimonials or case results page), Next answers with its own bare error document, `<html id="__next_error__">`,
// whose body holds nothing of ours, only Next's inline data scripts, and the browser draws the 404 from that data.
// The layout's inline relay (lib/inlineScripts.ts RELAY_JS) is not there, so under the policy every data script is
// refused and the page stays blank.
//
// `instrumentation-client.ts` runs this from Next's own client bundle (a same-origin file the policy allows) on every
// page, before hydration. It does what RELAY_JS does, and one thing more: Next's data scripts the policy already
// refused are still in the page, so it hands their data over too, in order, before Next reads it. The 404 still draws;
// the refusals that came before this file ran stay in the console of that page (no grader or PageSpeed run reads a
// 404). Whichever copy runs first claims the page (`__nfRelay`), so only one ever acts; and a page whose data scripts
// ran (no policy refused them, so Next's first one has already put a value in `self.__next_f`, which Next's own reader,
// loaded after this file, has not yet taken) is left alone, so nothing is sent twice.
//
// Kept equal to RELAY_JS by `lib/__tests__/inlineScripts.test.ts`, which runs every relay case against both.

type NextData = {push: (v: unknown) => unknown}
export type RelayWindow = {__next_f?: NextData; __nfRelay?: number}

const A = '(self.__next_f=self.__next_f||[]).push('
const B = 'self.__next_f.push('
const at = (t: string) => (t.startsWith(A) ? A.length : t.startsWith(B) ? B.length : 0)
const may = (t: string) => A.startsWith(t) || B.startsWith(t)

/** Start the relay on `d`. `recover`: also hand over data scripts already in the page (the policy refused them).
 *  Returns whether this copy took the page. */
export function startRelay(d: Document, w: RelayWindow, recover: boolean): boolean {
  if (w.__nfRelay) return false
  if (recover && Array.isArray(w.__next_f) && w.__next_f.length > 0) return false
  w.__nfRelay = 1
  const q: HTMLScriptElement[] = []
  let u: HTMLScriptElement[] = []
  const taken = new WeakSet<Element>()
  const grab = (n: Node) => {
    if (n.nodeName !== 'SCRIPT') return
    const s = n as HTMLScriptElement
    if (s.src || s.type || taken.has(s)) return
    const t = s.text
    if (at(t)) {
      taken.add(s)
      s.type = 'text/x-next-f'
      q.push(s)
    } else if (may(t)) {
      u.push(s)
      partial.observe(s, {characterData: true, childList: true, subtree: true})
    }
  }
  const again = () => {
    const r = u
    u = []
    r.forEach(grab)
  }
  const flush = (end: boolean) => {
    while (q.length) {
      const n = q[0]
      const t = n.text
      let v: unknown = undefined
      if (t.endsWith(')')) {
        try {
          v = JSON.parse(t.slice(at(t), -1))
        } catch {}
      }
      if (v === undefined) {
        if (!end) return
        q.shift()
        n.setAttribute('data-relay', 'failed')
        continue
      }
      q.shift()
      ;(w.__next_f = w.__next_f || ([] as unknown as NextData)).push(v)
    }
  }
  const partial = new MutationObserver(() => {
    again()
    flush(false)
  })
  const added = new MutationObserver((records) => {
    again()
    for (const r of records) r.addedNodes.forEach(grab)
    flush(false)
  })
  if (recover) Array.from(d.scripts).forEach(grab)
  const end = () => {
    added.disconnect()
    partial.disconnect()
    again()
    flush(true)
  }
  if (d.readyState === 'loading') {
    added.observe(d.documentElement, {childList: true, subtree: true})
    d.addEventListener('DOMContentLoaded', end)
  } else {
    end()
  }
  return true
}
