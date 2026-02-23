# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**git8git** is a Chrome extension (Manifest V3) that syncs n8n workflows with GitHub. It lets users push, pull, and delete workflows from GitHub directly within the n8n interface.

## Build & Development Commands

```bash
# Install dependencies
yarn install

# Build the extension (outputs to dist/)
yarn build

# Dev build with watch (for extension development)
yarn dev
```

> **Required:** A `.env` file with `VITE_GITHUB_CLIENT_ID` must exist before building. Copy `.env.example` to `.env` and fill in the values. The build will fail with an explicit error if this env var is missing.

To load the extension in Chrome: go to `chrome://extensions`, enable Developer Mode, click "Load unpacked", select the `dist/` folder.

## Architecture

The extension has two runtime contexts that communicate via Chrome message passing:

### Background Service Worker (`src/background/`)
Runs persistently in the extension host. Handles:
- GitHub OAuth token lifecycle (`tokenManager.ts`) — caches tokens, auto-refreshes before expiry, clears on 401/403
- All outbound API requests (`apiHandler.ts`) — content scripts never touch tokens directly
- Message routing (`index.ts`)

### Content Script (`src/content/`)
Injected into every page. Detects if the page is an n8n instance and:
1. Mounts a React app into a **shadow DOM** (isolated from page styles via `shadowPorts.ts`)
2. Renders either `InlineToolbar` (preferred, targets n8n's existing toolbar element) or `Fab` floating button (fallback)
3. Sends messages to the background worker for all API operations

Key files:
- `main.ts` — entry point, shadow DOM setup, mounts React
- `store.ts` — Zustand store; persists to Chrome storage automatically
- `WorkflowButtons.tsx` — Push/Pull/Delete action buttons and their modal flows
- `App.tsx` — root component, decides InlineToolbar vs Fab

### Shared (`src/shared/`)
- `api.ts` — GitHub REST API client (repos, branches, workflow file read/write/delete)
- `n8nApi.ts` — n8n REST API client (fetch/update workflow definitions)
- `messages.ts` — TypeScript types for content↔background IPC
- `config.ts` — reads env vars; `API_BASE` defaults to `http://localhost:5100`

## Key Patterns

**Shadow DOM:** All UI is rendered inside a shadow root to avoid style leakage. React portals for modals use `shadowPorts.ts` to target the shadow root rather than `document.body`. The `useClickOutside` hook is shadow-DOM-aware.

**State:** Zustand store in `store.ts` is the single source of truth. It auto-syncs to `chrome.storage.local` for persistence across page navigations.

**API calls from content scripts:** Content scripts post messages to the background worker (via `chrome.runtime.sendMessage`), which performs the actual fetch with the OAuth token. This keeps tokens out of the content script context.

**Two UI modes:** The extension tries to find n8n's native toolbar element to inject `InlineToolbar`. If not found (page still loading, different n8n version), it falls back to `Fab` (floating action button).
