import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { boxVitePlugin } from './src/server/boxVitePlugin';

const pagesOAuthPathPlugin = () => ({
  name: 'github-pages-oauth-path',
  transform(code: string, id: string) {
    if (!id.endsWith('/src/components/views/BoxCloudView.tsx')) return null;
    return code
      .replaceAll('`${window.location.origin}/box-oauth-callback.html`', '`${window.location.origin}${import.meta.env.BASE_URL}box-oauth-callback.html`')
      .replaceAll('Redirect URI: {window.location.origin}/box-oauth-callback.html', 'Redirect URI: {window.location.origin}{import.meta.env.BASE_URL}box-oauth-callback.html');
  },
});

export default defineConfig(({ command }) => {
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
    plugins: [react(), tailwindcss(), pagesOAuthPathPlugin(), boxVitePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
