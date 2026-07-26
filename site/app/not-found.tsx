import type {Metadata} from 'next'
import {NotFoundContent} from '@/components/ui/NotFoundContent'
import {NOT_FOUND_TITLE} from '@/lib/seoTitle'

/**
 * The root not-found boundary. It exists for the routes that sit OUTSIDE the
 * `(site)` group — today that is `app/review/[slug]`, whose `notFound()` fell
 * through to Next's default 404 and rendered the bare firm name while every
 * `(site)` URL was already correct. Found by rendering, not by reading.
 *
 * `(site)` keeps its own boundary because the closest one wins and site pages
 * should 404 inside the site chrome. See that file for why the title cannot
 * live in the routes.
 */
/**
 * A STATIC metadata export, and it has to be.
 *
 * `generateMetadata` DOES NOT WORK in a not-found boundary. That was tried on
 * 2026-07-26 and the first measurement said it did — wrongly, off a stale
 * `.next` cache that was still serving the previous static build. With the
 * cache cleared the component renders and no `<title>` is emitted at all.
 * Recorded because the false result was written into doctrine before it was
 * caught, and because the failure is silent: no error, no warning, just a page
 * with no title.
 *
 * So this boundary cannot read the dataset, and cannot know the firm name.
 * The firm name reaches it through the root layout's `title.template`, which
 * exists for this and nothing else — see app/layout.tsx.
 */
export const metadata: Metadata = {title: NOT_FOUND_TITLE}

export default function NotFound() {
  return <NotFoundContent />
}
