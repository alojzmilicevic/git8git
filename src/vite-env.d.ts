/// <reference types="vite/client" />

// Allow TypeScript to import `.svelte` files.
declare module '*.svelte' {
  import type { Component } from 'svelte'
  const component: Component
  export default component
}

