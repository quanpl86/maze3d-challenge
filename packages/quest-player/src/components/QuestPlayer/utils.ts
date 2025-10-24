// packages/quest-player/src/components/QuestPlayer/utils.ts

import * as Blockly from 'blockly/core';
import type { TFunction } from 'i18next';
import type { ResultType } from '../../games/maze/types';
import type { ToolboxJSON, ToolboxItem } from '../../types';

export const createBlocklyTheme = (themeName: 'zelos' | 'classic', colorScheme: 'light' | 'dark') => {
  const isDark = colorScheme === 'dark';
  const baseTheme = themeName === 'zelos' ? Blockly.Themes.Zelos : Blockly.Themes.Classic;
  const customTheme = { ...baseTheme };

  const categoryStyleDefinitions = {
    'events_category': { 'colour': '#FFBF00' },
    'movement_category': { 'colour': '#CF63CF' },
    'loops_category': { 'colour': '#5BA55B' },
    'logic_category': { 'colour': '#5B80A5' },
    'actions_category': { 'colour': '#A5745B' },
    'math_category': { 'colour': '%{BKY_MATH_HUE}' },
    'text_category': { 'colour': '%{BKY_TEXTS_HUE}' },
    'list_category': { 'colour': '%{BKY_LISTS_HUE}' },
    'colour_category': { 'colour': '%{BKY_COLOUR_HUE}' },
    'variable_category': { 'colour': '%{BKY_VARIABLES_HUE}' },
    'procedure_category': { 'colour': '%{BKY_PROCEDURES_HUE}' },
    'pond_category': { 'colour': '#CF63CF' },
    'turtle_category': { 'colour': '#5BA55B' },
  };

  const blockStyleDefinitions = Object.entries(categoryStyleDefinitions).reduce((acc, [key, value]) => {
      acc[key] = {
          colourPrimary: value.colour,
          colourSecondary: value.colour,
          colourTertiary: value.colour,
      };
      if (key === 'events_category') {
          // SỬA LỖI: Sử dụng đường dẫn type đầy đủ
          (acc[key] as Blockly.Theme.BlockStyle).hat = 'cap';
      }
      return acc;
  // SỬA LỖI: Sử dụng đường dẫn type đầy đủ
  }, {} as { [key: string]: Partial<Blockly.Theme.BlockStyle> });


  customTheme.blockStyles = {
    ...baseTheme.blockStyles,
    // SỬA LỖI: Sử dụng đường dẫn type đầy đủ
    ...(blockStyleDefinitions as { [key: string]: Blockly.Theme.BlockStyle }),
  };

  customTheme.categoryStyles = {
    ...baseTheme.categoryStyles,
    ...categoryStyleDefinitions,
  };

  if (isDark) {
      customTheme.componentStyles = {
          ...baseTheme.componentStyles,
          'workspaceBackgroundColour': '#1e1e1e',
          'toolboxBackgroundColour': '#252526',
          'toolboxForegroundColour': '#fff',
          'flyoutBackgroundColour': '#252526',
          'flyoutForegroundColour': '#ccc',
          'scrollbarColour': '#797979',
      };
  }
  
  customTheme.startHats = true;
  
  return customTheme;
};

export const getFailureMessage = (t: TFunction, result: ResultType): string => {
    if (!result) {
      return t('Games.dialogReason') + ': ' + t('Games.resultFailure');
    }
    const reasonKey = `Games.result${result.charAt(0).toUpperCase() + result.slice(1)}`;
    const translatedReason = t(reasonKey, { defaultValue: result });
    const reasonLocale = t('Games.dialogReason');
    return `${reasonLocale}: ${translatedReason}`;
};

/**
 * [MỚI & NÂNG CAO] Tính toán số dòng code logic (LLOC) bằng cách chuẩn hóa code trước khi đếm.
 * Đây là phương pháp khách quan và mạnh mẽ nhất, xử lý nhiều trường hợp phức tạp.
 * @param code - Chuỗi mã JavaScript.
 * @returns Tổng số dòng code logic.
 */
