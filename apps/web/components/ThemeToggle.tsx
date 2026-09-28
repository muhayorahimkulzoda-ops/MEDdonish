'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { t } from '../lib/i18n';
import { hydrateTheme, readStoredTheme, toggleTheme, type ThemeMode } from '../lib/theme';

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    hydrateTheme();
    setMode(readStoredTheme());
  }, []);

  const next = mode === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? t('theme.dark') : t('theme.light');

  return (
    <button
      type="button"
      className="md-icon-btn"
      aria-label={label}
      title={label}
      onClick={() => setMode(toggleTheme())}
    >
      {mode === 'dark' ? <Sun strokeWidth={1.85} /> : <Moon strokeWidth={1.85} />}
    </button>
  );
}
