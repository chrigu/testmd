import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { fileURLToPath } from 'node:url';

const local = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [svelte({
    extensions: ['.svelte', '.svx'],
    preprocess: mdsvex({
      extensions: ['.svx'],
      layout: { runbook: local('./src/lib/layouts/runbook.svelte') },
    }),
  })],
  resolve: { alias: { '#lib': local('./src/lib') } },
  build: {
    ssr: 'scripts/entry.ts',
    outDir: '.build',
    ssrEmitAssets: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: { entryFileNames: 'render.js', assetFileNames: '[name][extname]' },
    },
  },
});
