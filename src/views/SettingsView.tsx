import { useConfig } from '../contexts/ConfigContext';
import ActivityCustomizer from '../components/groups/ActivityCustomizer';
import MoodIconCustomizer from '../components/settings/MoodIconCustomizer';
import FitnessConnectSection from '../components/fitness/FitnessConnectSection';
import { useFitnessData } from '../hooks/useFitnessData';
import type { AppConfig } from '../types';

const SettingsView = () => {
  const { config, loading } = useConfig();
  const fitness = useFitnessData(
    config.enable_google_health ?? false,
    config.google_health_client_id,
  );

  const featureFlags: Array<{ key: keyof AppConfig; label: string; description: string }> = [
    { key: 'enable_google_oauth', label: 'Google Login', description: 'Enable Google OAuth-based authentication.' },
  ];

  return (
    <div className="text-left">
      <h2 className="mt-0 text-[var(--text)]">Settings</h2>

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
