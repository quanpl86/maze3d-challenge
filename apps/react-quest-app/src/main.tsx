// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../../../packages/quest-player/src/App.js';
import './index.css';

// Import Blockly's core English language messages.
import 'blockly/msg/en';
import 'blockly/msg/vi';

// Import the i18next configuration file
// This will initialize i18next before the app renders.
import '../../../packages/quest-player/src/i18n.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);