export const calculateLogicalLines = (code: string): number => {
    if (!code) {
        return 0;
    }

    // --- Bước 1: Tiền xử lý và chuẩn hóa Code ---

    // 1. Loại bỏ tất cả các loại comments (single-line // và multi-line /* */)
    let cleanedCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    // 2. Chuẩn hóa khoảng trắng:
    //    - Thay thế nhiều khoảng trắng liên tiếp bằng một khoảng trắng.
    //    - Xóa khoảng trắng ở đầu và cuối mỗi dòng.
    //    - Loại bỏ dòng trống.
    cleanedCode = cleanedCode.split('\n')
                             .map(line => line.trim())
                             .filter(line => line.length > 0)
                             .map(line => line.replace(/\s+/g, ' ')) // Gộp nhiều khoảng trắng thành 1
                             .join('\n');

    // 3. Tách các đơn vị logic chính thành các dòng riêng biệt.
    //    Mục tiêu: Đảm bảo mỗi LLOC tiềm năng có cơ hội được đếm.

    // A. Tách các câu lệnh kết thúc bằng dấu chấm phẩy
    //    Chèn một newline trước mỗi dấu chấm phẩy (nếu không phải cuối dòng).
    //    Điều này sẽ xử lý hầu hết các lệnh và khai báo biến đơn.
    cleanedCode = cleanedCode.replace(/;(?![^({]*[)}])(?![^{]*})(?![^;]*\n)/g, ';\n'); // Tách ; trừ khi nó nằm trong () {} hoặc ở cuối dòng.

    // B. Tách các dấu ngoặc nhọn mở `{` và đóng `}` ra dòng riêng (nếu chúng không phải một phần của dòng khai báo)
    //    Điều này là cần thiết để chúng không bị đếm là LLOC, và các lệnh bên trong sẽ được đếm đúng.
    //    Regex này khá phức tạp để tránh ảnh hưởng đến `for (init; cond; update)` hoặc `if (cond)`.
    cleanedCode = cleanedCode.replace(/(?<!\b(for|while|if|else if|function|switch|catch|try|finally|class)\s*)\{/g, '{\n');
    cleanedCode = cleanedCode.replace(/\}(?!\s*(else|catch|finally))/g, '}\n');


    // C. Đảm bảo các từ khóa cấu trúc chính luôn bắt đầu một dòng mới.
    //    Điều này bao gồm for, while, if, else if, else, function, return, switch, case, default, try, catch, finally, import, export, class.
    //    Chúng ta cần đảm bảo chúng đứng riêng một dòng để được tính 1 LLOC.
    //    Sử dụng dấu `\b` (word boundary) để khớp toàn bộ từ khóa.
    //    Chèn `\n` trước các từ khóa này nếu chúng không ở đầu dòng.
    const structureKeywords = [
        'for', 'while', 'if', 'else if', 'else', 'function', 'return',
        'switch', 'case', 'default', 'try', 'catch', 'finally',
        'import', 'export', 'class', 'const', 'let', 'var' // Bao gồm khai báo biến để đảm bảo chúng cũng được tách
    ];
    const structureRegex = new RegExp(`(?<!\\S)\\b(${structureKeywords.join('|')})\\b`, 'g'); // Không phải ký tự non-whitespace trước từ khóa
    cleanedCode = cleanedCode.replace(structureRegex, (match, p1, offset, string) => {
        // Nếu từ khóa không ở đầu dòng, chèn một newline trước nó
        if (offset > 0 && string[offset - 1] !== '\n') {
            return '\n' + match;
        }
        return match;
    });

    // 4. Lọc lại các dòng trống có thể phát sinh từ bước chuẩn hóa
    //    Đây là bước cuối cùng để có một mảng `lines` sạch.
    const lines = cleanedCode.split('\n')
                             .map(line => line.trim())
                             .filter(line => line.length > 0);

    // --- Bước 2: Đếm các dòng logic ---
    let logicalLines = 0;

    lines.forEach(line => {
        // Bỏ qua các dòng chỉ chứa dấu ngoặc nhọn `{` hoặc `}` (đã được tách ở bước chuẩn hóa)
        if (line === '{' || line === '}') {
            return;
        }

        // Đếm các dòng còn lại như một LLOC.
        logicalLines++;
    });

    return logicalLines;
};


export const processToolbox = (toolbox: ToolboxJSON, t: TFunction): ToolboxJSON => {
    const processedContents = toolbox.contents.map((item: ToolboxItem) => {
      if (item.kind === 'category') {
        let processedSubContents = item.contents;
        if (item.contents && Array.isArray(item.contents)) {
          processedSubContents = processToolbox({ ...toolbox, contents: item.contents }, t).contents;
        }
        
        const newName = item.name.replace(/%{BKY_([^}]+)}/g, (_match: string, key: string) => {
          let i18nKey: string;
          if (key.startsWith('GAMES_CAT')) {
            const catName = key.substring('GAMES_CAT'.length);
            i18nKey = 'Games.cat' + catName.charAt(0).toUpperCase() + catName.slice(1).toLowerCase();
          } else {
            i18nKey = 'Games.' + key.substring('GAMES_'.length).toLowerCase();
          }
          return t(i18nKey);
        });

        return { ...item, name: newName, contents: processedSubContents };
      }
      return item;
    });
    return { ...toolbox, contents: processedContents };
};