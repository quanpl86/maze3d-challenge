// apps/react-quest-app/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import the i18next instance from the library.
// This single import will initialize i18next and also load Blockly's language files.
import '@repo/quest-player/i18n';

// Import the library's source CSS file via the package.json "exports" map.
// This works in development without needing a build step.
import '@repo/quest-player/style.css';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);