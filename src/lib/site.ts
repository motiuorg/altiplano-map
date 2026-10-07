// Small build-time reader for src/data/site.yaml (feature flags for the nav).
import fs from 'node:fs';
import * as yaml from 'js-yaml';

interface SiteConfig {
  prototype_nav?: { paisaje?: boolean };
}

let cache: SiteConfig | null = null;
export function loadSiteConfig(): SiteConfig {
  if (!cache) cache = (yaml.load(fs.readFileSync('./src/data/site.yaml', 'utf8')) as SiteConfig) ?? {};
  return cache;
}
export const showPaisajeNav = () => loadSiteConfig().prototype_nav?.paisaje === true;
