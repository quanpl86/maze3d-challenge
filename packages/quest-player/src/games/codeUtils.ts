// src/games/codeUtils.ts

/**
 * Strips out generated code serial numbers and comments, then counts the lines.
 * Logic adapted from the original blockly-games lib-code.js.
 * @param code The JavaScript code generated from Blockly.
 * @returns The number of effective lines of code.
 */
export function countLinesOfCode(code: string): number {
    if (!code) {
      return 0;
    }
  
    let strippedCode = code;
  
    // Strip out serial numbers.
    strippedCode = strippedCode.replace(/(,\s*)?'block_id_[^']+'\)/g, ')');
  
    // Strip out inline comments.
    strippedCode = strippedCode.replace(/\/\/[^\n]*/g, '');
  
    // Strip out block comments.
    strippedCode = strippedCode.replace(/\/\*.*\*\//g, '');
  
    // Trailing spaces.
    strippedCode = strippedCode.replace(/[ \t]+\n/g, '\n');
  
    // Blank lines.
    strippedCode = strippedCode.replace(/\n+/g, '\n');
  
    // Trim leading and trailing whitespace.
    strippedCode = strippedCode.trim();
  
    if (strippedCode === '') {
      return 0;
    }
  
    // Count the lines.
    return strippedCode.split('\n').length;
  }