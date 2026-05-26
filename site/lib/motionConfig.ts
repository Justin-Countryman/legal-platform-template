// Named Framer Motion transition configs — import from here instead of inlining values.
// Structural configs (dropdown, drawer, subnav) are FIXED — they do NOT scale with
// the motionTempo design setting. Values align with --motion-structural-* CSS tokens.
// Easing curves: smooth (enter) = cubic-bezier(0.25,0,0,1), balanced (toggle) = cubic-bezier(0.45,0,0.55,1)

type EaseCurve = [number, number, number, number]

const smooth:   EaseCurve = [0.25, 0, 0, 1]
const balanced: EaseCurve = [0.45, 0, 0.55, 1]

export const motionConfig = {
  // Structural — fixed, matches --motion-structural-slow (400ms)
  dropdown:  {duration: 0.4,  ease: smooth},
  // Structural — fixed, matches --motion-structural-slow (400ms)
  drawer:    {duration: 0.4,  ease: smooth},
  // Structural — fixed, matches --motion-structural-base (250ms)
  subnav:    {duration: 0.25, ease: smooth},
  // Structural — fixed micro, chevron rotate (no easing needed at this scale)
  chevron:   {duration: 0.15},
  // UI crossfade on filter/tab switch — fixed at structural-fast (150ms), symmetric
  crossfade: {duration: 0.15, ease: balanced},
}
