# @thanh01.pmt/quest-player

A React component library for creating and playing interactive coding quests, inspired by Blockly Games. This package provides a self-contained `<QuestPlayer>` component that handles game logic, rendering, and block-based/text-based code editing.

## Installation

You can install the package using npm, pnpm, or yarn:

```bash
pnpm add @thanh01.pmt/quest-player
```

## Usage

Here's a basic example of how to use the `QuestPlayer` component in a React application. You'll need to provide it with a valid Quest JSON object.

```jsx
import React, { useState, useEffect } from 'react';
import { QuestPlayer } from '@thanh01.pmt/quest-player';
import '@thanh01.pmt/quest-player/dist/index.css'; // Don't forget to import the CSS

function App() {
  const [questData, setQuestData] = useState(null);

  useEffect(() => {
    // In a real application, you would fetch your quest JSON file
    fetch('/path/to/your/quest.json')
      .then(res => res.json())
      .then(data => setQuestData(data));
  }, []);

  const handleQuestComplete = (result) => {
    console.log('Quest Complete!', result);
    if (result.isSuccess) {
      alert('Congratulations! You solved the puzzle.');
    } else {
      alert('Try again!');
    }
  };
  
  const handleSettingsChange = (newSettings) => {
    console.log('Settings changed', newSettings);
  }

  if (!questData) {
    return <div>Loading quest...</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <QuestPlayer
        isStandalone={false}
        questData={questData}
        language="en"
        initialSettings={{}}
        onQuestComplete={handleQuestComplete}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}

export default App;
```

## License

This project is licensed under the Apache-2.0 License.
