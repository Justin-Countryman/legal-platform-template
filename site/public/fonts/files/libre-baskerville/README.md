# Libre Baskerville

**License:** SIL OFL 1.1  
**Designer:** Impallari Type (Pablo Impallari, Rodrigo Fuenzalida)  
**Google Fonts:** https://fonts.google.com/specimen/Libre+Baskerville

Used in pairings: **5 — Corporate Clarity** (heading), **12 — Traditional Fallback** (heading)

## Files

| File | Weight | Style |
|------|--------|-------|
| LibreBaskerville-Italic.woff2 | 400 | italic |
| LibreBaskerville-Regular.woff2 | variable, `wght` 400 to 700 | normal |

## How this folder is kept

This family is **variable**: its one upright file carries every weight, and a pairing declares it once across the weights it draws (`fonts/presets.ts` `weights`; 400–700 here), so a weight in between draws as itself. Commit a variable family as ONE file named `<Family>-Regular.woff2`, never as copies under weight names: `fonts/__tests__/presets.test.ts` refuses two identical files and a variable role that names a second upright file. An italic, where committed, is a separate static file declared at 400.
