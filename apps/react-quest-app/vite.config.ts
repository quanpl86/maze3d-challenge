 // apps/react-quest-app/vite.config.ts

 import { defineConfig } from 'vite'
 import react from '@vitejs/plugin-react'
 import path from 'path' // Cần import path

 export default defineConfig({
   plugins: [react()],
   publicDir: './public',
   
   // Thêm cấu hình server vào đây
   server: {
     proxy: {
       // Khi trình duyệt yêu cầu file từ /assets/...
       '/assets': {
         // Chuyển tiếp yêu cầu đến thư mục public của quest-player
         target: path.resolve(__dirname, '../../packages/quest-player/public'),
         changeOrigin: true,
         // Không cần rewrite vì tên file và cấu trúc vẫn giữ nguyên
         // (yêu cầu '/assets/maze/win.mp3' sẽ tìm file '.../quest-player/public/assets/maze/win.mp3')
       }
     }
   }
 })