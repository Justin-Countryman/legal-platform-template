// Per-route `revalidate` controls cache TTL (3600s baseline; tag-based
// instant revalidation lands in Batch 6 alongside the Sanity webhook).
// Layout itself has no revalidate export — Next inherits the route's.

import {client} from '@/lib/sanity/client'
import {HEADER_QUERY, FOOTER_QUERY, DESIGN_TOKENS_QUERY} from '@/lib/sanity/queries'
import {resolveTokenString, formatPhone} from '@/lib/tokens'
import {buildDesignTokenCSS, buildColorCSS, buildFontCSS, resolveSidebarDesignSettings} from '@/lib/designTokens'
import {HeroSchemeProvider} from '@/lib/heroSchemeContext'
import {SidebarDesignSettingsProvider} from '@/lib/sidebarDesignSettingsContext'
import {OfficeHoursProvider} from '@/components/location/OfficeHoursContext'
import {resolvefonts, buildFontPreloads} from '@/fonts/loader'
import {Header, type NavItem, type NavChild} from '@/components/layout/Header'
import {Footer} from '@/components/layout/Footer'
import {BackToTop} from '@/components/ui/BackToTop'
import {MotionRoot} from '@/components/ui/MotionRoot'

// ─── Practice area ordering ────────────────────────────────────────────────────
// GROQ returns a flat ordered array of {_id, label, href, parentRef?} for
// navItemPracticeAreas so we can preserve the practiceAreaOrder sequence.
// This function groups them back into the {label, href, children?} shape the
// Header component expects, honouring both parent and child order.

type FlatPracticeAreaItem = {
  _id: string
  label: string
  href: string
  parentRef?: string | null
}

function groupPracticeAreaNav(flat: FlatPracticeAreaItem[]): NavChild[] {
  const parents = flat.filter((i) => !i.parentRef)
  return parents.map((parent) => ({
    label: parent.label,
    href: parent.href,
    children: flat
      .filter((i) => i.parentRef === parent._id)
      .map((c) => ({label: c.label, href: c.href})),
  }))
}

function buildNavItems(rawItems: unknown[]): NavItem[] {
  if (!Array.isArray(rawItems)) return []
  return rawItems.map((item: unknown) => {
    const i = item as Record<string, unknown>
    // Belt-and-suspenders null filter on nav children — paired with GROQ
    // post-projection [defined(_id)] on attorneyOrder/practiceAreaOrder
    // (see queries.ts HEADER_QUERY navItemAttorneys/navItemPracticeAreas).
    if (Array.isArray(i.children)) {
      i.children = i.children.filter((c: unknown) => c !== null)
    }
    if (i._type === 'navItemPracticeAreas' && Array.isArray(i.children)) {
      return {
        ...i,
        children: groupPracticeAreaNav(i.children as FlatPracticeAreaItem[]),
      } as NavItem
    }
    return i as NavItem
  })
}

// ──────────────────────────────────────────────────────────────────────────────

