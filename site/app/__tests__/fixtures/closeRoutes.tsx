// The 13 interior routes that draw the site's closing call to action, each with the query that answers its own
// document, the field its override lives in, and how to render it. Shared by the tests that drive every route.
import * as Q from '@/lib/sanity/queries'
import TestimonialsPage from '@/app/(site)/testimonials/page'
import VideoLibraryPage from '@/app/(site)/videos/page'
import StaffIndexPage from '@/app/(site)/staff/page'
import AttorneysIndexPage from '@/app/(site)/attorneys/page'
import EventsIndexPage from '@/app/(site)/events/page'
import ServiceAreaIndexPage from '@/app/(site)/service-area/page'
import BlogIndexPage from '@/app/(site)/blog/page'
import BlogPostPage from '@/app/(site)/blog/[slug]/page'
import BlogCategoryPage from '@/app/(site)/blog/category/[slug]/page'
import AttorneyProfilePage from '@/app/(site)/attorneys/[slug]/page'
import StaffProfilePage from '@/app/(site)/staff/[slug]/page'
import EventDetailPage from '@/app/(site)/events/[slug]/page'
import CatchAllPage from '@/app/(site)/[...slug]/page'


export type Route = {
  name: string
  query: string
  /** The page's own document, minus the override. */
  doc: Record<string, unknown>
  /** The field the route reads its override from. */
  key: 'ctaOverride' | 'ctaFormOverride'
  render: () => Promise<React.ReactElement>
}

const slugged = <P,>(slug: P) => ({params: Promise.resolve({slug})})
const hero = {heading: 'A page'}

export const ROUTES: Route[] = [
  {name: 'testimonials', query: Q.TESTIMONIALS_PAGE_QUERY, doc: {_id: 'testimonialsPage', hero}, key: 'ctaOverride', render: () => TestimonialsPage()},
  {name: 'videos', query: Q.VIDEO_INDEX_PAGE_QUERY, doc: {_id: 'videoIndex', hero}, key: 'ctaOverride', render: () => VideoLibraryPage()},
  {name: 'staff', query: Q.STAFF_INDEX_QUERY, doc: {_id: 'staffIndex', hero}, key: 'ctaOverride', render: () => StaffIndexPage()},
  {name: 'attorneys', query: Q.ATTORNEY_INDEX_QUERY, doc: {_id: 'attorneyIndex', hero}, key: 'ctaOverride', render: () => AttorneysIndexPage()},
  {name: 'events', query: Q.EVENT_INDEX_PAGE_QUERY, doc: {_id: 'eventIndex', hero}, key: 'ctaOverride', render: () => EventsIndexPage()},
  {name: 'service-area', query: Q.SERVICE_AREA_INDEX_QUERY, doc: {_id: 'serviceAreaIndex', hero}, key: 'ctaOverride', render: () => ServiceAreaIndexPage()},
  {name: 'blog', query: Q.BLOG_INDEX_PAGE_QUERY, doc: {_id: 'blogIndex', hero}, key: 'ctaOverride', render: () => BlogIndexPage()},
  {
    name: 'blog post',
    query: Q.BLOG_POST_PAGE_QUERY,
    doc: {_id: 'post-1', _type: 'blogPost', title: 'A post', slug: 'blog/a-post', hero},
    key: 'ctaOverride',
    render: () => BlogPostPage(slugged('a-post') as never),
  },
  {
    name: 'blog category',
    query: Q.BLOG_CATEGORY_PAGE_QUERY,
    doc: {_id: 'cat-1', _type: 'blogCategory', title: 'A category', slug: 'blog/category/a-category', hero},
    key: 'ctaOverride',
    render: () => BlogCategoryPage(slugged('a-category') as never),
  },
  {
    name: 'attorney profile',
    query: Q.ATTORNEY_PAGE_QUERY,
    doc: {_id: 'attorney-1', _type: 'attorneyPage', name: 'Jane Example', slug: 'attorneys/jane-example'},
    key: 'ctaFormOverride',
    render: () => AttorneyProfilePage(slugged('jane-example') as never),
  },
  {
    name: 'staff profile',
    query: Q.STAFF_PAGE_QUERY,
    doc: {_id: 'staff-1', _type: 'staffPage', name: 'Sam Example', slug: 'staff/sam-example'},
    key: 'ctaFormOverride',
    render: () => StaffProfilePage(slugged('sam-example') as never),
  },
  {
    name: 'event',
    query: Q.EVENT_PAGE_QUERY,
    doc: {_id: 'event-1', _type: 'eventPage', title: 'An event', slug: 'events/an-event', hero},
    key: 'ctaOverride',
    render: () => EventDetailPage(slugged('an-event') as never),
  },
  {
    name: 'a CMS page (catch-all)',
    query: Q.CATCH_ALL_PAGE_QUERY,
    doc: {_id: 'page-1', _type: 'generalPage', title: 'A page', slug: 'a-page', hero},
    key: 'ctaOverride',
    render: () => CatchAllPage(slugged(['a-page']) as never),
  },
]

