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