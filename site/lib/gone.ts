/** The 410 page every retired URL gets (`app/api/gone/route.ts`, `lib/retired.ts`). */

export const GONE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>This page has been removed</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #f7f7f5; color: #1f2328; }
  main { max-width: 32rem; padding: 2rem; text-align: center; }
  h1 { font-size: 1.6rem; margin: 0 0 0.75rem; }
  p { margin: 0 0 1.5rem; line-height: 1.5; color: #4b5058; }
  a { color: #1e5aa8; }
</style>
</head>
<body>
<main>
<h1>This page has been removed</h1>
<p>The page you were looking for is no longer on this site.</p>
<p><a href="/">Go to the homepage</a></p>
</main>
</body>
</html>
`

export const GONE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, s-maxage=86400',
  'X-Robots-Tag': 'noindex',
}
