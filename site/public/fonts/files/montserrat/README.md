# Montserrat

**License:** SIL OFL 1.1  
**Designer:** Julieta Ulanovsky  
**Google Fonts:** https://fonts.google.com/specimen/Montserrat

Used in pairings: **5 — Corporate Clarity** (body), **7 — Geometric Precision** (heading)

## Files

| File | Weight | Style |
|------|--------|-------|
| Montserrat-Italic.woff2 | 400 | italic |
| Montserrat-Regular.woff2 | variable, `wght` 100 to 900 | normal |

## How this folder is kept

This family is **variable**: its one upright file carries every weight, and a pairing declares it once across the weights it draws (`fonts/presets.ts` `weights`; 400–700 here), so a weight in between draws as itself. Commit a variable family as ONE file named `<Family>-Regular.woff2`, never as copies under weight names: `fonts/__tests__/presets.test.ts` refuses two identical files and a variable role that names a second upright file. An italic, where committed, is a separate static file declared at 400.
