import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { getMoodIcon, getMoodLabel, MOODS } from '../../utils/moodUtils';
import { usePreferences } from '../../hooks/usePreferences';
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

const TRAJECTORY_DOT_SIZE = 8;
const TRAJECTORY_MAX_OFFSET = 26;

// A lightweight same-day mood arc — lets people *see* their emotional history at the
// within-day grain (guideline #3), and makes the averaged headline mood interpretable
// rather than opaque (a volatile day can collapse into a misleadingly "neutral" average).
const MoodTrajectory = ({ logs }: { logs: MoodLog[] }) => {
  if (logs.length < 2) return null;

  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.4rem',
          height: TRAJECTORY_MAX_OFFSET + TRAJECTORY_DOT_SIZE,
          padding: '0 2px',
        }}
      >
        {logs.map((log) => {
          const { color } = getMoodIcon(log.mood);
          const offset = ((log.mood - 1) / 4) * TRAJECTORY_MAX_OFFSET;
          return (
            <div
              key={log.id}
              title={`${getMoodLabel(log.mood)} at ${formatLogTime(log.logged_at)}`}
              style={{
                width: TRAJECTORY_DOT_SIZE,
                height: TRAJECTORY_DOT_SIZE,
                borderRadius: '50%',
                background: color,
                marginBottom: `${offset}px`,
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>
      <div style={{
        fontSize: '0.7rem',
        color: 'color-mix(in oklab, var(--text), transparent 50%)',
        marginTop: '2px',
      }}>
        Today's mood arc — left is earliest, right is most recent
      </div>
    </div>
  );
};

// Reflection prompts scoped to the moment of a repeat check-in — more contextually
// relevant than a generic end-of-entry prompt, and entirely optional/skippable.
const CHECK_IN_PROMPTS: readonly string[] = Object.freeze([
  'What changed since your last check-in?',
  'What happened just before this feeling came up?',
  'Is this feeling different from how you started the day?',
]);

const CheckInPrompt = ({ index }: { index: number }) => (
  <p style={{
    margin: '0 0 0.5rem',
    fontSize: '0.78rem',
    fontStyle: 'italic',
    color: 'color-mix(in oklab, var(--text), transparent 45%)',
  }}>
    {CHECK_IN_PROMPTS[index % CHECK_IN_PROMPTS.length]}
  </p>
);

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

      <MoodTrajectory logs={logs} />

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
          {logs.length > 0 && <CheckInPrompt index={logs.length - 1} />}
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
