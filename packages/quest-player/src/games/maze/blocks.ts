// src/games/maze/blocks.ts

import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';
import i18n from '../../i18n';

export function init() {
  Blockly.Msg['CONTROLS_REPEAT_TITLE'] = i18n.t('Controls.repeatTitle', 'repeat %1 times');
  Blockly.Msg['CONTROLS_REPEAT_INPUT_DO'] = i18n.t('Controls.repeatInputDo', 'do');
  Blockly.Msg['DUPLICATE_BLOCK'] = i18n.t('DUPLICATE_BLOCK', 'Duplicate Block');
  Blockly.Msg['REMOVE_COMMENT'] = i18n.t('REMOVE_COMMENT', 'Remove Comment');
  Blockly.Msg['ADD_COMMENT'] = i18n.t('ADD_COMMENT', 'Add Comment');
  Blockly.Msg['EXTERNAL_INPUTS'] = i18n.t('EXTERNAL_INPUTS', 'External Inputs');
  Blockly.Msg['INLINE_INPUTS'] = i18n.t('INLINE_INPUTS', 'Inline Inputs');
  Blockly.Msg['DELETE_BLOCK'] = i18n.t('DELETE_BLOCK', 'Delete Block');
  Blockly.Msg['DELETE_X_BLOCKS'] = i18n.t('DELETE_X_BLOCKS', 'Delete %1 Blocks');
  Blockly.Msg['HELP'] = i18n.t('Games.help', 'Help');

  const MOVEMENT_COLOUR = '#CF63CF';
  const LOOPS_COLOUR = '#5BA55B';
  const LOGIC_COLOUR = '#5B80A5';
  const ACTION_COLOUR = '#A5745B';
  const EVENTS_COLOUR = '#FFBF00'; // Màu mới cho các khối sự kiện

  const LEFT_TURN = ' ↺';
  const RIGHT_TURN = ' ↻';

  const TURN_DIRECTIONS: [string, string][] = [
    [i18n.t('Maze.turnLeft'), 'turnLeft'],
    [i18n.t('Maze.turnRight'), 'turnRight'],
  ];

  const PATH_DIRECTIONS: [string, string][] = [
    [i18n.t('Maze.pathAhead'), 'path ahead'],
    [i18n.t('Maze.pathLeft'), 'path to the left'],
    [i18n.t('Maze.pathRight'), 'path to the right'],
  ];

  const ITEM_TYPES: [string, string][] = [
    ['any item', 'any'],
    ['crystal', 'crystal'],
    ['key', 'key'],
  ];

  Blockly.Extensions.register('maze_turn_arrows', function(this: Blockly.Block) {
      const dropdown = this.getField('DIR');
      if (!dropdown || typeof (dropdown as any).getOptions !== 'function') return;
      const options = (dropdown as any).getOptions(false);
      if (options[0]) options[0][0] = `${i18n.t('Maze.turnLeft')}${LEFT_TURN}`;
      if (options[1]) options[1][0] = `${i18n.t('Maze.turnRight')}${RIGHT_TURN}`;
  });

  const helpClickHandler = () => {
    const helpButton = document.querySelector('.help-button');
    if (helpButton instanceof HTMLElement) {
      helpButton.click();
    }
  };

  Blockly.defineBlocksWithJsonArray([
    // --- NEW EVENT BLOCK ---
    {
      "type": "maze_start",
      "message0": "when Run clicked %1 %2",
      "args0": [
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "DO" }
      ],
      "colour": EVENTS_COLOUR,
      "tooltip": "This block is the starting point for your program.",
      "helpUrl": helpClickHandler,

    },
    // --- Movement & Action Blocks (Unchanged) ---
    {
      "type": "maze_moveForward",
      "message0": i18n.t('Maze.moveForward'),
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_COLOUR,
      "tooltip": i18n.t('Maze.moveForwardTooltip'),
      "helpUrl": helpClickHandler,
    },
    {
      "type": "maze_jump",
      "message0": "jump",
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_COLOUR,
      "tooltip": "Jumps forward and up one block.",
      "helpUrl": helpClickHandler,
    },
    {
      "type": "maze_turn",
      "message0": "%1",
      "args0": [{ "type": "field_dropdown", "name": "DIR", "options": TURN_DIRECTIONS, }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_COLOUR,
      "tooltip": i18n.t('Maze.turnTooltip'),
      "extensions": ["maze_turn_arrows"],
      "helpUrl": helpClickHandler,
    },
    {
      "type": "maze_collect",
      "message0": "collect item",
      "previousStatement": null,
      "nextStatement": null,
      "colour": ACTION_COLOUR,
      "tooltip": "Collects the item at the current location.",
      "helpUrl": helpClickHandler,
    },
    {
      "type": "maze_toggle_switch",
      "message0": "toggle switch",
      "previousStatement": null,
      "nextStatement": null,
      "colour": ACTION_COLOUR,
      "tooltip": "Toggles the switch at the current location.",
      "helpUrl": helpClickHandler,
    },
    // --- Loop Blocks ---
    {
      "type": "maze_forever",
      "message0": `${i18n.t('Maze.repeatUntil')} %1 %2 ${i18n.t('Maze.doCode')} %3`,
      "args0": [
        { "type": "field_image", "src": "/assets/maze/marker.png", "width": 12, "height": 16, "alt": "*" },
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "DO" }
      ],
      "previousStatement": null,
      "colour": LOOPS_COLOUR,
      "tooltip": i18n.t('Maze.whileTooltip'),
      "helpUrl": helpClickHandler,
    },
    {
      "type": "maze_repeat",
      "message0": `${i18n.t('Controls.repeatTitle')} %1 ${i18n.t('Controls.repeatInputDo')}`,
      "args0": [{ "type": "input_value", "name": "TIMES", "check": "Number" }],
      "message1": "%1",
      "args1": [{ "type": "input_statement", "name": "DO" }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": LOOPS_COLOUR,
      "tooltip": "Thực hiện các lệnh bên trong một số lần nhất định.",
      "helpUrl": helpClickHandler,
    },
    // --- NEW SENSING BLOCKS (BOOLEAN OUTPUT) ---
    {
      "type": "maze_is_path",
      "message0": "%1",
      "args0": [
        { "type": "field_dropdown", "name": "DIR", "options": PATH_DIRECTIONS }
      ],
      "output": "Boolean",
      "colour": LOGIC_COLOUR,
      "tooltip": "Returns true if there is a path in the specified direction.",
      "helpUrl": helpClickHandler,
    },
    {
      "type": "maze_is_item_present",
      "message0": "%1 at current location",
      "args0": [
        { "type": "field_dropdown", "name": "TYPE", "options": ITEM_TYPES }
      ],
      "output": "Boolean",
      "colour": LOGIC_COLOUR,
      "tooltip": "Returns true if an item of the specified type is at the current location.",
      "helpUrl": helpClickHandler,
    },
    {
      "type": "maze_is_switch_state",
      "message0": "switch at current location is %1",
      "args0": [
        { "type": "field_dropdown", "name": "STATE", "options": [["on", "on"], ["off", "off"]] }
      ],
      "output": "Boolean",
      "colour": LOGIC_COLOUR,
      "tooltip": "Returns true if a switch at the current location is in the specified state.",
      "helpUrl": helpClickHandler,
    },
    {
      "type": "maze_at_finish",
      "message0": "at finish location",
      "output": "Boolean",
      "colour": LOGIC_COLOUR,
      "tooltip": "Returns true if the player is at the finish location.",
      "helpUrl": helpClickHandler,
    },
    // --- Value Blocks (Unchanged) ---
    {
      "type": "maze_item_count",
      "message0": "count of %1",
      "args0": [
        { "type": "field_dropdown", "name": "TYPE", "options": ITEM_TYPES }
      ],
      "output": "Number",
      "colour": ACTION_COLOUR,
      "tooltip": "Returns the number of collected items of the specified type.",
      "helpUrl": helpClickHandler,
    },
  ]);

  // --- NEW JAVASCRIPT GENERATOR FOR START BLOCK ---
  javascriptGenerator.forBlock['maze_start'] = function(block: Blockly.Block) {
    return javascriptGenerator.statementToCode(block, 'DO');
  };

  // --- Unchanged Generators ---
  javascriptGenerator.forBlock['maze_moveForward'] = function(block: Blockly.Block) {
    return `moveForward('block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['maze_jump'] = function(block: Blockly.Block) {
    return `jump('block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['maze_turn'] = function(block: Blockly.Block) {
    const dir = block.getFieldValue('DIR');
    return `${dir}('block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['maze_repeat'] = function(block: Blockly.Block) {
    const repeats = javascriptGenerator.valueToCode(block, 'TIMES', Order.ASSIGNMENT) || '0';
    let branch = javascriptGenerator.statementToCode(block, 'DO');
    if ((javascriptGenerator as any).INFINITE_LOOP_TRAP) {
      branch = (javascriptGenerator as any).INFINITE_LOOP_TRAP.replace(/%1/g, `'block_id_${block.id}'`) + branch;
    }
    const loopVar = javascriptGenerator.nameDB_?.getDistinctName('count', 'variable') || 'count';
    const code = `for (let ${loopVar} = 0; ${loopVar} < ${repeats}; ${loopVar}++) {\n${branch}}\n`;
    return code;
  };
  javascriptGenerator.forBlock['maze_collect'] = function(block: Blockly.Block) {
    return `collectItem('block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['maze_toggle_switch'] = function(block: Blockly.Block) {
    return `toggleSwitch('block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['maze_item_count'] = function(block: Blockly.Block) {
    const type = block.getFieldValue('TYPE');
    const code = `getItemCount('${type}', 'block_id_${block.id}')`;
    return [code, Order.FUNCTION_CALL];
  };

  // --- RESTORED JAVASCRIPT GENERATOR ---
  javascriptGenerator.forBlock['maze_forever'] = function(block: Blockly.Block) {
    let branch = javascriptGenerator.statementToCode(block, 'DO');
    if ((javascriptGenerator as any).INFINITE_LOOP_TRAP) {
      branch = (javascriptGenerator as any).INFINITE_LOOP_TRAP.replace(/%1/g,
          `'block_id_${block.id}'`) + branch;
    }
    return `while (notDone('block_id_${block.id}')) {\n${branch}}\n`;
  };

  // --- NEW JAVASCRIPT GENERATORS FOR SENSING BLOCKS ---
  type PathDirectionKey = 'path ahead' | 'path to the left' | 'path to the right';
  javascriptGenerator.forBlock['maze_is_path'] = function(block: Blockly.Block) {
    const dir = block.getFieldValue('DIR') as PathDirectionKey;
    const apiCall = {
      'path ahead': 'isPathForward',
      'path to the left': 'isPathLeft',
      'path to the right': 'isPathRight',
    }[dir];
    const code = `${apiCall}('block_id_${block.id}')`;
    return [code, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['maze_is_item_present'] = function(block: Blockly.Block) {
    const type = block.getFieldValue('TYPE');
    const code = `isItemPresent('${type}', 'block_id_${block.id}')`;
    return [code, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['maze_is_switch_state'] = function(block: Blockly.Block) {
    const state = block.getFieldValue('STATE');
    const code = `isSwitchState('${state}', 'block_id_${block.id}')`;
    return [code, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['maze_at_finish'] = function(block: Blockly.Block) {
    const code = `!notDone('block_id_${block.id}')`;
    return [code, Order.LOGICAL_NOT];
  };
}