// src/components/QuestPlayer/utils.ts

import * as Blockly from 'blockly/core';
import type { TFunction } from 'i18next';
import type { ResultType } from '../../games/maze/types';
import type { ToolboxJSON, ToolboxItem } from '../../types';

// Define a simple theme to control category colors
export const createBlocklyTheme = (themeName: 'zelos' | 'classic', colorScheme: 'light' | 'dark') => {
    const isDark = colorScheme === 'dark';
    const baseTheme = themeName === 'zelos' ? Blockly.Themes.Zelos : Blockly.Themes.Classic;
    
    return Blockly.Theme.defineTheme(`custom-${themeName}-${colorScheme}`, {
      name: `custom-${themeName}-${colorScheme}`,
      base: baseTheme,
      categoryStyles: {
        'pond_category': { 'colour': '290' },
        'turtle_category': { 'colour': '160' },
        'loops_category': { 'colour': '%{BKY_LOOPS_HUE}' },
        'colour_category': { 'colour': '%{BKY_COLOUR_HUE}' },
        'logic_category': { 'colour': '%{BKY_LOGIC_HUE}' },
        'math_category': { 'colour': '%{BKY_MATH_HUE}' },
        'text_category': { 'colour': '%{BKY_TEXTS_HUE}' },
        'list_category': { 'colour': '%{BKY_LISTS_HUE}' },
        'variable_category': { 'colour': '%{BKY_VARIABLES_HUE}' },
        'procedure_category': { 'colour': '%{BKY_PROCEDURES_HUE}' },
      },
      componentStyles: isDark ? {
        'workspaceBackgroundColour': '#1e1e1e',
        'toolboxBackgroundColour': '#252526',
        'toolboxForegroundColour': '#fff',
        'flyoutBackgroundColour': '#252526',
        'flyoutForegroundColour': '#ccc',
        'scrollbarColour': '#797979',
      } : {},
      'startHats': true,
    });
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
        let categoryTheme = '';
        if (item.name.includes('POND')) categoryTheme = 'pond_category';
        if (item.name.includes('TURTLE')) categoryTheme = 'turtle_category';
        if (item.name.includes('LOOPS')) categoryTheme = 'loops_category';
        if (item.name.includes('COLOUR')) categoryTheme = 'colour_category';
        if (item.name.includes('LOGIC')) categoryTheme = 'logic_category';
        if (item.name.includes('MATH')) categoryTheme = 'math_category';
        if (item.name.includes('TEXT')) categoryTheme = 'text_category';
        if (item.name.includes('LISTS')) categoryTheme = 'list_category';
        if (item.name.includes('VARIABLES')) categoryTheme = 'variable_category';
        if (item.name.includes('PROCEDURES')) categoryTheme = 'procedure_category';
        return { ...item, name: newName, contents: processedSubContents, categorystyle: categoryTheme };
      }
      return item;
    });
    return { ...toolbox, contents: processedContents };
};