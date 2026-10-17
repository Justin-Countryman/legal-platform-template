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
  '(function(d,w){if(w.__nfRelay)return;w.__nfRelay=1;' +
  "var A='(self.__next_f=self.__next_f||[]).push(',B='self.__next_f.push(',q=[],u=[],o,p;" +
  'function at(t){return t.slice(0,A.length)===A?A.length:t.slice(0,B.length)===B?B.length:0}' +
  'function may(t){return A.indexOf(t)===0||B.indexOf(t)===0}' +
  'function grab(n){if(n.nodeName!=="SCRIPT"||n.src||n.type||n.__nf)return;var t=n.text;' +
  'if(at(t)){n.__nf=1;n.type="text/x-next-f";q.push(n)}' +
  'else if(may(t)){u.push(n);p.observe(n,{characterData:true,childList:true,subtree:true})}}' +
  'function again(){var r=u;u=[];for(var i=0;i<r.length;i++)grab(r[i])}' +
  'function flush(end){while(q.length){var n=q[0],t=n.text,k=at(t),v=void 0;' +
  'if(t.slice(-1)===")")try{v=JSON.parse(t.slice(k,-1))}catch(e){}' +
  'if(v===void 0){if(!end)return;q.shift();n.setAttribute("data-relay","failed");continue}' +
  'q.shift();(w.__next_f=w.__next_f||[]).push(v)}}' +
  'p=new MutationObserver(function(){again();flush(0)});' +
  'o=new MutationObserver(function(r){again();' +
  'for(var i=0;i<r.length;i++)for(var a=r[i].addedNodes,j=0;j<a.length;j++)grab(a[j]);flush(0)});' +
  'o.observe(d.documentElement,{childList:true,subtree:true});' +
  'd.addEventListener("DOMContentLoaded",function(){o.disconnect();p.disconnect();again();flush(1)})' +
  '})(document,self)'

/**
 * The cookie banner's before-paint decision (monorepo BI/rules/legal-pages.md), as `bootConsent` and `cleanThankYou`
 * in `lib/consent.ts` state it: the thank-you page's address loses its query string, then `html[data-consent]` is set
 * from the stored choice, Global Privacy Control and the purposes in this element's `data-purposes` (a JSON array).
 * `lib/__tests__/inlineScripts.test.ts` runs this text and those two functions over the same states and requires the
 * same result, so the two cannot drift.
 */
export const CONSENT_BOOT_JS =
  '(function(d,w){' +
  'if(w.location.pathname==="/thank-you"&&w.location.search)' +
  'w.history.replaceState(w.history.state,"",w.location.pathname+w.location.hash);' +
  'var s=d.currentScript,ps=[];try{ps=JSON.parse(s&&s.getAttribute("data-purposes")||"[]")}catch(e){ps=[]}' +
  `var key=${JSON.stringify(CONSENT_STORAGE_KEY)},keep=${CONSENT_KEEP_SECONDS},stored=null;` +
  'try{var raw=null;try{raw=w.localStorage.getItem(key)}catch(e){raw=null}' +
  'if(!raw){var jar=("; "+d.cookie).split("; "+key+"=");raw=jar.length>1?decodeURIComponent(jar[1].split(";")[0]):null}' +
  'var v=raw?JSON.parse(raw):null,now=Math.floor(Date.now()/1000),ok=function(c){return c==="granted"||c==="denied"};' +
  'if(v&&typeof v==="object"&&!Array.isArray(v)&&typeof v.at==="number"&&isFinite(v.at)&&v.at<=now&&now-v.at<keep){' +
  'if(v.v===1&&ok(v.choice))stored={analytics:v.choice};' +
  'else if(v.v===2&&(v.analytics===undefined||ok(v.analytics))&&(v.ads===undefined||ok(v.ads))&&(v.analytics||v.ads)){' +
  'stored={};if(v.analytics)stored.analytics=v.analytics;if(v.ads)stored.ads=v.ads;if(v.gpc===true)stored.gpc="yes"}}' +
  '}catch(e){stored=null}' +
  'var gpc=w.navigator.globalPrivacyControl===true,ask=false,granted=0,denied=0;' +
  'for(var i=0;i<ps.length;i++){var c=(stored&&stored[ps[i]])||(gpc?"denied":"");' +
  'if(ps[i]==="ads"&&gpc&&c==="granted"&&!(stored&&stored.gpc))c="denied";' +
  'if(!c)ask=true;else if(c==="granted")granted++;else denied++}' +
  'd.documentElement.setAttribute("data-consent",ask?"ask":denied===0&&granted>0?"granted":granted===0?"denied":"mixed")' +
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