export default async function SiteLayout({children}: {children: React.ReactNode}) {
  const [headerData, footerData, designTokens] = await Promise.all([
    client.fetch(HEADER_QUERY),
    client.fetch(FOOTER_QUERY),
    client.fetch(DESIGN_TOKENS_QUERY),
  ])

  const tokenCSS = buildDesignTokenCSS(
    designTokens?.uiRadius,
    designTokens?.buttonShape,
    designTokens?.tertiaryStyle,
    designTokens?.elevationStyle,
    designTokens?.motionTempo,
    designTokens?.marketingScale,
    designTokens?.taglineStyle,
  )
  const colorCSS = buildColorCSS({
    colorApproach:  designTokens?.colorApproach,
    primaryColor:   designTokens?.primaryColor,
    actionColor:    designTokens?.actionColor,
    accent1Color:   designTokens?.accent1Color,
    accent2Color:   designTokens?.accent2Color,
  })
  const {heading: resolvedHeading, body: resolvedBody} = resolvefonts(
    designTokens?.fontPairingPreset,
    designTokens?.headingFont,
    designTokens?.bodyFont,
  )
  const fontCSS = buildFontCSS(resolvedHeading, resolvedBody)

  const napTokens = {
    firmName: headerData?.siteSettings?.firmName,
    firmNameShort: headerData?.siteSettings?.firmNameShort,
    primaryPhone: formatPhone(headerData?.siteSettings?.phone) || null,
    primaryTollFree: formatPhone(headerData?.siteSettings?.tollFreePhone) || null,
  }

  // Button hover animation is driven by a data-attribute on a top-level wrapper
  // — animation rules in globals.css scope to `[data-button-animation="<mode>"]
  // [data-button-animatable="true"]`. The attribute lives on a div inside this
  // layout (rather than <html>, which is rendered by the root layout that
  // doesn't fetch designSettings) so the GROQ call isn't duplicated.
  const buttonAnimation = designTokens?.buttonAnimation ?? 'none'

  // Preload regular-weight heading + body fonts so the browser fetches them in
  // parallel with parsing the inline @font-face <style> below. See
  // buildFontPreloads() in fonts/loader.ts for the dedupe and selection rules.
  const fontPreloads = buildFontPreloads(resolvedHeading, resolvedBody)

  return (
    <>
      {fontPreloads.map(({key, href}) => (
        <link
          key={key}
          rel="preload"
          href={href}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      ))}
      <style dangerouslySetInnerHTML={{__html: tokenCSS + colorCSS}} />
      {fontCSS && <style dangerouslySetInnerHTML={{__html: fontCSS}} />}
      <div data-button-animation={buttonAnimation}>
      <MotionRoot>
      <Header
        data={{
          firmName: headerData?.siteSettings?.firmName,
          logoOnLight: headerData?.designSettings?.logoOnLight ?? null,
          logoOnDark: headerData?.designSettings?.logoOnDark ?? null,
          logoMarkOnLight: headerData?.designSettings?.logoMarkOnLight ?? null,
          logoMarkOnDark: headerData?.designSettings?.logoMarkOnDark ?? null,
          phone: formatPhone(headerData?.siteSettings?.phone) || null,
          tollFreePhone: formatPhone(headerData?.siteSettings?.tollFreePhone) || null,
          headerLayout: headerData?.mainNavigation?.headerLayout ?? 'apex',
          mobileLayout: headerData?.mainNavigation?.mobileLayout ?? 'standard',
          heroMerge: headerData?.mainNavigation?.heroMerge ?? false,
          sticky: headerData?.mainNavigation?.sticky ?? true,
          stickyHideSupplementary: headerData?.mainNavigation?.stickyHideSupplementary ?? true,
          compactStyle: headerData?.mainNavigation?.compactStyle ?? 'docked',
          defaultScheme: headerData?.mainNavigation?.defaultScheme ?? 'light',
          scrolledScheme: headerData?.mainNavigation?.scrolledScheme ?? 'light',
          topBarEnabled: headerData?.mainNavigation?.topBarEnabled ?? false,
          topBarPinSide: headerData?.mainNavigation?.topBarPinSide ?? 'none',
          topBarLeft: resolveTokenString(headerData?.mainNavigation?.topBarLeft, napTokens) || null,
          topBarRight: resolveTokenString(headerData?.mainNavigation?.topBarRight, napTokens) || null,
          topBarStyle: headerData?.mainNavigation?.topBarStyle ?? 'primary',
          headerPhone: formatPhone(resolveTokenString(headerData?.mainNavigation?.headerPhone, napTokens)) || null,
          headerPhone2: formatPhone(resolveTokenString(headerData?.mainNavigation?.headerPhone2, napTokens)) || null,
          headerPhoneTagline: headerData?.mainNavigation?.headerPhoneTagline,
          headerCtaLabel: headerData?.mainNavigation?.headerCtaLabel,
          headerCtaUrl: headerData?.mainNavigation?.headerCtaUrl,
          headerCtaLabel2: headerData?.mainNavigation?.headerCtaLabel2,
          headerCtaUrl2: headerData?.mainNavigation?.headerCtaUrl2,
          navItems: buildNavItems(headerData?.mainNavigation?.navItems ?? []),
        }}
      />
      <HeroSchemeProvider scheme={designTokens?.internalHeroBackground === 'light' ? 'light' : 'dark'}>
        <SidebarDesignSettingsProvider value={resolveSidebarDesignSettings(designTokens)}>
          <main id="main-content" tabIndex={-1} className="outline-none">
            <OfficeHoursProvider value={footerData?.siteSettings?.address?.hours ?? null}>
              {children}
            </OfficeHoursProvider>
          </main>
        </SidebarDesignSettingsProvider>
      </HeroSchemeProvider>
      {footerData?.designSettings?.showBackToTop === true && <BackToTop />}
      <Footer
        data={{
          firmName: footerData?.siteSettings?.firmName,
          logo: footerData?.designSettings?.logoOnDark ?? null,
          address: footerData?.siteSettings?.address,
          ctaText: resolveTokenString(footerData?.footerSettings?.ctaText, napTokens) || null,
          ctaUrl: footerData?.footerSettings?.ctaUrl,
          actionButton1Label: resolveTokenString(footerData?.footerSettings?.actionButton1Label, napTokens) || null,
          actionButton1Url: footerData?.footerSettings?.actionButton1Url,
          actionButton2Label: resolveTokenString(footerData?.footerSettings?.actionButton2Label, napTokens) || null,
          actionButton2Url: footerData?.footerSettings?.actionButton2Url,
          column1: footerData?.footerSettings?.column1,
          column2: footerData?.footerSettings?.column2,
          facebookUrl: footerData?.footerSettings?.facebookUrl,
          instagramUrl: footerData?.footerSettings?.instagramUrl,
          twitterUrl: footerData?.footerSettings?.twitterUrl,
          linkedInUrl: footerData?.footerSettings?.linkedInUrl,
          youTubeUrl: footerData?.footerSettings?.youTubeUrl,
          privacyPolicyUrl: footerData?.siteSettings?.privacyPolicyUrl,
          disclaimerUrl: footerData?.siteSettings?.disclaimerUrl,
          cookiesUrl: footerData?.siteSettings?.cookiesUrl,
          footerLayout: footerData?.footerSettings?.footerLayout,
          formEmbed: footerData?.footerSettings?.formEmbed,
          locations: footerData?.locations,
        }}
      />
      </MotionRoot>
      </div>
    </>
  )
}
