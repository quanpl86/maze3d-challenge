// src/App.tsx

import { QuestPlayer } from './components/QuestPlayer';
import './App.css';

function App() {
  // App is back to being a simple shell.
  // The key logic is removed, so QuestPlayer will not re-mount on language change.
  return (
    <QuestPlayer />
  );
}

export default App;