'use client';

import { t } from '../lib/i18n';

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  shown,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="pay-label">
      {label}
      <span className="password-field">
        <input
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={8}
          required
        />
        <button
          type="button"
          className="password-toggle"
          onClick={onToggle}
          aria-label={shown ? t('auth.password.hide') : t('auth.password.show')}
        >
          {shown ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z" />
              <circle cx="12" cy="12" r="3" />
              <path d="M4 20 20 4" />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}
