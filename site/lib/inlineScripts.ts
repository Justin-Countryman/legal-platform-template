// Every inline script the site renders, as fixed text, so the Content Security Policy can name each by its hash
// (monorepo [R-785]: hashes, never a nonce; WS-CSP-DESIGN-2026-10-16 §3). `lib/securityHeaders.ts` hashes these
// strings; the layouts render them with `dangerouslySetInnerHTML`, so the bytes the browser hashes are these bytes.
//
// WHY FIXED TEXT. A script built from `Function.prototype.toString` (what `bootScript` did) carries the server bundle's
// minified text, which differs from what `next.config.ts`'s own compile would produce, so its hash could never be
// computed for the header. Anything a script needs per firm or per page is read from an attribute on its own element
// (`document.currentScript`), never written into its text. Built only from string literals and constants, these values
// are byte-identical in every compile.
//
// JSON-LD needs nothing here: a `type="application/ld+json"` block is never executed, so the policy never checks it.

import {CONSENT_KEEP_SECONDS, CONSENT_STORAGE_KEY} from './consent'

/**
 * THE RELAY. Next's App Router writes each page's data as executable inline scripts,
 * `<script>self.__next_f.push([1,"…"])</script>`, different on every page and after every regeneration, so no fixed
 * header can hash them, and a fixed header that does not breaks every page (the record's §1: 13 to 14 scripts blocked
 * a page, nothing hydrates). Rendered first in <body>, before any of them, this script watches the page as it parses.
 * The HTML parser runs a microtask checkpoint before it prepares a script, and a MutationObserver callback runs there:
 * the relay changes each data script's `type` before it is prepared, so it is never run and never checked, then reads
 * its text, takes the JSON argument with `JSON.parse` (never eval) and pushes the value into `self.__next_f` itself,
 * in document order. Only scripts with no `type` and no `src` whose text is exactly one of Next's two shapes are
 * touched; a script seen with part of its text is decided once the text is complete. At DOMContentLoaded (before
 * Next's own handler, registered later, closes the stream) it disconnects and flushes; a script whose text never
 * parses is marked `data-relay="failed"`, which `scripts/ci/csp-served.mjs` refuses. Its second copy, `lib/relay.ts`,
 * runs from Next's client bundle for the one document this layout is not in (Next's bare 404 shell); whichever runs
 * first claims the page (`__nfRelay`), so only one acts.
 *
 * Detected by: `lib/__tests__/inlineScripts.test.ts` (the shapes, partial text, order, nothing else touched) and
 * `scripts/ci/csp-served.mjs` (every route served under the real header, normal and slow delivery: hydrated, no
 * violation, no console error, the relayed values equal to the page's own).
 */
export const RELAY_JS =
  "(function(d,w){if(w.__nfRelay)return;w.__nfRelay=1;" +
  "var A='(self.__next_f=self.__next_f||[]).push(',B='self.__next_f.push(',q=[],u=[],o,p;" +
  'function at(t){return t.slice(0,A.length)===A?A.length:t.slice(0,B.length)===B?B.length:0}' +
  'function may(t){return A.indexOf(t)===0||B.indexOf(t)===0}' +
  "function grab(n){if(n.nodeName!=='SCRIPT'||n.src||n.type)return;var t=n.text;" +
  "if(at(t)){n.type='text/x-next-f';q.push(n)}" +
  'else if(may(t)){u.push(n);p.observe(n,{characterData:true,childList:true,subtree:true})}}' +
  'function again(){var r=u;u=[];r.forEach(grab)}' +
  'function flush(e){while(q.length){var n=q[0],t=n.text,v=void 0;' +
  "if(t.slice(-1)===')')try{v=JSON.parse(t.slice(at(t),-1))}catch(x){}" +
  "if(v===void 0){if(!e)return;q.shift();n.setAttribute('data-relay','failed');continue}" +
  'q.shift();(w.__next_f=w.__next_f||[]).push(v)}}' +
  'p=new MutationObserver(function(){again();flush(0)});' +
  'o=new MutationObserver(function(r){again();r.forEach(function(x){x.addedNodes.forEach(grab)});flush(0)});' +
  'o.observe(d.documentElement,{childList:true,subtree:true});' +
  "d.addEventListener('DOMContentLoaded',function(){o.disconnect();p.disconnect();again();flush(1)})" +
  '})(document,self)'

