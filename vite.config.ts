import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves the site from /<repo-name>/. Override with BASE_PATH when deploying elsewhere.
const base = process.env.BASE_PATH ?? '/'
// Full public URL, needed for the canonical link, link previews and the sitemap. The deploy workflow sets it.
const siteUrl = (process.env.SITE_URL ?? `http://localhost:5173${base}`).replace(/\/?$/, '/')

/** Fills %SITE_URL% in index.html, adds the optional Search Console tag, and writes sitemap.xml. */
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
        ),
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}</loc><lastmod>${today}</lastmod></url>
</urlset>
`,
      })
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), siteMeta()],
  // ExcelJS (~930 kB) is its own chunk, loaded only when someone downloads.
  build: { chunkSizeWarningLimit: 1000 },
  test: {
    globals: true,
  },
})
