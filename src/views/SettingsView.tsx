import { useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { usePreferences } from '../contexts/PreferencesContext';
import ActivityCustomizer from '../components/groups/ActivityCustomizer';
import MoodIconCustomizer from '../components/settings/MoodIconCustomizer';
import FitnessConnectSection from '../components/fitness/FitnessConnectSection';
import { useFitnessData } from '../hooks/useFitnessData';
import type { AppConfig } from '../types';

const SettingsView = () => {
  const { config, loading } = useConfig();
  const { use24HourTime, updateUse24HourTime } = usePreferences();
  const [isSavingTimeFormat, setIsSavingTimeFormat] = useState(false);
  const [timeFormatError, setTimeFormatError] = useState('');
  const fitness = useFitnessData(
    config.enable_google_health ?? false,
    config.google_health_client_id,
  );

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
    </div>
  );
};

export default SettingsView;
