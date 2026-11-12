'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Preferences,
  READING_DEFAULTS,
  FONT_SIZE_RANGE,
} from '../lib/storage/preferences';
import { Announcer } from '../lib/utils';

export type Theme = 'auto' | 'light' | 'dark' | 'sepia' | 'contrast';
export type EffectiveTheme = 'light' | 'dark' | 'sepia' | 'contrast';
export type FontFamily = 'serif' | 'sans-serif' | 'mono';

export interface UsePreferencesReturn {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  fontSize: number;
  lineHeight: number;
  contentWidth: number;
  fontFamily: FontFamily | string;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (lineHeight: number) => void;
  setContentWidth: (contentWidth: number) => void;
  setFontFamily: (fontFamily: FontFamily | string) => void;
  stepFontSize: (delta: number) => number;
  resetPreferences: () => void;
}

const THEME_LABELS: Record<Theme, string> = {
  auto: 'Ambiance automatique',
  light: 'Ambiance claire',
  dark: 'Ambiance sombre',
  sepia: 'Ambiance sépia',
  contrast: 'Contraste élevé',
};

const FONT_FAMILIES: Record<string, string> = {
  serif: 'var(--font-serif)',
  'sans-serif': 'var(--font-sans)',
  mono: 'var(--font-mono)',
};

function resolveEffectiveTheme(theme: Theme): EffectiveTheme {
  if (typeof window === 'undefined') return 'light';
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyThemeToDOM(theme: Theme): EffectiveTheme {
  const effective = resolveEffectiveTheme(theme);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', effective);
  }
  return effective;
}

function applyFontSizeToDOM(size: number): void {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--font-size', `${size}px`);
  }
}

function applyLineHeightToDOM(lineHeight: number): void {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--line-height', String(lineHeight));
  }
}

function applyContentWidthToDOM(width: number): void {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--content-width', `${width}ch`);
  }
}

function applyFontFamilyToDOM(fontFamily: string): void {
  if (typeof document !== 'undefined') {
    const val = FONT_FAMILIES[fontFamily] || FONT_FAMILIES.serif;
    document.documentElement.style.setProperty('--font-body', val);
  }
}

export function usePreferences(): UsePreferencesReturn {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>('light');
  const [fontSize, setFontSizeState] = useState<number>(READING_DEFAULTS.fontSize);
  const [lineHeight, setLineHeightState] = useState<number>(READING_DEFAULTS.lineHeight);
  const [contentWidth, setContentWidthState] = useState<number>(READING_DEFAULTS.contentWidth);
  const [fontFamily, setFontFamilyState] = useState<string>(READING_DEFAULTS.fontFamily);

  // Initialize from storage & apply CSS variables on mount
  useEffect(() => {
    const data = Preferences.load();
    const storedTheme = (data.theme as Theme) || 'auto';
    const storedFontSize = typeof data.fontSize === 'number' ? data.fontSize : READING_DEFAULTS.fontSize;
    const storedLineHeight = typeof data.lineHeight === 'number' ? data.lineHeight : READING_DEFAULTS.lineHeight;
    const storedContentWidth = typeof data.contentWidth === 'number' ? data.contentWidth : READING_DEFAULTS.contentWidth;
    const storedFontFamily = typeof data.fontFamily === 'string' ? data.fontFamily : READING_DEFAULTS.fontFamily;

    setThemeState(storedTheme);
    setFontSizeState(storedFontSize);
    setLineHeightState(storedLineHeight);
    setContentWidthState(storedContentWidth);
    setFontFamilyState(storedFontFamily);

    const eff = applyThemeToDOM(storedTheme);
    setEffectiveTheme(eff);
    applyFontSizeToDOM(storedFontSize);
    applyLineHeightToDOM(storedLineHeight);
    applyContentWidthToDOM(storedContentWidth);
    applyFontFamilyToDOM(storedFontFamily);
  }, []);

  // Listen to prefers-color-scheme when theme is auto
  useEffect(() => {
    if (theme !== 'auto' || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      const eff: EffectiveTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', eff);
      setEffectiveTheme(eff);
    };

    mediaQuery.addEventListener('change', onChange);
    return () => {
      mediaQuery.removeEventListener('change', onChange);
    };
  }, [theme]);

  const announce = useCallback((msg: string) => {
    if (typeof document !== 'undefined' && !Announcer._el) {
      Announcer.init();
    }
    Announcer.say(msg);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    Preferences.set('theme', newTheme);
    const eff = applyThemeToDOM(newTheme);
    setEffectiveTheme(eff);
    announce(THEME_LABELS[newTheme] || newTheme);
  }, [announce]);

  const setFontSize = useCallback((val: number) => {
    const clamped = Math.min(FONT_SIZE_RANGE.max, Math.max(FONT_SIZE_RANGE.min, val));
    setFontSizeState(clamped);
    Preferences.set('fontSize', clamped);
    applyFontSizeToDOM(clamped);
  }, []);

  const stepFontSize = useCallback((delta: number): number => {
    const current = (Preferences.get('fontSize') as number) ?? READING_DEFAULTS.fontSize;
    const next = Math.min(FONT_SIZE_RANGE.max, Math.max(FONT_SIZE_RANGE.min, current + delta));
    setFontSizeState(next);
    Preferences.set('fontSize', next);
    applyFontSizeToDOM(next);
    return next;
  }, []);

  const setLineHeight = useCallback((val: number) => {
    setLineHeightState(val);
    Preferences.set('lineHeight', val);
    applyLineHeightToDOM(val);
  }, []);

  const setContentWidth = useCallback((val: number) => {
    setContentWidthState(val);
    Preferences.set('contentWidth', val);
    applyContentWidthToDOM(val);
  }, []);

  const setFontFamily = useCallback((val: FontFamily | string) => {
    setFontFamilyState(val);
    Preferences.set('fontFamily', val);
    applyFontFamilyToDOM(val);
  }, []);

  const resetPreferences = useCallback(() => {
    setFontSizeState(READING_DEFAULTS.fontSize);
    setLineHeightState(READING_DEFAULTS.lineHeight);
    setContentWidthState(READING_DEFAULTS.contentWidth);
    setFontFamilyState(READING_DEFAULTS.fontFamily);

    Preferences.set('fontSize', READING_DEFAULTS.fontSize);
    Preferences.set('lineHeight', READING_DEFAULTS.lineHeight);
    Preferences.set('contentWidth', READING_DEFAULTS.contentWidth);
    Preferences.set('fontFamily', READING_DEFAULTS.fontFamily);

    applyFontSizeToDOM(READING_DEFAULTS.fontSize);
    applyLineHeightToDOM(READING_DEFAULTS.lineHeight);
    applyContentWidthToDOM(READING_DEFAULTS.contentWidth);
    applyFontFamilyToDOM(READING_DEFAULTS.fontFamily);

    announce('Réglages par défaut rétablis');
  }, [announce]);

  return {
    theme,
    effectiveTheme,
    fontSize,
    lineHeight,
    contentWidth,
    fontFamily,
    setTheme,
    setFontSize,
    setLineHeight,
    setContentWidth,
    setFontFamily,
    stepFontSize,
    resetPreferences,
  };
}
