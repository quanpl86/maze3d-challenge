// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Import Blockly's core English language messages.
import 'blockly/msg/en';
import 'blockly/msg/vi';

// Import the i18next configuration file
// This will initialize i18next before the app renders.
import './i18n.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);