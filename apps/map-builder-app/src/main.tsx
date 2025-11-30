import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'; // Import để thực thi file cấu hình i18next
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)