import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { crx } from '@crxjs/vite-plugin'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Fail fast when required env vars are missing (e.g. new worktree without .env) */
function validateEnv(mode: string) {
  const envDir = fileURLToPath(new URL('.', import.meta.url))
  const envFile = fileURLToPath(new URL('.env', import.meta.url))

  if (!existsSync(envFile)) {
    console.error(
      `\n❌  Missing .env file!\n` +
      `   Worktrees don't include .env — copy it from the main worktree:\n\n` +
      `     cp <main-worktree>/.env .env\n\n` +
      `   Or copy from the example:\n\n` +
      `     cp .env.example .env\n`
    )
    process.exit(1)
  }

  const env = loadEnv(mode, envDir, 'VITE_')
  const required = ['VITE_GITHUB_CLIENT_ID'] as const

  const missing = required.filter((key) => !env[key]?.trim())
  if (missing.length) {
    console.error(
      `\n❌  Missing required environment variables:\n` +
      missing.map((k) => `   • ${k}`).join('\n') + '\n\n' +
      `   Check your .env file (see .env.example for reference).\n`
    )
    process.exit(1)
  }
}

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

export default defineConfig(({ mode }) => {
  validateEnv(mode)

  return {
  // Order: Tailwind (CSS) → React → CRXJS (extension manifest/output)
  plugins: [tailwindcss(), react(), crx({ manifest })],
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
}})

