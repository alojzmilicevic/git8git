import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

/**
 * Chrome extensions need a `manifest.json`. We keep the *source* manifest at
 * `public/manifest.json`, then let the CRXJS plugin generate the final manifest
 * into `dist/` with correct built file paths.
 *
 * We intentionally set `publicDir: false` so Vite does NOT copy `public/`
 * directly into `dist/` (otherwise we'd end up with the unprocessed manifest).
 */
const manifestPath = fileURLToPath(new URL('./public/manifest.json', import.meta.url))
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

export default defineConfig({
  // Order: Tailwind (CSS) → Svelte → CRXJS (extension manifest/output)
  plugins: [tailwindcss(), svelte(), crx({ manifest })],
  publicDir: false,
  cacheDir: '.vite',
  optimizeDeps: {
    force: true, // Force re-bundling dependencies
  },
  /**
   * In dev, the extension runs on a `chrome-extension://` origin and pulls
   * modules from the Vite dev server. Enable CORS so Chrome can load Vite's
   * runtime modules like `/@vite/env`.
   */
  server: {
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})

