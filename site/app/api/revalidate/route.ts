import {revalidatePath, revalidateTag} from 'next/cache'

// Sanity webhook handler. Configure in Sanity dashboard (`API → Webhooks`):
//   - URL: https://${domain}/api/revalidate
//   - Method: POST
//   - HTTP Headers: `x-sanity-revalidate-secret: <SANITY_REVALIDATE_SECRET>`
//   - Projection (optional, for granular invalidation):
//       {"_type": _type, "slug": slug.current}
//   - Trigger: Create / Update / Delete on all routable document types
//
// Behavior:
//   - Default: revalidates the root layout (broad invalidation; the 1h
//     time-based revalidate is the backstop). Every page below `/` is
//     re-fetched on next request.
//   - When the webhook payload includes `slug` or `path`, revalidates that
//     path directly + the `sanity` tag (for future tag-keyed fetches).
//
// Security: shared-secret header check. The secret must match
// `SANITY_REVALIDATE_SECRET` (server-only env var; never NEXT_PUBLIC_).

export const dynamic = 'force-dynamic' // never cache the webhook itself

type WebhookPayload = {
  _type?: string
  slug?: string
  path?: string
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

  let payload: WebhookPayload = {}
  try {
    payload = (await request.json()) as WebhookPayload
  } catch {
    // Empty body / non-JSON is fine — fall through to broad revalidation.
  }

  const targetPath = payload.path ?? (payload.slug ? `/${payload.slug}/` : null)

  if (targetPath) {
    revalidatePath(targetPath)
    revalidateTag('sanity', 'default')
    return Response.json({revalidated: true, path: targetPath, now: Date.now()})
  }

  revalidatePath('/', 'layout')
  revalidateTag('sanity', 'default')
  return Response.json({revalidated: true, scope: 'layout', now: Date.now()})
}
