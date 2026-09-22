import {NextResponse, type NextRequest} from 'next/server'
import {parseChoices, previewPath} from '@/lib/preview/plan'
import {PREVIEW_COOKIE, PREVIEW_PATH, asGrant, isLive, nowSeconds, verifyToken} from '@/lib/preview/session'

// ─── The way into a preview ───────────────────────────────────────────────────
//
// Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §2.1). A signed link lands here, the link
// becomes the session cookie, and the browser is sent to the preview address. The
// cookie is scoped to `/site-preview`, so the browser never sends it to a live page,
// and it lasts exactly as long as the link. Anything else is a 404 with no hint.
// Rotating `SITE_PREVIEW_SECRET` ends every link and every session at once.

export const dynamic = 'force-dynamic'

const HEADERS = {'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store'}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t')
  const grant = asGrant(verifyToken(token))
  const now = nowSeconds()
  if (!token || !grant || !isLive(grant, now)) {
    return new NextResponse('Not found', {status: 404, headers: HEADERS})
  }
  const choices = parseChoices(grant.styleSet ?? 'site', grant.palette ?? 'site', grant.view ?? 'design')
  if (!choices) return new NextResponse('Not found', {status: 404, headers: HEADERS})

  const response = NextResponse.redirect(new URL(previewPath(choices), request.url), {status: 303, headers: HEADERS})
  response.cookies.set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: PREVIEW_PATH,
    maxAge: grant.exp - now,
  })
  return response
}
