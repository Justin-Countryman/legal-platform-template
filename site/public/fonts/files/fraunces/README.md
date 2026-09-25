# Fraunces

**License:** SIL OFL 1.1  
**Designer:** Undercase Type (Phaedra Charles, Flavia Zimbardi)  
**Google Fonts:** https://fonts.google.com/specimen/Fraunces

Used in pairings: **4 — Editorial Authority** (heading), **11 — Bold Advocate** (heading), **17 — Editorial Statement** (heading and body)

## Files

| File | Weight | Style |
|------|--------|-------|
| Fraunces-Italic.woff2 | 400 | italic |
| Fraunces-Regular.woff2 | variable, `wght` 100 to 900 | normal |

## How this folder is kept

This family is **variable**: its one upright file carries every weight, and a pairing declares it once across the weights it draws (`fonts/presets.ts` `weights`; 400–700, 700 here, the page's own faces), so a weight in between draws as itself. Commit a variable family as ONE file named `<Family>-Regular.woff2`, never as copies under weight names: `fonts/__tests__/presets.test.ts` refuses two identical files and a variable role that names a second upright file. An italic, where committed, is a separate static file declared at 400.
