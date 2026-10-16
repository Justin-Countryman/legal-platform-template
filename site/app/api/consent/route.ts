/**
 * The cookie banner's durable copy of a visitor's choice (monorepo [R-751]). The banner stores the choice in the
 * browser at once and posts the same entry here; this answers with a first-party cookie of the same name, set by the
 * server, which Safari keeps for its full life (it deletes a site's script-written storage, and caps a cookie the page
 * writes, after seven days without a click on the site). Nothing is kept on the server: the answer is the cookie.
 *
 * Readable by the page (not HttpOnly), since the before-paint script reads it; SameSite=Lax and refused from any
 * other origin, so another site cannot set a visitor's choice; never cached.
 */

import {choiceCookieHeader} from '@/lib/consent'

const NO_STORE = {'Cache-Control': 'no-store'}

export async function POST(request: Request): Promise<Response> {
  const host = request.headers.get('host')
  let origin: string | null = null
  try {
    origin = new URL(request.headers.get('origin') ?? '').host
  } catch {
    origin = null
  }
  if (!host || origin !== host) return new Response(null, {status: 403, headers: NO_STORE})
  const body = await request.text()
  if (body.length > 512) return new Response(null, {status: 413, headers: NO_STORE})
  const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '')
  const cookie = choiceCookieHeader(body, Math.floor(Date.now() / 1000), proto === 'https')
  if (!cookie) return new Response(null, {status: 400, headers: NO_STORE})
  return new Response(null, {status: 204, headers: {...NO_STORE, 'Set-Cookie': cookie}})
}
