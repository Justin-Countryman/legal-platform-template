// Staff Layout — Split Hero (Slate)
// Contained card: photo left + dark info panel right.
// Below: biography full-width.

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage} from '@/lib/sanity/image'
import {MdEmail} from 'react-icons/md'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {INDEX_PAGE_PRESETS} from '@/lib/pageLabel'
import {Button} from '@/components/ui/Button'
import {Chip} from '@/components/ui/Chip'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {buildStaffName, formatStaffAddress, type StaffMember} from '@/components/staff/types'
import type {NapTokens} from '@/lib/tokens'

type Props = {
  member: StaffMember
  napTokens?: NapTokens | null
  cta?: {label: string; href: string}
  isDark?: boolean
}

export function SplitHeroLayout({member, napTokens, cta = {label: 'Contact Us', href: '/contact/'}, isDark = true}: Props) {
  const name = buildStaffName(member)
  const buttonContext = isDark ? 'dark' : 'light'

  return (
    <>
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[
            {label: 'Home', href: '/'},
            {label: INDEX_PAGE_PRESETS.staffIndex, href: '/staff/'},
            {label: name, href: '#'},
          ]} />
        </div>
      </div>

      {/* ── Profile Card ──────────────────────────────────────────────────── */}
      <section aria-labelledby="staff-h1" className="bg-background py-8 px-[5%]">
        <div className="grid grid-cols-1 overflow-hidden lg:grid-cols-[5fr_7fr]">

          {/* Photo */}
          <div className="relative flex items-center justify-center bg-muted min-h-[300px]">
            {hasImage(member.photo) ? (
              <SanityImage
                image={member.photo}
                mode="natural"
                alt={member.photo.alt || name}
                width={400}
                height={500}
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="w-full max-w-[360px] object-contain"
                priority
              />
            ) : (
              <div className="flex h-full min-h-[300px] w-full items-center justify-center bg-muted">
                <span className="text-5xl font-bold text-foreground-muted select-none">
                  {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div
            data-ring-context={isDark ? 'dark' : undefined}
            className={`flex flex-col justify-center ${isDark ? 'bg-brand-dark' : 'bg-hero-tint'} px-10 py-12 lg:px-14`}
          >

            <h1
              id="staff-h1"
              className="font-heading text-3xl font-extrabold uppercase leading-tight tracking-wide text-foreground md:text-4xl lg:text-[2.6rem]"
            >
              {name || 'Staff Member'}
            </h1>

            {member.jobTitle && (
              <p className="mt-2 text-sm font-normal text-foreground">{member.jobTitle}</p>
            )}

            {/* Divider */}
            <hr className="mt-5 border-border" />

            {/* Contact */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {member.email && (
                <Button variant="secondary" context={buttonContext} href={`mailto:${member.email}`}>
                  <MdEmail className="size-4 shrink-0" aria-hidden="true" />
                  Email me
                </Button>
              )}
              {member.phone && (
                <a
                  href={`tel:${member.phone.replace(/\D/g, '')}`}
                  className="rounded-ui transition-colors duration-ui-fast hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                  aria-label={`Call ${member.phone}`}
                >
                  <Chip icon="phone" className="cursor-pointer">{member.phone}</Chip>
                </a>
              )}
              {!member.phone && member.location?.officePhone && (
                <a
                  href={`tel:${member.location.officePhone.replace(/\D/g, '')}`}
                  className="rounded-ui transition-colors duration-ui-fast hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                  aria-label={`Call ${member.location.officePhone}`}
                >
                  <Chip icon="phone" className="cursor-pointer">{member.location.officePhone}</Chip>
                </a>
              )}
            </div>

            {/* Primary CTA */}
            <div className="mt-10">
              <Button context={buttonContext} href={cta.href}>{cta.label}</Button>
            </div>

            {/* Office location */}
            {member.location?.city && (
              <address className="mt-6 not-italic text-xs text-foreground-muted">
                {formatStaffAddress(member.location)}
              </address>
            )}

          </div>
        </div>
      </section>

      {/* ── Biography ─────────────────────────────────────────────────────── */}
      {member.biography && member.biography.length > 0 && (
        <section className="bg-background px-[5%] py-14 md:py-20" aria-label="Biography">
          <div className="max-w-3xl">
            <h2 className="mb-6 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground">
              About {member.firstName}
            </h2>
            <PortableTextRenderer value={member.biography} napTokens={napTokens} />
          </div>
        </section>
      )}
    </>
  )
}
