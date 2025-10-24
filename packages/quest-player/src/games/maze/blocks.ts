// packages/quest-player/src/games/maze/blocks.ts

import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';
import type { TFunction } from 'i18next'; 

export function init(t: TFunction) { 
  // XÓA các định nghĩa cũ trước khi tạo mới
  const blocksToDelete = [
    'maze_start',
    'maze_moveForward',
    'maze_jump',
    'maze_turn',
    'maze_collect',
    'maze_toggle_switch',
    'maze_forever',
    'maze_repeat',
    'maze_is_path',
    'maze_is_item_present',
    'maze_is_switch_state',
    'maze_at_finish',
    'maze_item_count',
  ];

  blocksToDelete.forEach(blockType => {
    if (Blockly.Blocks[blockType]) {
      delete Blockly.Blocks[blockType];
    }
  });

  Blockly.Msg['CONTROLS_REPEAT_TITLE'] = t('Controls.repeatTitle', 'repeat %1 times');
  Blockly.Msg['CONTROLS_REPEAT_INPUT_DO'] = t('Controls.repeatInputDo', 'do');
  Blockly.Msg['DUPLICATE_BLOCK'] = t('DUPLICATE_BLOCK', 'Duplicate Block');
  Blockly.Msg['REMOVE_COMMENT'] = t('REMOVE_COMMENT', 'Remove Comment');
  Blockly.Msg['ADD_COMMENT'] = t('ADD_COMMENT', 'Add Comment');
  Blockly.Msg['EXTERNAL_INPUTS'] = t('EXTERNAL_INPUTS', 'External Inputs');
  Blockly.Msg['INLINE_INPUTS'] = t('INLINE_INPUTS', 'Inline Inputs');
  Blockly.Msg['DELETE_BLOCK'] = t('DELETE_BLOCK', 'Delete Block');
  Blockly.Msg['DELETE_X_BLOCKS'] = t('DELETE_X_BLOCKS', 'Delete %1 Blocks');
  Blockly.Msg['HELP'] = t('Games.help', 'Help');

  const LEFT_TURN = ' ↺';
  const RIGHT_TURN = ' ↻';

  const TURN_DIRECTIONS: [string, string][] = [
    [t('Maze.turnLeft') + LEFT_TURN, 'turnLeft'],
    [t('Maze.turnRight') + RIGHT_TURN, 'turnRight'],
  ];

  const PATH_DIRECTIONS: [string, string][] = [
    [t('Maze.pathAhead'), 'path ahead'],
    [t('Maze.pathLeft'), 'path to the left'],
    [t('Maze.pathRight'), 'path to the right'],
  ];

  const ITEM_TYPES: [string, string][] = [
    [t('Maze.isItemPresent.any'), 'any'],
    [t('Maze.isItemPresent.crystal'), 'crystal'],
    [t('Maze.isItemPresent.key'), 'key'],
  ];

  const SWITCH_STATES: [string, string][] = [
    [t('Maze.isSwitchState.on'), 'on'],
    [t('Maze.isSwitchState.off'), 'off'],
  ];

  // Xóa extension cũ nếu có
  if (Blockly.Extensions.isRegistered('maze_turn_arrows')) {
    Blockly.Extensions.unregister('maze_turn_arrows');
  }

  Blockly.defineBlocksWithJsonArray([
    {
      "type": "maze_start",
      "message0": t('Maze.whenRunClicked') + " %1 %2",
      "args0": [
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "DO" }
      ],
      "style": "events_category",
      "tooltip": "This block is the starting point for your program.",
    },
    {
      "type": "maze_moveForward",
      "message0": t('Maze.moveForward'),
      "previousStatement": null,
      "nextStatement": null,
      "style": "movement_category",
      "tooltip": t('Maze.moveForwardTooltip'),
    },
    {
      "type": "maze_jump",
      "message0": t('Maze.jump'),
      "previousStatement": null,
      "nextStatement": null,
      "style": "movement_category",
      "tooltip": t('Maze.jumpTooltip'),
    },
    {
      "type": "maze_turn",
      "message0": "%1",
      "args0": [{ 
        "type": "field_dropdown", 
        "name": "DIR", 
        "options": TURN_DIRECTIONS,
      }],
      "previousStatement": null,
      "nextStatement": null,
      "style": "movement_category",
      "tooltip": t('Maze.turnTooltip'),
    },
    {
      "type": "maze_collect",
      "message0": t('Maze.collectItem'),
      "previousStatement": null,
      "nextStatement": null,
      "style": "actions_category",
      "tooltip": "Collects the item at the current location.",
    },
    {
      "type": "maze_toggle_switch",
      "message0": t('Maze.toggleSwitch'),
      "previousStatement": null,
      "nextStatement": null,
      "style": "actions_category",
      "tooltip": "Toggles the switch at the current location.",
    },
    {
      "type": "maze_forever",
      "message0": `${t('Maze.repeatUntil')} %1 %2 ${t('Maze.doCode')} %3`,
      "args0": [
        { "type": "field_image", "src": "/assets/maze/marker.png", "width": 12, "height": 16, "alt": "*" },
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "DO" }
      ],
      "previousStatement": null,
      "style": "loops_category",
      "tooltip": t('Maze.whileTooltip'),
    },
    {
      "type": "maze_repeat",
      "message0": `${t('Controls.repeatTitle')} %1 ${t('Controls.repeatInputDo')}`,
      "args0": [{ "type": "input_value", "name": "TIMES", "check": "Number" }],
      "message1": "%1",
      "args1": [{ "type": "input_statement", "name": "DO" }],
      "previousStatement": null,
      "nextStatement": null,
      "style": "loops_category",
      "tooltip": "Thực hiện các lệnh bên trong một số lần nhất định.",
    },
    {
      "type": "maze_is_path",
      "message0": "%1",
      "args0": [
        { "type": "field_dropdown", "name": "DIR", "options": PATH_DIRECTIONS }
      ],
      "output": "Boolean",
      "style": "logic_category",
      "tooltip": "Returns true if there is a path in the specified direction.",
    },
    {
      "type": "maze_is_item_present",
      "message0": t('Maze.atCurrentLocation', { "0": "%1" }),
      "args0": [
        { "type": "field_dropdown", "name": "TYPE", "options": ITEM_TYPES }
      ],
      "output": "Boolean",
      "style": "logic_category",
      "tooltip": "Returns true if an item of the specified type is at the current location.",
    },
    {
      "type": "maze_is_switch_state",
      "message0": t('Maze.switchIs', { "0": "%1" }),
      "args0": [
        { "type": "field_dropdown", "name": "STATE", "options": SWITCH_STATES }
      ],
      "output": "Boolean",
      "style": "logic_category",
      "tooltip": "Returns true if a switch at the current location is in the specified state.",
    },
    {
      "type": "maze_at_finish",
      "message0": t('Maze.atFinish'),
      "output": "Boolean",
      "style": "logic_category",
      "tooltip": "Returns true if the player is at the finish location.",
    },
    {
      "type": "maze_item_count",
      "message0": t('Maze.countOf', { "0": "%1" }),
      "args0": [
        { "type": "field_dropdown", "name": "TYPE", "options": ITEM_TYPES }
      ],
      "output": "Number",
      "style": "actions_category",
      "tooltip": "Returns the number of collected items of the specified type.",
    },
  ]);

  javascriptGenerator.forBlock['maze_start'] = function(block: Blockly.Block) {
    return javascriptGenerator.statementToCode(block, 'DO') || '';
  };

  javascriptGenerator.forBlock['maze_moveForward'] = function(block: Blockly.Block) {
    return `moveForward();\n`;
  };
  javascriptGenerator.forBlock['maze_jump'] = function(block: Blockly.Block) {
    return `jump();\n`;
  };
  javascriptGenerator.forBlock['maze_turn'] = function(block: Blockly.Block) {
    const dir = block.getFieldValue('DIR');
    return `${dir}();\n`;
  };
  javascriptGenerator.forBlock['maze_repeat'] = function(block: Blockly.Block) {
    const repeats = javascriptGenerator.valueToCode(block, 'TIMES', Order.ASSIGNMENT) || '0';
    let branch = javascriptGenerator.statementToCode(block, 'DO');
    const loopVar = javascriptGenerator.nameDB_?.getDistinctName('count', 'variable') || 'count';
    const code = `for (var ${loopVar} = 0; ${loopVar} < ${repeats}; ${loopVar}++) {\n${branch}}\n`;
    return code;
  };
  javascriptGenerator.forBlock['maze_collect'] = function(block: Blockly.Block) {
    return `collectItem();\n`;
  };
  javascriptGenerator.forBlock['maze_toggle_switch'] = function(block: Blockly.Block) {
    return `toggleSwitch();\n`;
  };
  javascriptGenerator.forBlock['maze_item_count'] = function(block: Blockly.Block) {
    const type = block.getFieldValue('TYPE');
    const code = `getItemCount('${type}')`;
    return [code, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['maze_forever'] = function(block: Blockly.Block) {
    let branch = javascriptGenerator.statementToCode(block, 'DO');
    return `while (notDone()) {\n${branch}}\n`;
  };

  type PathDirectionKey = 'path ahead' | 'path to the left' | 'path to the right';
  javascriptGenerator.forBlock['maze_is_path'] = function(block: Blockly.Block) {
    const dir = block.getFieldValue('DIR') as PathDirectionKey;
    const apiCall = {
      'path ahead': 'isPathForward',
      'path to the left': 'isPathLeft',
      'path to the right': 'isPathRight',
    }[dir];
    const code = `${apiCall}()`;
    return [code, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['maze_is_item_present'] = function(block: Blockly.Block) {
    const type = block.getFieldValue('TYPE');
    const code = `isItemPresent('${type}')`;
    return [code, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['maze_is_switch_state'] = function(block: Blockly.Block) {
    const state = block.getFieldValue('STATE');
    const code = `isSwitchState('${state}')`;
    return [code, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['maze_at_finish'] = function(block: Blockly.Block) {
    const code = `!notDone()`;
    return [code, Order.LOGICAL_NOT];
  };
}