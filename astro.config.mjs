import { defineConfig } from 'astro/config';

// Served from the custom domain (GitHub Pages + GoDaddy CNAME), so base is "/".
const SITE_URL = 'https://altiplanoestepario.motiu.org';

export default defineConfig({
  site: SITE_URL,
  outDir: './dist',
  srcDir: './src',
  // @motiu/design ships raw .astro/.css source: compile it with this project.
  vite: {
    ssr: { noExternal: ['@motiu/design'] },
    server: { fs: { allow: ['..'] } },
  },
});