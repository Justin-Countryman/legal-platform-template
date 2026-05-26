import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {MotionPreviewClient} from './MotionPreviewClient'

export const metadata: Metadata = {
  title: 'Motion Preview',
  robots: {index: false, follow: false},
}

export default function MotionPreviewPage() {
  // Platform-dev tool — available only in dev. Production builds 404 this route.
  if (process.env.NODE_ENV === 'production') notFound()
  return <MotionPreviewClient />
}
