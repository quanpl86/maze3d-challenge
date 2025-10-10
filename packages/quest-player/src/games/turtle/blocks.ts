// src/games/turtle/blocks.ts

import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';
import i18n from '../../i18n';

export function init() {
  // SỬA ĐỔI: Sử dụng mã màu HEX
  const TURTLE_COLOUR = '#5B995B'; // Tương đương HUE 160
  
  const LEFT_TURN = ' ↺';
  const RIGHT_TURN = ' ↻';

  const MOVE_OPTIONS: [string, string][] = [
    [i18n.t('Turtle.moveForward'), 'moveForward'],
    [i18n.t('Turtle.moveBackward'), 'moveBackward'],
  ];

  const TURN_OPTIONS: [string, string][] = [
    [i18n.t('Turtle.turnRight'), 'turnRight'],
    [i18n.t('Turtle.turnLeft'), 'turnLeft'],
  ];

  Blockly.Extensions.register('turtle_turn_arrows', function(this: Blockly.Block) {
    const dropdown = this.getField('DIR');
    if (!dropdown || typeof (dropdown as any).getOptions !== 'function') return;
    const options = (dropdown as any).getOptions(false);
    if (options[0]) options[0][0] = `${i18n.t('Turtle.turnRight')}${RIGHT_TURN}`;
    if (options[1]) options[1][0] = `${i18n.t('Turtle.turnLeft')}${LEFT_TURN}`;
  });

  Blockly.defineBlocksWithJsonArray([
    {
      "type": "turtle_move",
      "message0": "%1 %2",
      "args0": [
        { "type": "field_dropdown", "name": "DIR", "options": MOVE_OPTIONS },
        { "type": "input_value", "name": "VALUE", "check": "Number" },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": TURTLE_COLOUR,
      "tooltip": i18n.t('Turtle.moveTooltip'),
    },
    {
      "type": "turtle_move_internal",
      "message0": "%1 %2",
      "args0": [
        { "type": "field_dropdown", "name": "DIR", "options": MOVE_OPTIONS },
        { "type": "field_dropdown", "name": "VALUE", "options": [['20', '20'], ['50', '50'], ['100', '100'], ['150', '150']] },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": TURTLE_COLOUR,
      "tooltip": i18n.t('Turtle.moveTooltip'),
    },
    {
      "type": "turtle_turn",
      "message0": "%1 %2",
      "args0": [
        { "type": "field_dropdown", "name": "DIR", "options": TURN_OPTIONS },
        { "type": "input_value", "name": "VALUE", "check": "Number" },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": TURTLE_COLOUR,
      "tooltip": i18n.t('Turtle.turnTooltip'),
      "extensions": ["turtle_turn_arrows"],
    },
    {
      "type": "turtle_turn_internal",
      "message0": "%1 %2",
      "args0": [
        { "type": "field_dropdown", "name": "DIR", "options": TURN_OPTIONS },
        { "type": "field_dropdown", "name": "VALUE", "options": [['1°', '1'], ['45°', '45'], ['72°', '72'], ['90°', '90'], ['120°', '120'], ['144°', '144']] },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": TURTLE_COLOUR,
      "tooltip": i18n.t('Turtle.turnTooltip'),
      "extensions": ["turtle_turn_arrows"],
    },
    {
      "type": "turtle_width",
      "message0": i18n.t('Turtle.setWidth') + " %1",
      "args0": [{ "type": "input_value", "name": "WIDTH", "check": "Number" }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": TURTLE_COLOUR,
      "tooltip": i18n.t('Turtle.widthTooltip'),
    },
    {
      "type": "turtle_pen",
      "message0": "%1",
      "args0": [{
        "type": "field_dropdown", "name": "PEN",
        "options": [[i18n.t('Turtle.penUp'), "penUp"], [i18n.t('Turtle.penDown'), "penDown"]]
      }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": TURTLE_COLOUR,
      "tooltip": i18n.t('Turtle.penTooltip'),
    },
    {
      "type": "turtle_colour",
      "message0": i18n.t('Turtle.setColour') + " %1",
      "args0": [{ "type": "input_value", "name": "COLOUR", "check": "Colour" }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": "%{BKY_COLOUR_HUE}", // Khối màu sắc vẫn dùng HUE chuẩn của Blockly
      "tooltip": i18n.t('Turtle.colourTooltip'),
    },
    {
      "type": "turtle_colour_internal",
      "message0": i18n.t('Turtle.setColour') + " %1",
      "args0": [{ "type": "field_colour", "name": "COLOUR", "colour": "#ff0000" }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": "%{BKY_COLOUR_HUE}",
      "tooltip": i18n.t('Turtle.colourTooltip'),
    },
    {
      "type": "turtle_visibility",
      "message0": "%1",
      "args0": [{
        "type": "field_dropdown", "name": "VISIBILITY",
        "options": [[i18n.t('Turtle.hideTurtle'), "hideTurtle"], [i18n.t('Turtle.showTurtle'), "showTurtle"]]
      }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": TURTLE_COLOUR,
      "tooltip": i18n.t('Turtle.turtleVisibilityTooltip'),
    },
    {
      "type": "turtle_print",
      "message0": i18n.t('Turtle.print') + " %1",
      "args0": [{ "type": "input_value", "name": "TEXT" }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": TURTLE_COLOUR,
      "tooltip": i18n.t('Turtle.printTooltip'),
    },
    {
      "type": "turtle_font",
      "message0": `${i18n.t('Turtle.font')}%1%2${i18n.t('Turtle.fontSize')}%3%4%5`,
      "args0": [
        { "type": "field_dropdown", "name": "FONT", "options": [['Arial', 'Arial'], ['Courier New', 'Courier New'], ['Georgia', 'Georgia'], ['Impact', 'Impact'], ['Times New Roman', 'Times New Roman'], ['Trebuchet MS', 'Trebuchet MS'], ['Verdana', 'Verdana']]},
        { "type": "input_dummy" },
        { "type": "field_number", "name": "FONTSIZE", "value": 18, "min": 1, "max": 1000 },
        { "type": "input_dummy" },
        { "type": "field_dropdown", "name": "FONTSTYLE", "options": [[i18n.t('Turtle.fontNormal'), 'normal'], [i18n.t('Turtle.fontItalic'), 'italic'], [i18n.t('Turtle.fontBold'), 'bold']]},
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": TURTLE_COLOUR,
      "tooltip": i18n.t('Turtle.fontTooltip'),
    },
    {
      "type": "turtle_repeat_internal",
      "message0": `${i18n.t('Controls.repeatTitle')} %1 ${i18n.t('Controls.repeatInputDo')} %2`,  
      "args0": [
        { "type": "field_dropdown", "name": "TIMES", "options": [["3", "3"], ["4", "4"], ["5", "5"], ["360", "360"]] },
        { "type": "input_statement", "name": "DO" },  
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": "%{BKY_LOOPS_HUE}",
      "tooltip": i18n.t('Controls.repeatTooltip'),  
      "helpUrl": i18n.t('Controls.repeatHelpUrl')  
    },
  ]);

  javascriptGenerator.forBlock['turtle_move'] = function(block: Blockly.Block) {
    const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.NONE) || '0';
    return `${block.getFieldValue('DIR')}(${value}, 'block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_move_internal'] = function(block: Blockly.Block) {
    const value = Number(block.getFieldValue('VALUE'));
    return `${block.getFieldValue('DIR')}(${value}, 'block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_turn'] = function(block: Blockly.Block) {
    const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.NONE) || '0';
    return `${block.getFieldValue('DIR')}(${value}, 'block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_turn_internal'] = function(block: Blockly.Block) {
    const value = Number(block.getFieldValue('VALUE'));
    return `${block.getFieldValue('DIR')}(${value}, 'block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_width'] = function(block: Blockly.Block) {
    const width = javascriptGenerator.valueToCode(block, 'WIDTH', Order.NONE) || '1';
    return `penWidth(${width}, 'block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_pen'] = function(block: Blockly.Block) {
    return `${block.getFieldValue('PEN')}('block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_colour'] = function(block: Blockly.Block) {
    const colour = javascriptGenerator.valueToCode(block, 'COLOUR', Order.NONE) || '\'#000000\'';
    return `penColour(${colour}, 'block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_colour_internal'] = function(block: Blockly.Block) {
    const colour = javascriptGenerator.quote_(block.getFieldValue('COLOUR'));
    return `penColour(${colour}, 'block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_visibility'] = function(block: Blockly.Block) {
    return `${block.getFieldValue('VISIBILITY')}('block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_print'] = function(block: Blockly.Block) {
    const text = String(javascriptGenerator.valueToCode(block, 'TEXT', Order.NONE) || '\'\'');
    return `print(${text}, 'block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_font'] = function(block: Blockly.Block) {
    const font = javascriptGenerator.quote_(block.getFieldValue('FONT'));
    const fontSize = Number(block.getFieldValue('FONTSIZE'));
    const fontStyle = javascriptGenerator.quote_(block.getFieldValue('FONTSTYLE'));
    return `font(${font}, ${fontSize}, ${fontStyle}, 'block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['turtle_repeat_internal'] = (javascriptGenerator as any)['forBlock']['controls_repeat'];
}