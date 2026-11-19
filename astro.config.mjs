// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // À renseigner quand le nom de domaine sera acheté (sert aux liens absolus) :
  // site: 'https://[NOM-DE-DOMAINE]',
  build: { format: 'directory' },
});
