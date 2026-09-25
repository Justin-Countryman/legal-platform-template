// The markup a heading fit adds (Phase 17C session 3, `components/ui/HeadingText.tsx`): the two widths
// on the heading element, one span around its words, and the class names that mark a heading column
// that widens (`globals.css`, `heading-grows` and the grids). The markup goldens captured before it compare
// with exactly that removed, so they go on proving that nothing else moved; the span itself is held by
// `HeadingText.test.tsx` and the sections' own tests.
export function withoutHeadingFit(html: string): string {
  return html
    .replace(/ class="(?:heading-grows|heading-grid-5|heading-grid-half|heading-grid-aside|heading-flex-third|heading-flex-banner)"/g, '')
    .replace(/(?<=class=")((?:heading-grows|heading-grid-5|heading-grid-half|heading-grid-aside|heading-flex-third|heading-flex-banner) )+/g, '')
    .replace(/ (?:heading-grows|heading-grid-5|heading-grid-half|heading-grid-aside|heading-flex-third|heading-flex-banner)(?=[ "])/g, '')
    .replace(/ style="--heading-w3: ?[0-9.]+; ?--heading-w4: ?[0-9.]+;?"/g, '')
    .replace(/<span class="heading-fit">([\s\S]*?)<\/span>/g, '$1')
}