/**
 * The cookie banner's before-paint decision (monorepo BI/rules/legal-pages.md), as `bootConsent` and `cleanThankYou`
 * in `lib/consent.ts` state it: the thank-you page's address loses its query string, then `html[data-consent]` is set
 * from the stored choice, Global Privacy Control and the purposes in this element's `data-purposes` (a JSON array).
 * `lib/__tests__/inlineScripts.test.ts` runs this text and those two functions over the same states and requires the
 * same result, so the two cannot drift.
 */
export const CONSENT_BOOT_JS =
  '(function(d,w){var l=w.location,s=d.currentScript,p=[],o=null,r=null,v,n,g,a=0,G=0,D=0,i,c,' +
  `k='${CONSENT_STORAGE_KEY}',K=${CONSENT_KEEP_SECONDS},` +
  "ok=function(x){return x==='granted'||x==='denied'};" +
  "if(l.pathname==='/thank-you'&&l.search)w.history.replaceState(w.history.state,'',l.pathname+l.hash);" +
  "try{p=JSON.parse(s&&s.getAttribute('data-purposes')||'[]')}catch(e){p=[]}" +
  'try{try{r=w.localStorage.getItem(k)}catch(e){r=null}' +
  "if(!r){c=('; '+d.cookie).split('; '+k+'=');r=c.length>1?decodeURIComponent(c[1].split(';')[0]):null}" +
  'v=r?JSON.parse(r):null;n=Math.floor(Date.now()/1e3);' +
  "if(v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.at==='number'&&isFinite(v.at)&&v.at<=n&&n-v.at<K){" +
  'if(v.v===1&&ok(v.choice))o={analytics:v.choice};' +
  'else if(v.v===2&&(v.analytics===void 0||ok(v.analytics))&&(v.ads===void 0||ok(v.ads))&&(v.analytics||v.ads)){' +
  "o={};if(v.analytics)o.analytics=v.analytics;if(v.ads)o.ads=v.ads;if(v.gpc===true)o.gpc='yes'}}" +
  '}catch(e){o=null}' +
  'g=w.navigator.globalPrivacyControl===true;' +
  "for(i=0;i<p.length;i++){c=(o&&o[p[i]])||(g?'denied':'');" +
  "if(p[i]==='ads'&&g&&c==='granted'&&!(o&&o.gpc))c='denied';" +
  "if(!c)a=1;else if(c==='granted')G++;else D++}" +
  "d.documentElement.setAttribute('data-consent',a?'ask':D===0&&G>0?'granted':G===0?'denied':'mixed')" +
  '})(document,window)'

/**
 * The operator's preview (Phase 17A): no cookie banner, and each Google Analytics ID in this element's `data-ga-off`
 * (space-separated, `lib/preview/analytics.ts`) switched off before anything could load it, so a preview visit is not
 * counted as the firm's traffic. One fixed script for what were two (the banner off, and a per-firm line of IDs); the
 * preview carries no policy, so it needs no hash, and it is fixed text only so no script anywhere is written per firm.
 */
export const PREVIEW_OFF_JS =
  '(function(d,w){d.documentElement.setAttribute("data-consent","off");' +
  'var s=d.currentScript,ids=(s&&s.getAttribute("data-ga-off")||"").split(" ");' +
  'for(var i=0;i<ids.length;i++)if(/^G-[A-Z0-9]{4,}$/.test(ids[i]))w["ga-disable-"+ids[i]]=true' +
  '})(document,window)'

/** Every inline script a page under the policy may render, for its hash list. The preview's switch-off is not here:
 *  the operator's preview carries no policy (`lib/securityHeaders.ts` CSP_SOURCE), because its dynamic render streams
 *  React's own inline scripts, which no fixed hash can name. */
export const INLINE_SCRIPTS = {relay: RELAY_JS, consentBoot: CONSENT_BOOT_JS} as const
