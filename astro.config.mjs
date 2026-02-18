import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://alexzander-stone.pages.dev',
  integrations: [react(), mdx(), sitemap()],
  vite: {
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      exclude: ['lightweight-charts'],
    },
  },
});
