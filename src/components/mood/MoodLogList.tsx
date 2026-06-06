import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { getMoodIcon, getMoodLabel, MOODS } from '../../utils/moodUtils';
import { usePreferences } from '../../contexts/PreferencesContext';
import apiService from '../../services/api';
import type { MoodLog, MoodValue } from '../../types';

interface MoodLogListProps {
  entryId: number;
  onMoodUpdated: (newMood: MoodValue) => void;
}

const formatLogTime = (logged_at: string): string => {
  try {
    return new Date(logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const MoodLogList = ({ entryId, onMoodUpdated }: MoodLogListProps) => {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { getMoodIconComponent } = usePreferences();

  const loadLogs = useCallback(async () => {
    try {
      const data = await apiService.getMoodLogs(entryId);
      setLogs(data);
    } catch {
      // silently ignore — mood logs are non-critical
    }
  }, [entryId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleAddLog = async (mood: MoodValue) => {
    setIsAdding(false);
    setIsLoading(true);
    try {
      const result = await apiService.addMoodLog(entryId, { mood });
      onMoodUpdated(result.updated_entry_mood as MoodValue);
      await loadLogs();
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLog = async (logId: number) => {
    setIsLoading(true);
    try {
      const result = await apiService.deleteMoodLog(entryId, logId);
      onMoodUpdated(result.updated_entry_mood as MoodValue);
      await loadLogs();
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      borderRadius: '12px',
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '0.75rem',
      marginTop: '0.5rem',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: logs.length > 0 ? '0.6rem' : 0,
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'color-mix(in oklab, var(--text), transparent 30%)' }}>
          Mood check-ins{logs.length > 1 ? ` · avg shown above` : ''}
        </span>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            disabled={isLoading}
            title="Log another mood"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 500,
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <Plus size={12} aria-hidden="true" />
            Add
          </button>
        )}
      </div>

      {logs.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {logs.map((log) => {
            const { color } = getMoodIcon(log.mood);
            const IconComponent = getMoodIconComponent(log.mood as MoodValue);
            return (
              <li key={log.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.82rem',
              }}>
                <IconComponent size={16} style={{ color, flexShrink: 0 }} strokeWidth={1.5} />
                <span style={{ flex: 1, color: 'var(--text)' }}>
                  {getMoodLabel(log.mood)}
                </span>
                <span style={{ color: 'color-mix(in oklab, var(--text), transparent 50%)', fontSize: '0.75rem' }}>
                  {formatLogTime(log.logged_at)}
                </span>
                {logs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLog(log.id)}
                    disabled={isLoading}
                    aria-label={`Remove ${getMoodLabel(log.mood)} mood log`}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'color-mix(in oklab, var(--text), transparent 50%)',
                      padding: '2px',
                      display: 'flex',
                      opacity: isLoading ? 0.4 : 1,
                    }}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isAdding && (
        <div style={{ marginTop: logs.length > 0 ? '0.6rem' : 0 }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'color-mix(in oklab, var(--text), transparent 30%)' }}>
            How are you feeling now?
          </p>
          <div className="mood-grid" style={{ gap: '0.4rem' }}>
            {MOODS.map((mood) => {
              const IconComponent = getMoodIconComponent(mood.value);
              return (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() => handleAddLog(mood.value)}
                  className="mood-button"
                  style={{ color: mood.color, width: '40px', height: '40px' }}
                  title={mood.label}
                >
                  <IconComponent size={24} strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
          <div style={{ textAlign: 'right', marginTop: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.78rem',
                color: 'color-mix(in oklab, var(--text), transparent 40%)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodLogList;
