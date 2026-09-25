# Open Sans

**License:** SIL OFL 1.1  
**Designer:** Steve Matteson  
**Google Fonts:** https://fonts.google.com/specimen/Open+Sans

Used in pairings: **7 — Geometric Precision** (body), **9 — Neutral Professional** (body), **12 — Traditional Fallback** (body), **13 — Heritage Old-Style** (body), **15 — Heritage Voice** (body)

## Files

| File | Weight | Style |
|------|--------|-------|
| OpenSans-Italic.woff2 | 400 | italic |
| OpenSans-Regular.woff2 | variable, `wght` 300 to 800 | normal |

## How this folder is kept

This family is **variable**: its one upright file carries every weight, and a pairing declares it once across the weights it draws (`fonts/presets.ts` `weights`; 400–700 here, the page's own faces), so a weight in between draws as itself. Commit a variable family as ONE file named `<Family>-Regular.woff2`, never as copies under weight names: `fonts/__tests__/presets.test.ts` refuses two identical files and a variable role that names a second upright file. An italic, where committed, is a separate static file declared at 400.
