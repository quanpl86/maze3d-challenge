import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';
import sirv from 'sirv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths(),
    // Middleware để phục vụ assets từ quest-player trong môi trường dev
    {
      name: 'serve-quest-player-assets-for-builder',
      configureServer(server) {
        const assetsDir = path.resolve(__dirname, '../../packages/quest-player/public/assets');
        server.middlewares.use('/assets', sirv(assetsDir, { dev: true, etag: true, single: false }));
      },
    },
  ],
  server: {
    // Cho phép Vite truy cập các tệp bên ngoài thư mục của nó
    fs: {
      allow: [path.resolve(__dirname, '../../')],
    },
  },
});