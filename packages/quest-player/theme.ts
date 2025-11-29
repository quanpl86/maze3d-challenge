// packages/quest-player/src/games/maze/theme.ts

import * as Blockly from 'blockly/core';

export const mazeTheme = Blockly.Theme.defineTheme('maze', {
  base: Blockly.Themes.Classic, // Kế thừa từ theme Classic cho đơn giản
  categoryStyles: {
    // Tên ở đây PHẢI KHỚP với thuộc tính "style" trong blocks.ts
    'events_category': {
      colour: '#FFD700', // Vàng
    },
    'movement_category': {
      colour: '#4C97FF', // Xanh dương
    },
    'actions_category': {
      colour: '#5BC55B', // Xanh lá
    },
    'loops_category': {
      colour: '#FFAB19', // Cam
    },
    'logic_category': {
      colour: '#5B80A5', // Xanh xám
    },
    'variables_category': {
      colour: '#FF8C1A',
    },
    'functions_category': {
      colour: '#995BA5',
    },
  },
  blockStyles: {
    // Bạn có thể định nghĩa màu riêng cho từng khối nếu muốn
    // Ví dụ, làm cho khối "start" nổi bật hơn
    'events_category': {
      colourPrimary: '#FDD835',
      colourSecondary: '#FBC02D',
      colourTertiary: '#F9A825',
    },
  },
  fontStyle: {
    family: 'sans-serif',
    weight: 'bold',
    size: 12,
  },
});