// src/components/SettingsPanel/index.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import './SettingsPanel.css';

type ColorSchemeMode = 'auto' | 'light' | 'dark';
type ToolboxMode = 'default' | 'simple' | 'test';
type BlocklyThemeName = 'zelos' | 'classic';

interface SettingsPanelProps {
  isOpen: boolean;
  
  renderer: 'geras' | 'zelos';
  onRendererChange: (renderer: 'geras' | 'zelos') => void;
  
  blocklyThemeName: BlocklyThemeName;
  onBlocklyThemeNameChange: (theme: BlocklyThemeName) => void;

  gridEnabled: boolean;
  onGridChange: (enabled: boolean) => void;

  soundsEnabled: boolean;
  onSoundsChange: (enabled: boolean) => void;

  colorSchemeMode: ColorSchemeMode;
  onColorSchemeChange: (mode: ColorSchemeMode) => void;

  toolboxMode: ToolboxMode;
  onToolboxModeChange: (mode: ToolboxMode) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
    isOpen, 
    renderer,
    onRendererChange,
    blocklyThemeName,
    onBlocklyThemeNameChange,
    gridEnabled,
    onGridChange,
    soundsEnabled,
    onSoundsChange,
    colorSchemeMode,
    onColorSchemeChange,
    toolboxMode,
    onToolboxModeChange
}) => {
  const { t } = useTranslation();

  return (
    <div className={`settings-panel-container ${isOpen ? 'open' : ''}`}>
      <div className="settings-panel">
        <h3>{t('Settings.title')}</h3>
        <div className="setting-item">
          <label htmlFor="renderer-select">{t('Settings.renderer')}</label>
          <select 
            id="renderer-select" 
            value={renderer} 
            onChange={(e) => onRendererChange(e.target.value as 'geras' | 'zelos')}>
            <option value="zelos">Zelos</option>
            <option value="geras">Geras</option>
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="theme-select">{t('Settings.theme')}</label>
          <select 
            id="theme-select"
            value={blocklyThemeName}
            onChange={(e) => onBlocklyThemeNameChange(e.target.value as BlocklyThemeName)}
          >
            <option value="zelos">Zelos</option>
            <option value="classic">Classic</option>
          </select>
        </div>
        <div className="setting-item">
          <label>
            <input 
                type="checkbox" 
                checked={gridEnabled}
                onChange={(e) => onGridChange(e.target.checked)}
            /> {t('Settings.grid')}
          </label>
        </div>
        <div className="setting-item">
          <label>
            <input 
                type="checkbox" 
                checked={soundsEnabled}
                onChange={(e) => onSoundsChange(e.target.checked)}
            /> {t('Settings.sounds')}
          </label>
        </div>
        <div className="setting-item">
          <label htmlFor="colorscheme-select">{t('Settings.colorScheme')}</label>
          <select 
            id="colorscheme-select"
            value={colorSchemeMode}
            onChange={(e) => onColorSchemeChange(e.target.value as ColorSchemeMode)}
          >
            <option value="auto">{t('Settings.colorSchemeAuto')}</option>
            <option value="light">{t('Settings.colorSchemeLight')}</option>
            <option value="dark">{t('Settings.colorSchemeDark')}</option>
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="toolbox-select">{t('Settings.toolbox')}</label>
          <select 
            id="toolbox-select"
            value={toolboxMode}
            onChange={(e) => onToolboxModeChange(e.target.value as ToolboxMode)}
          >
            <option value="default">{t('Settings.toolboxDefault')}</option>
            <option value="simple" disabled>Simple</option>
            <option value="test" disabled>Test</option>
          </select>
        </div>
      </div>
    </div>
  );
};