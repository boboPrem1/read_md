'use client';

import React from 'react';
import { Icon } from './Icon';
import { usePreferences, type Theme } from '../../hooks/use-preferences';
import { useFocusMode } from '../../hooks/use-focus-mode';
import { useImmersion } from '../../hooks/use-immersion';

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  fontSize?: number;
  onStepFontSize?: (delta: number) => number;
  contentWidth?: number;
  onContentWidthChange?: (width: number) => void;
  lineHeight?: number;
  onLineHeightChange?: (lh: number) => void;
  fontFamily?: string;
  onFontFamilyChange?: (font: string) => void;
  isMinimal?: boolean;
  onToggleMinimal?: (force?: boolean) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: (force?: boolean) => void;
  onResetPreferences?: () => void;
  className?: string;
}

const THEMES: { id: Theme; label: string; themeAttr?: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Clair', themeAttr: 'light' },
  { id: 'sepia', label: 'Sépia', themeAttr: 'sepia' },
  { id: 'dark', label: 'Sombre', themeAttr: 'dark' },
  { id: 'contrast', label: 'Contraste', themeAttr: 'contrast' },
];

export function SettingsPanel({
  isOpen,
  onClose,
  theme: propTheme,
  onThemeChange,
  fontSize: propFontSize,
  onStepFontSize,
  contentWidth: propContentWidth,
  onContentWidthChange,
  lineHeight: propLineHeight,
  onLineHeightChange,
  fontFamily: propFontFamily,
  onFontFamilyChange,
  isMinimal: propIsMinimal,
  onToggleMinimal,
  isFocusMode: propIsFocusMode,
  onToggleFocusMode,
  onResetPreferences,
  className = '',
}: SettingsPanelProps) {
  const prefs = usePreferences();
  const focus = useFocusMode();
  const immersion = useImmersion();

  const currentTheme = propTheme ?? prefs.theme;
  const currentFontSize = propFontSize ?? prefs.fontSize;
  const currentContentWidth = propContentWidth ?? prefs.contentWidth;
  const currentLineHeight = propLineHeight ?? prefs.lineHeight;
  const currentFontFamily = propFontFamily ?? prefs.fontFamily;
  const currentMinimal = propIsMinimal ?? immersion.isMinimal;
  const currentFocus = propIsFocusMode ?? focus.isFocusMode;

  const handleTheme = (t: Theme) => {
    if (onThemeChange) {
      onThemeChange(t);
    } else {
      prefs.setTheme(t);
    }
  };

  const handleStepFontSize = (delta: number) => {
    if (onStepFontSize) {
      onStepFontSize(delta);
    } else {
      prefs.stepFontSize(delta);
    }
  };

  const handleContentWidth = (w: number) => {
    if (onContentWidthChange) {
      onContentWidthChange(w);
    } else {
      prefs.setContentWidth(w);
    }
  };

  const handleLineHeight = (lh: number) => {
    if (onLineHeightChange) {
      onLineHeightChange(lh);
    } else {
      prefs.setLineHeight(lh);
    }
  };

  const handleFontFamily = (f: string) => {
    if (onFontFamilyChange) {
      onFontFamilyChange(f);
    } else {
      prefs.setFontFamily(f);
    }
  };

  const handleMinimalToggle = (checked: boolean) => {
    if (onToggleMinimal) {
      onToggleMinimal(checked);
    } else {
      immersion.toggleMinimal(checked);
    }
  };

  const handleFocusToggle = (checked: boolean) => {
    if (onToggleFocusMode) {
      onToggleFocusMode(checked);
    } else {
      focus.toggleFocusMode(checked);
    }
  };

  const handleReset = () => {
    if (onResetPreferences) {
      onResetPreferences();
    } else {
      prefs.resetPreferences();
    }
  };

  return (
    <aside
      id="settingsPanel"
      className={`settings-panel ${isOpen ? 'visible' : ''} ${className}`.trim()}
      aria-label="Confort de lecture"
    >
      <div className="settings-header">
        <h2>Confort de lecture</h2>
        <button
          id="settingsClose"
          type="button"
          className="tool-btn"
          aria-label="Fermer les réglages"
          onClick={onClose}
        >
          <Icon>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </Icon>
        </button>
      </div>

      <div className="settings-body">
        {/* Ambiance */}
        <div className="setting-group">
          <span className="setting-label" id="labelTheme">
            Ambiance
          </span>
          <div className="theme-buttons" role="group" aria-labelledby="labelTheme">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="theme-btn"
                data-theme={t.themeAttr}
                data-theme-choice={t.id}
                aria-pressed={currentTheme === t.id}
                onClick={() => handleTheme(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Taille du texte */}
        <div className="setting-group">
          <span className="setting-label" id="labelSize">
            Taille du texte
          </span>
          <div className="stepper" role="group" aria-labelledby="labelSize">
            <button
              id="fontSizeDec"
              type="button"
              aria-label="Réduire le texte"
              disabled={currentFontSize <= 14}
              onClick={() => handleStepFontSize(-1)}
            >
              <span className="stepper-small" aria-hidden="true">
                A
              </span>
            </button>
            <output id="fontSizeVal" aria-live="polite">
              {currentFontSize} px
            </output>
            <button
              id="fontSizeInc"
              type="button"
              aria-label="Agrandir le texte"
              disabled={currentFontSize >= 28}
              onClick={() => handleStepFontSize(1)}
            >
              <span className="stepper-large" aria-hidden="true">
                A
              </span>
            </button>
          </div>
        </div>

        {/* Largeur des lignes */}
        <div className="setting-group">
          <span className="setting-label" id="labelWidth">
            Largeur des lignes
          </span>
          <div className="segmented" role="group" aria-labelledby="labelWidth">
            <button
              type="button"
              data-setting="contentWidth"
              data-value="58"
              aria-pressed={currentContentWidth === 58}
              onClick={() => handleContentWidth(58)}
            >
              Étroite
            </button>
            <button
              type="button"
              data-setting="contentWidth"
              data-value="66"
              aria-pressed={currentContentWidth === 66}
              onClick={() => handleContentWidth(66)}
            >
              Confort
            </button>
            <button
              type="button"
              data-setting="contentWidth"
              data-value="78"
              aria-pressed={currentContentWidth === 78}
              onClick={() => handleContentWidth(78)}
            >
              Large
            </button>
          </div>
        </div>

        {/* Interligne */}
        <div className="setting-group">
          <span className="setting-label" id="labelLeading">
            Interligne
          </span>
          <div className="segmented" role="group" aria-labelledby="labelLeading">
            <button
              type="button"
              data-setting="lineHeight"
              data-value="1.45"
              aria-pressed={Math.abs(currentLineHeight - 1.45) < 0.01}
              onClick={() => handleLineHeight(1.45)}
            >
              Serré
            </button>
            <button
              type="button"
              data-setting="lineHeight"
              data-value="1.6"
              aria-pressed={Math.abs(currentLineHeight - 1.6) < 0.01}
              onClick={() => handleLineHeight(1.6)}
            >
              Normal
            </button>
            <button
              type="button"
              data-setting="lineHeight"
              data-value="1.8"
              aria-pressed={Math.abs(currentLineHeight - 1.8) < 0.01}
              onClick={() => handleLineHeight(1.8)}
            >
              Aéré
            </button>
          </div>
        </div>

        {/* Police */}
        <div className="setting-group">
          <span className="setting-label" id="labelFont">
            Police
          </span>
          <div className="segmented" role="group" aria-labelledby="labelFont">
            <button
              type="button"
              className="font-choice-serif"
              data-setting="fontFamily"
              data-value="serif"
              aria-pressed={currentFontFamily === 'serif'}
              onClick={() => handleFontFamily('serif')}
            >
              Serif
            </button>
            <button
              type="button"
              className="font-choice-sans"
              data-setting="fontFamily"
              data-value="sans-serif"
              aria-pressed={currentFontFamily === 'sans-serif' || currentFontFamily === 'sans'}
              onClick={() => handleFontFamily('sans-serif')}
            >
              Sans
            </button>
            <button
              type="button"
              className="font-choice-mono"
              data-setting="fontFamily"
              data-value="mono"
              aria-pressed={currentFontFamily === 'mono'}
              onClick={() => handleFontFamily('mono')}
            >
              Mono
            </button>
          </div>
        </div>

        {/* Checkbox Immersion */}
        <label className="toggle-row">
          <input
            type="checkbox"
            id="minimalMode"
            checked={currentMinimal}
            onChange={(e) => handleMinimalToggle(e.target.checked)}
          />
          <span>
            <strong>Immersion</strong>
            <small>Masque le sommaire et la barre pendant la lecture.</small>
          </span>
        </label>

        {/* Checkbox Concentration */}
        <label className="toggle-row">
          <input
            type="checkbox"
            id="focusMode"
            checked={currentFocus}
            onChange={(e) => handleFocusToggle(e.target.checked)}
          />
          <span>
            <strong>Concentration</strong>
            <small>Estompe tout sauf le passage en cours.</small>
          </span>
        </label>

        {/* Bouton Réinitialiser */}
        <button
          id="settingsReset"
          type="button"
          className="settings-reset"
          onClick={handleReset}
        >
          Rétablir les réglages par défaut
        </button>
      </div>
    </aside>
  );
}

export default SettingsPanel;
