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
export const metadata: Metadata = {title: NOT_FOUND_TITLE}

export default function NotFound() {
  return <NotFoundContent />
}
