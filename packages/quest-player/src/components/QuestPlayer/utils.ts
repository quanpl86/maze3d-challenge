// src/components/QuestPlayer/utils.ts

import * as Blockly from 'blockly/core';
import type { TFunction } from 'i18next';
import type { ResultType } from '../../games/maze/types';
import type { ToolboxJSON, ToolboxItem } from '../../types';

// Define a theme to control category colors
export const createBlocklyTheme = (themeName: 'zelos' | 'classic', colorScheme: 'light' | 'dark') => {
  const isDark = colorScheme === 'dark';
  
  // Get base theme from Blockly
  const baseTheme = themeName === 'zelos' ? Blockly.Themes.Zelos : Blockly.Themes.Classic;

  // Define custom block styles that match category colors
  const customBlockStyles = {
    'events_blocks': {
      'colourPrimary': '#FFBF00',
      'colourSecondary': '#FFD966',
      'colourTertiary': '#E6AC00'
    },
    'movement_blocks': {
      'colourPrimary': '#CF63CF',
      'colourSecondary': '#E8A0E8',
      'colourTertiary': '#B84CB8'
    },
    'loops_blocks': {
      'colourPrimary': '#5BA55B',
      'colourSecondary': '#8FD18F',
      'colourTertiary': '#458A45'
    },
    'logic_blocks': {
      'colourPrimary': '#5B80A5',
      'colourSecondary': '#8FA9C4',
      'colourTertiary': '#446688'
    },
    'actions_blocks': {
      'colourPrimary': '#A5745B',
      'colourSecondary': '#C49880',
      'colourTertiary': '#8A5A42'
    }
  };

  // Create a proper Blockly Theme instance
  const customTheme = new Blockly.Theme('customTheme', {
    // Block styles - merge base with custom
    ...baseTheme.blockStyles,
    ...customBlockStyles,
  }, {
    // Category styles - merge base with custom
    ...baseTheme.categoryStyles,
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
  }, {
    // Component styles
    ...(isDark ? {
      'workspaceBackgroundColour': '#1e1e1e',
      'toolboxBackgroundColour': '#252526',
      'toolboxForegroundColour': '#fff',
      'flyoutBackgroundColour': '#252526',
      'flyoutForegroundColour': '#ccc',
      'scrollbarColour': '#797979',
      'scrollbarOpacity': 0.5,
    } : baseTheme.componentStyles),
  });

  // Set font style
  customTheme.setFontStyle(baseTheme.fontStyle);
  
  // Enable start hats
  customTheme.setStartHats(true);

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

        // Assign categorystyle based on name
        let categorystyle = item.categorystyle || '';
        const upperName = item.name.toUpperCase();
        if (upperName.includes('EVENTS')) categorystyle = 'events_category';
        else if (upperName.includes('MOVEMENT')) categorystyle = 'movement_category';
        else if (upperName.includes('LOOPS')) categorystyle = 'loops_category';
        else if (upperName.includes('LOGIC')) categorystyle = 'logic_category';
        else if (upperName.includes('ACTIONS')) categorystyle = 'actions_category';
        else if (upperName.includes('MATH')) categorystyle = 'math_category';
        else if (upperName.includes('TEXT')) categorystyle = 'text_category';
        else if (upperName.includes('LISTS')) categorystyle = 'list_category';
        else if (upperName.includes('COLOUR')) categorystyle = 'colour_category';
        else if (upperName.includes('VARIABLES')) categorystyle = 'variable_category';
        else if (upperName.includes('PROCEDURES') || newName.toUpperCase().includes('FUNCTIONS')) categorystyle = 'procedure_category';
        else if (upperName.includes('POND')) categorystyle = 'pond_category';
        else if (upperName.includes('TURTLE')) categorystyle = 'turtle_category';
        
        return { ...item, name: newName, contents: processedSubContents, categorystyle };
      }
      return item;
    });
    return { ...toolbox, contents: processedContents };
};