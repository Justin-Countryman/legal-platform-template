'use client'

import {useEffect} from 'react'
import {onCLS, onINP, onLCP, onFCP, onTTFB, type Metric} from 'web-vitals'

// Core Web Vitals reporter — sends CLS/INP/LCP/FCP/TTFB to GA4 as events via
// the global gtag() defined by the GA4 snippet (siteSettings.scriptsRequireConsent).
// Free alternative to Vercel Speed Insights. Renders nothing; no-ops when GA4
// is absent (gtag undefined), so it is safe on sites without analytics.

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params: Record<string, unknown>) => void
  }
}

// Only to Google Analytics: with an advertising tag on the same gtag, an event with no `send_to` would reach Google Ads
// too (monorepo WS-AD-PIXELS-DESIGN-2026-10-15 §6). The cookie banner records the GA4 ids it loaded.

function sendToGa4(metric: Metric) {
  const ga = (window as Window & {__lpGaIds?: string[]}).__lpGaIds
  if (typeof window.gtag !== 'function' || !ga?.length) return
  window.gtag('event', metric.name, {
    send_to: ga,
    // GA4 event values must be integers; CLS is <1 so scale it up.
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_rating: metric.rating,
    metric_delta: metric.delta,
    non_interaction: true,
  })
}

export function WebVitals() {
  useEffect(() => {
    onCLS(sendToGa4)
    onINP(sendToGa4)
    onLCP(sendToGa4)
    onFCP(sendToGa4)
    onTTFB(sendToGa4)
  }, [])

  return null
}
