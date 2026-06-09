import { useMemo, useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { usePreferences } from '../hooks/usePreferences';
import { useThemeStore } from '../store/useThemeStore';
import { useGroups } from '../hooks/useGroups';
import ActivityCustomizer from '../components/groups/ActivityCustomizer';
import MoodIconCustomizer from '../components/settings/MoodIconCustomizer';
import DaylioImport from '../components/settings/DaylioImport';
import FitnessConnectSection from '../components/fitness/FitnessConnectSection';
import { useFitnessData } from '../hooks/useFitnessData';
import apiService from '../services/api';
import { useQuery } from '@tanstack/react-query';
import type { AppConfig, Entry } from '../types';

interface ColorSchemeOption {
  id: string;
  name: string;
  dark: { bg: string; surface: string; accent: string };
  light: { bg: string; surface: string; accent: string };
}

const COLOR_SCHEMES: ColorSchemeOption[] = [
  {
    id: 'default',
    name: 'Default',
    dark:  { bg: '#282a36', surface: '#343746', accent: '#bd93f9' },
    light: { bg: '#F7F8FB', surface: '#FFFFFF', accent: '#2F7E89' },
  },
  {
    id: 'rose-pine',
    name: 'Rosé Piné',
    dark:  { bg: '#191724', surface: '#1f1d2e', accent: '#9ccfd8' },
    light: { bg: '#faf4ed', surface: '#fffaf3', accent: '#286983' },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    dark:  { bg: '#1e1e2e', surface: '#313244', accent: '#89b4fa' },
    light: { bg: '#eff1f5', surface: '#ffffff', accent: '#1e66f5' },
  },
  {
    id: 'nord',
    name: 'Nord',
    dark:  { bg: '#2e3440', surface: '#3b4252', accent: '#88c0d0' },
    light: { bg: '#eceff4', surface: '#e5e9f0', accent: '#5e81ac' },
  },
];

const SettingsView = () => {
  const { config, loading } = useConfig();
  const { use24HourTime, updateUse24HourTime } = usePreferences();
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const setColorScheme = useThemeStore((s) => s.setColorScheme);
  const [isSavingTimeFormat, setIsSavingTimeFormat] = useState(false);
  const [timeFormatError, setTimeFormatError] = useState('');
  const fitness = useFitnessData(
    config.enable_google_health ?? false,
    config.google_health_client_id,
  );
  const { groups } = useGroups();
  const { data: allEntries = [] } = useQuery<Entry[]>({
    queryKey: ['moods'],
    queryFn: () => apiService.getMoodEntries(),
    staleTime: 5 * 60 * 1000,
  });
  const existingDates = useMemo(() => new Set(allEntries.map((e) => e.date)), [allEntries]);

  const handleTimeFormatChange = async (nextUse24HourTime: boolean) => {
    setIsSavingTimeFormat(true);
    setTimeFormatError('');
    try {
      await updateUse24HourTime(nextUse24HourTime);
    } catch (error) {
      console.error('Failed to save time format preference:', error);
      setTimeFormatError('Could not save time format. Please try again.');
    } finally {
      setIsSavingTimeFormat(false);
    }
  };

  const featureFlags: Array<{ key: keyof AppConfig; label: string; description: string }> = [
    { key: 'enable_google_oauth', label: 'Google Login', description: 'Enable Google OAuth-based authentication.' },
  ];

  return (
    <div className="text-left">
      <h2 className="mt-0 text-[var(--text)]">Settings</h2>

      <section className="mt-4 border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]" aria-label="Appearance settings">
        <h3 className="mt-0 mb-1 text-[var(--text)]">Appearance</h3>
        <p className="mt-0 mb-3 text-[var(--text-muted)] text-sm">Choose a color scheme. Use the theme toggle in the header to switch between light and dark mode.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLOR_SCHEMES.map((scheme) => {
            const isActive = colorScheme === scheme.id;
            return (
              <button
                key={scheme.id}
                type="button"
                onClick={() => setColorScheme(scheme.id)}
                aria-pressed={isActive}
                aria-label={`${scheme.name} color scheme`}
                style={{
                  all: 'unset',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '12px',
                  border: `2px solid ${isActive ? 'var(--accent-600)' : 'var(--border)'}`,
                  background: isActive ? 'var(--accent-bg-softer)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderRadius: '7px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                  {/* Dark variant strip */}
                  <div style={{ display: 'flex', height: '28px', background: scheme.dark.bg }}>
                    <div style={{ flex: 1, background: scheme.dark.surface }} />
                    <div style={{ width: '12px', background: scheme.dark.accent }} />
                  </div>
                  {/* Light variant strip */}
                  <div style={{ display: 'flex', height: '28px', background: scheme.light.bg }}>
                    <div style={{ flex: 1, background: scheme.light.surface }} />
                    <div style={{ width: '12px', background: scheme.light.accent }} />
                  </div>
                </div>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--accent-600)' : 'var(--text-muted)',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}>
                  {scheme.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]" aria-label="Time display settings">
        <h3 className="mt-0 mb-1 text-[var(--text)]">Time display</h3>
        <p className="mt-0 mb-3 text-[var(--text-muted)] text-sm">Choose how entry times appear across Waymark.</p>
        <label className="flex items-start justify-between gap-4 py-2 border-t border-[var(--border)]">
          <span>
            <strong className="text-[var(--text)]">Use 24-hour time</strong>
            <span className="block text-[var(--text-muted)] text-[0.86rem]">
              Show times like 14:30 instead of 2:30 PM.
              {isSavingTimeFormat ? ' Saving...' : ''}
            </span>
            {timeFormatError && (
              <span className="block text-[var(--danger)] text-[0.86rem] mt-1" role="alert">
                {timeFormatError}
              </span>
            )}
          </span>
          <input
            type="checkbox"
            checked={use24HourTime}
            disabled={isSavingTimeFormat}
            onChange={(event) => { void handleTimeFormatChange(event.target.checked); }}
            aria-label="Use 24-hour time"
            className="mt-1"
          />
        </label>
      </section>

      <section className="mt-4 border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]" aria-label="Mood icon customization">
        <h3 className="mt-0 mb-1 text-[var(--text)]">Mood Icons</h3>
        <p className="mt-0 mb-0 text-[var(--text-muted)] text-sm">Choose an alternative icon for each mood level.</p>
        <MoodIconCustomizer />
      </section>

      <section className="mt-4 border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]" aria-label="Activity customization">
        <h3 className="mt-0 mb-1 text-[var(--text)]">Activities &amp; Categories</h3>
        <p className="mt-0 mb-0 text-[var(--text-muted)] text-sm">Reorder, colorize, and add icons to your activity categories. Click a name to edit it.</p>
        <ActivityCustomizer />
      </section>

      {config.enable_google_health && (
        <section className="mt-4 border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]" aria-label="Google Health connection">
          <h3 className="mt-0 mb-1 text-[var(--text)]">Google Health</h3>
          <p className="mt-0 mb-3 text-[var(--text-muted)] text-sm">
            Sync fitness activity, steps, and sleep data to automatically enrich your mood entries.
          </p>
          <FitnessConnectSection fitness={fitness} />
        </section>
      )}

      <section className="mt-4 border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]" aria-label="Daylio import">
        <h3 className="mt-0 mb-1 text-[var(--text)]">Import from Daylio</h3>
        <p className="mt-0 mb-3 text-[var(--text-muted)] text-sm">Import mood entries from a Daylio CSV export. Entries for dates that already exist will be skipped.</p>
        <DaylioImport groups={groups} existingDates={existingDates} />
      </section>

      <section className="mt-4 border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]" aria-label="Feature flags">
        <h3 className="mt-0 mb-2 text-[var(--text)]">Feature flags</h3>
        <p className="mt-0 mb-3 text-[var(--text-muted)] text-sm">These are server-managed. Editable toggles can be added here later.</p>

        {featureFlags.map((flag) => {
          const isEnabled = Boolean(config[flag.key]);
          return (
            <label key={flag.key} className="flex items-start gap-3 py-2 border-t border-[var(--border)]">
              <input type="checkbox" checked={isEnabled} readOnly disabled aria-label={flag.label} className="mt-0.5" />
              <span>
                <strong className="text-[var(--text)]">{flag.label}</strong>
                <span className="block text-[var(--text-muted)] text-[0.86rem]">
                  {flag.description}
                  {loading ? ' (loading...)' : isEnabled ? ' (enabled)' : ' (disabled)'}
                </span>
              </span>
            </label>
          );
        })}
      </section>

      <section className="mt-4 border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]" aria-label="Support">
        <h3 className="mt-0 mb-1 text-[var(--text)]">Support</h3>
        <p className="mt-0 mb-0 text-[var(--text-muted)] text-sm">
          If you're going through a hard time, you don't have to go through it alone — directories
          like <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-600)] underline">findahelpline.com</a> can
          connect you with someone to talk to, wherever you are.
        </p>
      </section>
    </div>
  );
};

export default SettingsView;
