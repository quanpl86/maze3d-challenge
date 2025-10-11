// src/games/bird/blocks.ts

import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';
import { FieldAngle } from '@blockly/field-angle';
import type { TFunction } from 'i18next'; // Import TFunction

// Sửa hàm init
export function init(t: TFunction) { 
  if (Blockly.Blocks['bird_noWorm']) {
    return;
  }

  Blockly.defineBlocksWithJsonArray([
    {
      "type": "bird_noWorm",
      "message0": t('Bird.noWorm'),
      "output": "Boolean",
      "style": "variable_category",
      "tooltip": t('Bird.noWormTooltip'),
    },
    {
      "type": "bird_heading",
      "message0": `${t('Bird.heading')} %1`,
      "args0": [
        {
          "type": "field_angle",
          "name": "ANGLE",
          "angle": 90,
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "style": "movement_category",
      "tooltip": t('Bird.headingTooltip'),
    },
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
      "style": "variable_category",
      "tooltip": t('Bird.positionTooltip'),
    },
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
      "style": "logic_category",
      "extensions": ["logic_compare_tooltip"],
    },
    {
      "type": "bird_and",
      "message0": "%1 and %2",
      "args0": [
        { "type": "input_value", "name": "A", "check": "Boolean" },
        { "type": "input_value", "name": "B", "check": "Boolean" },
      ],
      "inputsInline": true,
      "output": "Boolean",
      "style": "logic_category",
      "tooltip": "Returns true if both inputs are true.",
    },
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
      "style": "logic_category",
      "tooltip": "If a value is true, then do the first block of statements. Otherwise, do the second block of statements.",
    },
    {
      "type": "math_number",
      "message0": "%1",
      "args0": [{
        "type": "field_number",
        "name": "NUM",
        "value": 0,
      }],
      "output": "Number",
      "style": "math_category",
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