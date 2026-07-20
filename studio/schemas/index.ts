// ─── Document Types ───────────────────────────────────────────────────────────
import {siteSettings} from './documents/siteSettings'
import {designSettings} from './documents/designSettings'
import {homePage} from './documents/homePage'
import {generalPage} from './documents/generalPage'
import {practiceArea} from './documents/practiceArea'
import {geoPracticeArea} from './documents/geoPracticeArea'
import {serviceAreaPage} from './documents/serviceAreaPage'
import {serviceAreaIndex} from './documents/serviceAreaIndex'
import {contactPage} from './documents/contactPage'
import {faqPage} from './documents/faqPage'
import {blogIndex} from './documents/blogIndex'
import {blogPost} from './documents/blogPost'
import {blogCategory} from './documents/blogCategory'
import {blogTag} from './documents/blogTag'
import {attorneyPage} from './documents/attorneyPage'
import {attorneyIndex} from './documents/attorneyIndex'
import {staffPage} from './documents/staffPage'
import {staffIndex} from './documents/staffIndex'
import {landingPage} from './documents/landingPage'
import {location} from './documents/location'
import {locationPage} from './documents/locationPage'
import {reviewPage} from './documents/reviewPage'
import {aboutPage} from './documents/aboutPage'
import {eventPage} from './documents/eventPage'
import {eventCategory} from './documents/eventCategory'
import {eventIndex} from './documents/eventIndex'
import {globalCta} from './documents/globalCta'
import {mainNavigation} from './documents/mainNavigation'
import {footerSettings} from './documents/footerSettings'
import {heroSettings} from './documents/heroSettings'
import {siteForm} from './documents/siteForm'
import {redirects} from './documents/redirects'
import {testimonial} from './documents/testimonial'
import {testimonialsPage} from './documents/testimonialsPage'
import {faqItem} from './documents/faqItem'
import {caseResult} from './documents/caseResult'
import {pressItem} from './documents/pressItem'

// ─── Object Types ─────────────────────────────────────────────────────────────
import {blockContent} from './objects/blockContent'
import {contentToken} from './objects/contentToken'
import {officeHours} from './objects/officeHours'
import {ctaButton} from './objects/ctaButton'
import {internalHero} from './objects/internalHero'
import {homeHeroContent} from './objects/homeHeroContent'
import {homeHeroDesign} from './objects/homeHeroDesign'
import {practiceAreaNavItem} from './objects/practiceAreaNavItem'
import {ctaFormSection} from './objects/ctaFormSection'
import {sidebarTableOfContents} from './objects/sidebarComponents'
import {sidebarNav} from './documents/sidebar/sidebarNav'
import {sidebarAttorneyList} from './documents/sidebar/sidebarAttorneyList'
import {sidebarCtaBox} from './documents/sidebar/sidebarCtaBox'
import {sidebarFormEmbed} from './documents/sidebar/sidebarFormEmbed'
import {testimonialsGrid} from './documents/sections/testimonialsGrid'
import {featuredTestimonial} from './documents/sections/featuredTestimonial'
import {ctaSection} from './documents/sections/ctaSection'
import {faqSection} from './documents/sections/faqSection'
import {badgesSection} from './documents/sections/badgesSection'
import {attorneySection} from './documents/sections/attorneySection'
import {reviewsSection} from './documents/sections/reviewsSection'
import {videoSection} from './documents/sections/videoSection'
import {practiceAreaNav} from './documents/sections/practiceAreaNav'
import {video} from './documents/video'
import {videoIndex} from './documents/videoIndex'

export const schemaTypes = [
  // Documents
  siteSettings,
  designSettings,
  homePage,
  generalPage,
  practiceArea,
  geoPracticeArea,
  serviceAreaPage,
  serviceAreaIndex,
  contactPage,
  faqPage,
  blogIndex,
  blogPost,
  blogCategory,
  blogTag,
  attorneyPage,
  attorneyIndex,
  staffPage,
  staffIndex,
  landingPage,
  location,
  locationPage,
  reviewPage,
  aboutPage,
  eventPage,
  eventCategory,
  eventIndex,
  globalCta,
  mainNavigation,
  footerSettings,
  heroSettings,
  siteForm,
  redirects,
  testimonial,
  testimonialsPage,
  faqItem,
  caseResult,
  pressItem,

  // Page Sections (documents)
  testimonialsGrid,
  featuredTestimonial,
  ctaSection,
  faqSection,
  badgesSection,
  attorneySection,
  reviewsSection,
  videoSection,
  practiceAreaNav,

  // Videos
  video,
  videoIndex,

  // Sidebar Components (documents)
  sidebarNav,
  sidebarAttorneyList,
  sidebarCtaBox,
  sidebarFormEmbed,

  // Objects
  blockContent,
  contentToken,
  officeHours,
  ctaButton,
  internalHero,
  homeHeroContent,
  homeHeroDesign,
  practiceAreaNavItem,
  ctaFormSection,
  sidebarTableOfContents,
]
