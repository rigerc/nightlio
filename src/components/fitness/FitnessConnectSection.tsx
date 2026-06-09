import { useEffect, useRef } from 'react';
import { useToast } from '../ui/ToastProvider';
import type { UseFitnessDataReturn } from '../../hooks/useFitnessData';

interface FitnessConnectSectionProps {
  fitness: UseFitnessDataReturn;
}

const FitnessConnectSection = ({ fitness }: FitnessConnectSectionProps) => {
  const { connection, loading, syncing, error, connect, handleCallback, sync, disconnect } = fitness;
  const toast = useToast();
  const callbackHandled = useRef(false);

  useEffect(() => {
    if (callbackHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code) return;
    callbackHandled.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('scope');
    window.history.replaceState({}, '', url.toString());
    handleCallback(code, state)
      .then(() => toast.show('Google Health connected successfully', 'success'))
      .catch((e: Error) => toast.show(`Connection failed: ${e.message}`, 'error'));
  }, [handleCallback, toast]);

  useEffect(() => {
    if (error) toast.show(error, 'error');
  }, [error, toast]);

  const formatLastSync = (ts: string | null) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div>
      {loading && !connection ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading status…</p>
      ) : connection?.connected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Last synced: {formatLastSync(connection.last_synced_at)}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                void sync(30).then(() => toast.show('Sync complete', 'success'));
              }}
              disabled={syncing}
              style={{
                background: 'var(--accent-bg)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 600,
                cursor: syncing ? 'not-allowed' : 'pointer',
                opacity: syncing ? 0.7 : 1,
                fontSize: '0.9rem',
              }}
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              onClick={() => {
                void disconnect().then(() => toast.show('Disconnected from Google Health', 'info'));
              }}
              disabled={syncing}
              style={{
                background: 'transparent',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => void connect()}
          disabled={loading}
          style={{
            background: 'var(--accent-bg)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontSize: '0.95rem',
          }}
        >
          Connect Google Health
        </button>
      )}
    </div>
  );
};

export default FitnessConnectSection;
