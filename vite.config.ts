import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { boxVitePlugin } from './src/server/boxVitePlugin';

export default defineConfig(({ command }) => {
  // Determine base path:
  // In development (serve), keep '/' for local server routing
  // In production (build):
  // 1. Explicit BASE_PATH (e.g., '/Life/')
  // 2. GITHUB_REPOSITORY (e.g., 'username/Life' -> '/Life/')
  // 3. Fallback to './' for relative asset loading
  let basePath = '/';
  if (command === 'build') {
    if (process.env.BASE_PATH) {
      let bp = process.env.BASE_PATH.trim();
      if (!bp.startsWith('/')) bp = `/${bp}`;
      if (!bp.endsWith('/')) bp = `${bp}/`;
      basePath = bp;
    } else if (process.env.GITHUB_REPOSITORY) {
      const repo = process.env.GITHUB_REPOSITORY.split('/')[1]?.trim();
      basePath = repo ? `/${repo}/` : './';
    } else {
      basePath = './';
    }
  }

  return {
    base: basePath,
    plugins: [react(), tailwindcss(), boxVitePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
