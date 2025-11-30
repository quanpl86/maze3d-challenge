import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tsconfigPaths from 'vite-tsconfig-paths';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, '../../packages/quest-player/public/assets'),
          dest: '.'
        }
      ]
    }),
    react(),
  ],

  publicDir: './public',

  server: {
    fs: {
      allow: [path.resolve(__dirname, '../../')],
    },
  },

  resolve: {
    alias: {
      '@repo/quest-player': path.resolve(__dirname, '../../packages/quest-player/src')
    }
  }
});