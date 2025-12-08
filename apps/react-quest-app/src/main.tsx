// apps/react-quest-app/src/main.tsx

import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import file i18n trung tâm của app.
// Thao tác này sẽ khởi tạo i18next với các tài nguyên đã được hợp nhất.
import './i18n.ts';

// Import CSS của thư viện (nếu chưa chuyển sang CSS Modules)
import '@repo/quest-player/index.css';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);