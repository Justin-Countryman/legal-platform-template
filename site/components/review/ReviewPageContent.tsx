import Image from 'next/image'
import Link from 'next/link'
import {SiGoogle, SiFacebook, SiYelp} from 'react-icons/si'
import {MdLocationOn, MdPhone, MdOpenInNew, MdGavel, MdBalance} from 'react-icons/md'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {FeedbackModal} from '@/components/review/FeedbackModal'
import type {NapTokens} from '@/lib/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewLink = {
  platform: string
  url: string
  label: string
}

type Logo = {
  src: string
  alt: string
  width: number
  height: number
} | null

type FirmInfo = {
  firmName: string
  address: {
    address1: string
    city: string
    state: string
    zip: string
    officePhone: string
  } | null
} | null

type Props = {
  page: {
    h1: string
    blurb: unknown[] | null
    reviewLinks: ReviewLink[] | null
    feedbackFormEmbed: string | null
  }
  logo: Logo
  firmInfo: FirmInfo
  napTokens: NapTokens | null
}

// ─── Platform icon map ────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  google:   <SiGoogle   className="size-5 shrink-0" aria-hidden="true" />,
  facebook: <SiFacebook className="size-5 shrink-0" aria-hidden="true" />,
  yelp:     <SiYelp     className="size-5 shrink-0" aria-hidden="true" />,
  avvo:     <MdBalance  className="size-5 shrink-0" aria-hidden="true" />,
  justia:   <MdGavel    className="size-5 shrink-0" aria-hidden="true" />,
  other:    <MdOpenInNew className="size-5 shrink-0" aria-hidden="true" />,
}

function getPlatformIcon(platform: string): React.ReactNode {
  return PLATFORM_ICONS[platform] ?? PLATFORM_ICONS.other
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewPageContent({page, logo, firmInfo, napTokens}: Props) {
  const reviewLinks = page.reviewLinks ?? []
  const address = firmInfo?.address

  return (
    <div className="min-h-screen bg-muted" role="main" aria-label="Leave a review">
      <div className="flex min-h-screen flex-col">

        {/* ── Logo header ──────────────────────────────────────────────── */}
        <header className="flex justify-center border-b border-border bg-background px-6 py-5">
          <Link
            href="/"
            aria-label={`${firmInfo?.firmName ?? 'Firm'} — return to homepage`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-ui"
          >
            {logo ? (
              <Image
                src={logo.src}
                alt={logo.alt ?? firmInfo?.firmName ?? 'Firm logo'}
                width={logo.width}
                height={logo.height}
                priority
                className="h-16 w-auto object-contain"
              />
            ) : firmInfo?.firmName ? (
              <span className="font-heading text-2xl font-bold text-foreground">
                {firmInfo.firmName}
              </span>
            ) : null}
          </Link>
        </header>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-6 pb-16 pt-12 text-center">

          {/* H1 */}
          <h1 className="font-heading text-3xl font-bold leading-tight text-foreground md:text-4xl">
            {page.h1}
          </h1>

          {/* Blurb */}
          {page.blurb && (
            <div className="mt-4 text-base leading-relaxed text-foreground-muted [&_p]:mt-3 [&_p:first-child]:mt-0">
              <PortableTextRenderer value={page.blurb} napTokens={napTokens} />
            </div>
          )}

          {/* ── Review buttons ───────────────────────────────────────────── */}
          {reviewLinks.length > 0 && (
            <ul
              className="mt-10 flex w-full flex-col gap-3"
              role="list"
              aria-label="Review platforms"
            >
              {reviewLinks.map((link) => (
                <li key={link.platform + link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-between gap-4 rounded-btn border border-border bg-background px-5 py-4 text-left text-sm font-medium text-foreground shadow-card-rest transition-[box-shadow,border-color] duration-ui-base ease-smooth hover:border-action-text hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-foreground">
                        {getPlatformIcon(link.platform)}
                      </span>
                      {link.label}
                    </span>
                    <span className="flex items-center gap-1.5 text-foreground-muted">
                      <MdOpenInNew className="size-4 shrink-0" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {/* ── Feedback modal ───────────────────────────────────────────── */}
          {page.feedbackFormEmbed && (
            <>
              <div
                className="my-8 flex w-full items-center gap-4"
                aria-hidden="true"
              >
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-widest text-foreground-muted">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="w-full">
                <FeedbackModal feedbackFormEmbed={page.feedbackFormEmbed} />
              </div>
            </>
          )}
        </div>

        {/* ── Trust band ───────────────────────────────────────────────── */}
        {(firmInfo?.firmName || address) && (
          <footer data-ring-context="dark" aria-labelledby="footer-heading" className="mt-auto border-t border-border bg-brand-dark px-6 py-8">
            <h2 id="footer-heading" className="sr-only">Footer</h2>
            <div className="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
              {firmInfo?.firmName && (
                <p className="font-heading text-base font-semibold text-foreground">
                  {firmInfo.firmName}
                </p>
              )}
              {address && (
                <address className="not-italic">
                  <div className="flex flex-col items-center gap-2 text-sm text-foreground-muted">
                    {(address.address1 || address.city) && (
                      <span className="flex items-center gap-1.5">
                        <MdLocationOn className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                        <span>
                          {[
                            address.address1,
                            address.city,
                            address.state && address.zip
                              ? `${address.state} ${address.zip}`
                              : address.state ?? address.zip,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </span>
                    )}
                    {address.officePhone && (
                      <a
                        href={`tel:${address.officePhone.replace(/\D/g, '')}`}
                        className="flex items-center gap-1.5 transition-colors duration-ui-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                        aria-label={`Call us at ${address.officePhone}`}
                      >
                        <MdPhone className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                        <span>{address.officePhone}</span>
                      </a>
                    )}
                  </div>
                </address>
              )}
            </div>
          </footer>
        )}

      </div>
    </div>
  )
}
