import {Button} from '@/components/ui/Button'
import {Tagline} from '@/components/ui/Tagline'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-[5%] py-24 text-center">
      <Tagline as="p">
        404
      </Tagline>
      <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">Page not found</h1>
      <p className="mb-8 max-w-md text-foreground-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Button href="/">Go to homepage</Button>
    </div>
  )
}
