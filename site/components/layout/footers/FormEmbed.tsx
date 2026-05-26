// Footer-namespaced re-export of the platform <HtmlEmbed> with the
// `footer-form-embed` class baked in for legacy CSS targeting. Existing
// consumers (footers, modals, sidebar, GlobalCta) keep their import path
// while the embed implementation lives in <HtmlEmbed>.

import {HtmlEmbed} from '@/components/ui/HtmlEmbed'

export function FormEmbed({html}: {html: string}) {
  return <HtmlEmbed html={html} className="footer-form-embed" />
}
