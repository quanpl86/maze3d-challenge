import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';
import sirv from 'sirv';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths(), // Plugin để đọc 'paths' từ tsconfig.json
    {
      name: 'serve-quest-player-assets-for-builder-dev',
      configureServer(server) {
        const assetsDir = path.resolve(__dirname, '../../packages/quest-player/public/assets');
        server.middlewares.use('/assets', sirv(assetsDir, { dev: true, etag: true, single: false }));
      },
    },
    viteStaticCopy({
      targets: [
        { src: path.resolve(__dirname, '../../packages/quest-player/public/assets'), dest: '.' }
      ]
    })
  ],
});