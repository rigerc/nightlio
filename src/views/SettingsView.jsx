import { useConfig } from '../contexts/ConfigContext';

const SettingsView = () => {
  const { config, loading } = useConfig();

  const featureFlags = [
    {
      key: 'enable_google_oauth',
      label: 'Google Login',
      description: 'Enable Google OAuth-based authentication.',
    },
  ];

  return (
    <div className="text-left">
      <h2 className="mt-0 text-[var(--text)]">Settings</h2>

      <section
        className="mt-4 border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]"
        aria-label="Feature flags"
      >
        <h3 className="mt-0 mb-2 text-[var(--text)]">Feature flags</h3>
        <p className="mt-0 mb-3 text-[var(--text-muted)] text-sm">
          These are server-managed. Editable toggles can be added here later.
        </p>

        {featureFlags.map((flag) => {
          const isEnabled = Boolean(config[flag.key]);
          return (
            <label
              key={flag.key}
              className="flex items-start gap-3 py-2 border-t border-[var(--border)]"
            >
              <input
                type="checkbox"
                checked={isEnabled}
                readOnly
                disabled
                aria-label={flag.label}
                className="mt-0.5"
              />
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
