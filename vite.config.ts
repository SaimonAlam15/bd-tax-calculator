import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves the site from /<repo-name>/. Override with BASE_PATH when deploying elsewhere.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  // ExcelJS (~930 kB) is its own chunk, loaded only when someone downloads.
  build: { chunkSizeWarningLimit: 1000 },
  test: {
    globals: true,
  },
})
