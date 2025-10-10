// src/games/bird/blocks.ts

import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';
import i18n from '../../i18n';
// SỬA LỖI: Quay trở lại "side-effect import". Đây là cách đúng cho định nghĩa JSON.
import '@blockly/field-angle';

export function init() {
  const VARIABLES_HUE = 330;
  const MOVEMENT_HUE = 290;

  Blockly.defineBlocksWithJsonArray([
    // Block for no worm condition
    {
      "type": "bird_noWorm",
      "message0": i18n.t('Bird.noWorm'),
      "output": "Boolean",
      "colour": VARIABLES_HUE,
      "tooltip": i18n.t('Bird.noWormTooltip'),
    },
    // Block for moving bird in a direction
    {
      "type": "bird_heading",
      "message0": `${i18n.t('Bird.heading')} %1`,
      "args0": [
        {
          "type": "field_angle", // Dòng này giờ sẽ hoạt động nhờ import ở trên
          "name": "ANGLE",
          "angle": 90,
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_HUE,
      "tooltip": i18n.t('Bird.headingTooltip'),
    },
    // Block for getting bird's x or y position
    {
      "type": "bird_position",
      "message0": "%1",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "XY",
          "options": [["x", "X"], ["y", "Y"]],
        }
      ],
      "output": "Number",
      "colour": VARIABLES_HUE,
      "tooltip": i18n.t('Bird.positionTooltip'),
    },
    // Block for comparing bird's x or y position with a number
    {
      "type": "bird_compare",
      "message0": `%1 %2 %3`,
      "args0": [
        { "type": "input_value", "name": "A", "check": "Number" },
        { "type": "field_dropdown", "name": "OP", "options": [['<', 'LT'], ['>', 'GT']] },
        { "type": "input_value", "name": "B", "check": "Number" },
      ],
      "inputsInline": true,
      "output": "Boolean",
      "colour": "%{BKY_LOGIC_HUE}",
      "extensions": ["logic_compare_tooltip"],
    },
    // Block for logical operator 'and'
    {
      "type": "bird_and",
      "message0": "%1 and %2",
      "args0": [
        { "type": "input_value", "name": "A", "check": "Boolean" },
        { "type": "input_value", "name": "B", "check": "Boolean" },
      ],
      "inputsInline": true,
      "output": "Boolean",
      "colour": "%{BKY_LOGIC_HUE}",
      "tooltip": "Returns true if both inputs are true.",
    },
    // Block for 'if/else'
    {
      "type": "bird_ifElse",
      "message0": "if %1 then %2 else %3",
      "args0": [
        { "type": "input_value", "name": "CONDITION", "check": "Boolean" },
        { "type": "input_statement", "name": "DO" },
        { "type": "input_statement", "name": "ELSE" },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": "%{BKY_LOGIC_HUE}",
      "tooltip": "If a value is true, then do the first block of statements. Otherwise, do the second block of statements.",
    },
    // Khối math_number cần thiết cho bird_compare
    {
      "type": "math_number",
      "message0": "%1",
      "args0": [{
        "type": "field_number",
        "name": "NUM",
        "value": 0,
      }],
      "output": "Number",
      "colour": "%{BKY_MATH_HUE}",
      "tooltip": "A number.",
    },
  ]);

  javascriptGenerator.forBlock['bird_noWorm'] = function(_block: Blockly.Block) {
    return ['noWorm()', Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['bird_heading'] = function(block: Blockly.Block) {
    const angle = block.getFieldValue('ANGLE');
    return `heading(${angle}, 'block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['bird_position'] = function(block: Blockly.Block) {
    const xy = block.getFieldValue('XY');
    const code = `get${xy}()`;
    return [code, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['bird_compare'] = (javascriptGenerator as any).forBlock['logic_compare'];
  javascriptGenerator.forBlock['bird_and'] = (javascriptGenerator as any).forBlock['logic_operation'];

  javascriptGenerator.forBlock['bird_ifElse'] = function(block: Blockly.Block) {
    const condition = javascriptGenerator.valueToCode(block, 'CONDITION', Order.NONE) || 'false';
    const branchDo = javascriptGenerator.statementToCode(block, 'DO');
    const branchElse = javascriptGenerator.statementToCode(block, 'ELSE');
    return `if (${condition}) {\n${branchDo}} else {\n${branchElse}}\n`;
  };

  javascriptGenerator.forBlock['math_number'] = (javascriptGenerator as any).forBlock['math_number'];
}