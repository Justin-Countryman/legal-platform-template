import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {DesignStudioClient} from './DesignStudioClient'

export const metadata: Metadata = {
  title: 'Design Studio',
  robots: {index: false, follow: false},
}

export default function DesignStudioPage() {
  // Platform-dev tool — available only in dev. Production builds 404 this route.
  if (process.env.NODE_ENV === 'production') notFound()
  return <DesignStudioClient />
}
