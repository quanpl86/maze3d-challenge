// apps/react-quest-app/src/main.tsx

import React from 'react'
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom'
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import file i18n trung tâm của app.
// Thao tác này sẽ khởi tạo i18next với các tài nguyên đã được hợp nhất.
import i18n from './i18n';

// Import CSS của thư viện (nếu chưa chuyển sang CSS Modules)
import '@repo/quest-player/index.css';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nextProvider>
  </React.StrictMode>,
);