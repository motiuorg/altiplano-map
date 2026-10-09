import { defineConfig } from 'astro/config';

// GitHub Pages project page: https://motiuorg.github.io/altiplano-map/
const SITE_URL = 'https://motiuorg.github.io';
const BASE = '/altiplano-map';

export default defineConfig({
  site: SITE_URL,
  base: BASE,
  outDir: './dist',
  srcDir: './src',
  // @motiu/design ships raw .astro/.css source: compile it with this project.
  vite: {
    ssr: { noExternal: ['@motiu/design'] },
    server: { fs: { allow: ['..'] } },
  },
});