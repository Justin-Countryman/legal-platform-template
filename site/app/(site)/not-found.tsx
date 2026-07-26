import type {Metadata} from 'next'
import {NotFoundContent} from '@/components/ui/NotFoundContent'
import {NOT_FOUND_TITLE} from '@/lib/seoTitle'

/**
 * THE 404's TITLE COMES FROM HERE, and it cannot come from anywhere else.
 *
 * Doctrine (`BI-Content.md` § Title tags) says a 404 renders
 * `Page Not Found - <firm name>`. The obvious-looking implementation — having
 * each route's doc-missing branch return `{title: 'Page Not Found'}` — DOES
 * NOT WORK, and was tried and reverted on 2026-07-26 after a real render
 * showed the bare firm name anyway. When a route calls `notFound()`, Next
 * discards that route's resolved metadata and renders this boundary, so those
 * branches never reach the browser. They are inert for the title and always
 * were; the pre-existing literals there (`'Attorney Profile'`, `'Blog Post'`)
 * were equally inert.
 *
 * No document is invented for this. The `404page` CS-SITEMAP type deliberately
 * creates no Sanity document in either tool, and nothing here reads the
 * dataset — this is a static export, so it costs no fetch. The firm name is
 * appended by the root layout template exactly as it is for every other page.
 */
export const metadata: Metadata = {title: NOT_FOUND_TITLE}

export default function NotFound() {
  return <NotFoundContent />
}
