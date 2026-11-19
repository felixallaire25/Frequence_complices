// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Adresse publique du site (liens canoniques). À changer avec le futur nom de domaine.
  site: 'https://frequence-complices.felixallaire25.workers.dev',
  build: { format: 'directory' },
});
