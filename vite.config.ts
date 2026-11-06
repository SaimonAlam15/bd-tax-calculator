import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves the site from /<repo-name>/. Override with BASE_PATH when deploying elsewhere.
const base = process.env.BASE_PATH ?? '/'
// Full public URL, needed for the canonical link, link previews and the sitemap. The deploy workflow sets it.
const siteUrl = (process.env.SITE_URL ?? `http://localhost:5173${base}`).replace(/\/?$/, '/')

// AdSense publisher ID (ca-pub-…). Without it the site has no ad code and no ads.txt.
const adsenseClient = process.env.VITE_ADSENSE_CLIENT || undefined
if (adsenseClient && !/^ca-pub-\d{10,20}$/.test(adsenseClient)) {
  throw new Error(`VITE_ADSENSE_CLIENT should look like ca-pub-1234567890123456, got "${adsenseClient}"`)
}

/** Fills %SITE_URL% in the HTML pages, adds the optional Search Console and AdSense tags, and writes sitemap.xml and ads.txt. */
function siteMeta(): Plugin {
  const verification = process.env.GOOGLE_SITE_VERIFICATION
  return {
    name: 'site-meta',
    transformIndexHtml: (html) =>
      html
        .replaceAll('%SITE_URL%', siteUrl)
        .replace(
          '<!--site-verification-->',
          verification ? `<meta name="google-site-verification" content="${verification}" />` : '',
        )
        .replace(
          '<!--adsense-->',
          adsenseClient
            ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}" crossorigin="anonymous"></script>`
            : '',
        ),
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}</loc><lastmod>${today}</lastmod></url>
  <url><loc>${siteUrl}privacy.html</loc><lastmod>${today}</lastmod></url>
</urlset>
`,
      })
      if (adsenseClient) {
        // Authorises Google to sell ads on this domain. f08c47fec0942fa0 is Google's fixed certification ID.
        this.emitFile({
          type: 'asset',
          fileName: 'ads.txt',
          source: `google.com, ${adsenseClient.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`,
        })
      }
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), siteMeta()],
  build: {
    // ExcelJS (~930 kB) is its own chunk, loaded only when someone downloads.
    chunkSizeWarningLimit: 1000,
    rolldownOptions: { input: { main: 'index.html', privacy: 'privacy.html' } },
  },
  test: {
    globals: true,
  },
})
