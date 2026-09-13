import {revalidatePath} from 'next/cache'
import type {NextRequest} from 'next/server'
import {parseBody} from 'next-sanity/webhook'

// Sanity webhook handler. Configure in Sanity dashboard (`API → Webhooks`):
//   - URL: https://${domain}/api/revalidate
//   - Method: POST
//   - HTTP Headers: `x-sanity-revalidate-secret: <SANITY_REVALIDATE_SECRET>`
//   - Secret: <SANITY_REVALIDATE_SECRET> (the hook's HMAC secret; the same
//     value as the header, or every delivery answers 401 `Bad signature`)
//   - Projection (optional): {"_type": _type}
//   - Trigger: Create / Update / Delete on every document type
//
// Scope: the ROOT LAYOUT, on every authenticated event. Every document renders
// somewhere shared: the header nav lists attorneys and practice areas, the
// footer lists practice areas and locations, sidebars list the practice-area
// tree and recent posts, homepage blocks list attorneys. No document's change is
// contained to its own URL, so a type-to-paths map would read "everything" for
// most rows and be wrong for the rest. `revalidatePath('/', 'layout')` is one
// tag write at event time; every route regenerates on its next visit (blocking,
// not stale-while-revalidate). The 1h time-based revalidate stays the backstop.
//
// This is also why there is no per-path branch. The 2026-08-13 defect (the
// homepage's slug is `home`, the handler called `revalidatePath('/home/')`, a
// route that does not exist, and returned 200 `revalidated: true` while the
// homepage stayed stale) cannot recur: there is no path to get wrong.
//
// Security: two checks, both against `SANITY_REVALIDATE_SECRET` (server-only;
// never NEXT_PUBLIC_). The shared-secret header is checked first; then the
// body's HMAC (`sanity-webhook-signature`, verified by `next-sanity/webhook`).
// One POST now purges every route, so a static header over TLS is no longer
// enough on its own. The Studio-side hook must carry the same value as its HMAC
// `secret` (the monorepo's Deploy-Setup-Tool writes it) or deliveries 401.

export const dynamic = 'force-dynamic' // never cache the webhook itself

type WebhookPayload = {
  _type?: string
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-sanity-revalidate-secret')
  const expected = process.env.SANITY_REVALIDATE_SECRET

  if (!expected) {
    return Response.json(
      {revalidated: false, reason: 'Webhook not configured (SANITY_REVALIDATE_SECRET unset).'},
      {status: 500},
    )
  }
  if (secret !== expected) {
    return Response.json({revalidated: false, reason: 'Unauthorized'}, {status: 401})
  }

  // `parseBody` is typed against NextRequest but reads only `headers.get` and
  // `text()`, both on the standard Request. The third argument disables the
  // library's 3s "wait for Content Lake eventual consistency" sleep: the
  // handler fetches nothing, so there is nothing to wait for.
  const {isValidSignature, body} = await parseBody<WebhookPayload>(
    request as NextRequest,
    expected,
    false,
  )
  if (isValidSignature !== true) {
    return Response.json({revalidated: false, reason: 'Bad signature'}, {status: 401})
  }

  revalidatePath('/', 'layout')
  return Response.json({
    revalidated: true,
    scope: 'layout',
    _type: body?._type ?? null,
    now: Date.now(),
  })
}
