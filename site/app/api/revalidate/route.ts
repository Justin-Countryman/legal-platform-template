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

/**
 * The path a document's slug maps to. **The homepage is the one document whose
 * slug is not its path**, and getting that wrong is a FALSE SUCCESS rather than
 * a failure: `revalidatePath('/home/')` returns 200 and `revalidated: true`
 * while refreshing a route that does not exist.
 *
 * Found 2026-08-13 on a live client. `homePage.slug.current` is `home`, so an
 * operator publishing a homepage change got a green webhook, a 200, and a stale
 * homepage — and Sanity's delivery log recorded the success. It went unnoticed
 * because every OTHER type is a straight mapping: `about` → `/about/`,
 * `blog` → `/blog/`, `personal-injury` → `/personal-injury/`.
 *
 * Keyed on `_type`, not on the slug string, because a practice area legitimately
 * slugged `home` would be a different page.
 */
export function slugToPath(payload: WebhookPayload): string | null {
  if (payload._type === 'homePage') return '/'
  return payload.slug ? `/${payload.slug}/` : null
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

  const targetPath = payload.path ?? slugToPath(payload)

  if (targetPath) {
    revalidatePath(targetPath)
    revalidateTag('sanity', 'default')
    return Response.json({revalidated: true, path: targetPath, now: Date.now()})
  }

  revalidatePath('/', 'layout')
  revalidateTag('sanity', 'default')
  return Response.json({revalidated: true, scope: 'layout', now: Date.now()})
}
