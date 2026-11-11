import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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

// The Bangla page at bn/ is the built index.html with these tags swapped, so search engines can index it.
// Update the year with the rules each assessment year.
const banglaPage: [RegExp, string][] = [
  [/<html lang="en">/, '<html lang="bn">'],
  [/<title>[^<]*<\/title>/, '<title>আয়কর ক্যালকুলেটর ২০২৬-২৭ | বাংলাদেশ আয়কর হিসাব</title>'],
  [
    /(<meta\s+name="description"\s+content=")[^"]*/,
    '$1বাংলাদেশের ব্যক্তি করদাতাদের জন্য বিনামূল্যের আয়কর ক্যালকুলেটর, করবর্ষ ২০২৬–২৭। বেতন, বাড়িভাড়া, সঞ্চয়পত্র, বিনিয়োগজনিত কর রেয়াত ও দেরিতে রিটার্নের হিসাব, এনবিআরের ২০২৬–২৭ বিধি অনুযায়ী। সাইন-আপ লাগে না; আপনার তথ্য ব্রাউজারের বাইরে যায় না।',
  ],
  [/(<link rel="canonical" href=")[^"]*/, `$1${siteUrl}bn/`],
  [/(<meta property="og:url" content=")[^"]*/, `$1${siteUrl}bn/`],
  [/(<meta property="og:title" content=")[^"]*/, '$1আয়কর ক্যালকুলেটর ২০২৬–২৭'],
  [
    /(<meta\s+property="og:description"\s+content=")[^"]*/,
    '$1করবর্ষ ২০২৬–২৭-এর আয়কর হিসাব করুন বাংলা বা ইংরেজিতে। বিনামূল্যে, সাইন-আপ ছাড়া, আর কোনো তথ্য ব্রাউজারের বাইরে যায় না।',
  ],
  [/<meta property="og:locale" content="en_US" \/>/, '<meta property="og:locale" content="bn_BD" />'],
  [/<meta property="og:locale:alternate" content="bn_BD" \/>/, '<meta property="og:locale:alternate" content="en_US" />'],
]

function toBangla(html: string): string {
  return banglaPage.reduce((out, [pattern, replacement]) => {
    if (!pattern.test(out)) throw new Error(`Bangla page: ${pattern} not found in index.html`)
    return out.replace(pattern, replacement)
  }, html)
}

/** Fills %SITE_URL% in the HTML pages, adds the optional Search Console and AdSense tags (account meta tag and script), and writes sitemap.xml, ads.txt and the Bangla page. */
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
            ? `<meta name="google-adsense-account" content="${adsenseClient}" />
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}" crossorigin="anonymous"></script>`
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
  <url><loc>${siteUrl}bn/</loc><lastmod>${today}</lastmod></url>
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
    // After Vite has written the final index.html, with its hashed script names.
    writeBundle(options, bundle) {
      const index = bundle['index.html']
      if (!options.dir || index?.type !== 'asset') return
      mkdirSync(join(options.dir, 'bn'), { recursive: true })
      writeFileSync(join(options.dir, 'bn', 'index.html'), toBangla(String(index.source)))
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
