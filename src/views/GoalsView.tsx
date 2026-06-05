import { useState, useEffect, useRef } from 'react';
import { Target } from 'lucide-react';
import GoalsList from '../components/goals/GoalsList';
import GoalForm from '../components/goals/GoalForm';
import type { GoalFormRef } from '../components/goals/GoalForm';
import Skeleton from '../components/ui/Skeleton';
import apiService from '../services/api';
import type { Goal } from '../types';

interface GoalWithExtra extends Goal {
  frequency: string;
  total: number;
  _doneToday: boolean;
}

const suggestions = [
  { t: 'Morning Meditation', d: '10 minutes of mindfulness' },
  { t: 'Evening Walk', d: '30-minute walk outside' },
  { t: 'Read Before Bed', d: 'Read 20 minutes before sleep' },
  { t: 'Drink Water', d: '8 glasses of water daily' },
  { t: 'Stretching Routine', d: '15 minutes of light stretching' },
  { t: 'Learn a Language', d: 'Practice 20 minutes on Duolingo' },
  { t: 'Journal', d: 'Write 5-minute reflection' },
];

const GoalsView = () => {
  const [goals, setGoals] = useState<GoalWithExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<GoalFormRef>(null);

  const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handlePrefill = (title: string, description: string) => {
    formRef.current?.prefill(title, description);
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const data = await apiService.getGoals();
        if (!mounted) return;
        const today = getToday();
        const mapped: GoalWithExtra[] = (data || []).map((g: Goal & { frequency_per_week: number; already_completed_today?: boolean; last_completed_date?: string }) => ({
          ...g,
          frequency: `${g.frequency_per_week} days a week`,
          completed: g.completed ?? 0,
          total: g.frequency_per_week ?? 0,
          streak: g.streak ?? 0,
          last_completed_date: g.last_completed_date || undefined,
          _doneToday: (() => {
            try {
              const localVal = localStorage.getItem(`goal_done_${g.id}`);
              return (localVal === today) || g.already_completed_today === true || (g.last_completed_date === today);
            } catch {
              return g.already_completed_today === true || (g.last_completed_date === today);
            }
          })(),
        }));
        setGoals(mapped);
      } catch { /* fallback */ } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleAddGoal = async (newGoal: { title: string; description: string; frequency: string }) => {
    const freqNum = parseInt((newGoal.frequency || '0').split(' ')[0]);
    const safeFreq = Number.isFinite(freqNum) && freqNum > 0 ? freqNum : 3;
    try {
      const resp = await apiService.createGoal({ title: newGoal.title, description: newGoal.description, frequency: safeFreq });
      const id = resp?.id ?? Date.now();
      const goal: GoalWithExtra = { id, title: newGoal.title, description: newGoal.description, frequency: `${safeFreq} days a week`, completed: 0, total: safeFreq, streak: 0, period_start: undefined, last_completed_date: undefined, frequency_per_week: safeFreq, _doneToday: false };
      setGoals(prev => [goal, ...prev]);
    } catch {
      const goal: GoalWithExtra = { id: Date.now(), title: newGoal.title, description: newGoal.description, frequency: `${safeFreq} days a week`, completed: 0, total: safeFreq, streak: 0, period_start: undefined, last_completed_date: undefined, frequency_per_week: safeFreq, _doneToday: false };
      setGoals(prev => [goal, ...prev]);
    } finally {
      setShowForm(false);
    }
  };

  const handleDeleteGoal = (goalId: number) => {
    try { localStorage.removeItem(`goal_done_${goalId}`); } catch { /* ignore */ }
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
    apiService.deleteGoal(goalId).catch(() => {});
  };

  const handleUpdateProgress = (goalId: number) => {
    const today = getToday();
    const target = goals.find(g => g.id === goalId);
    if (!target || target.last_completed_date === today || target._doneToday) return;
    try { localStorage.setItem(`goal_done_${goalId}`, today); } catch { /* ignore */ }
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, last_completed_date: today, _doneToday: true } : g));
    apiService.incrementGoalProgress(goalId).then((updated: Goal & { frequency_per_week?: number; already_completed_today?: boolean; last_completed_date?: string } | null) => {
      if (!updated) return;
      setGoals(prev => prev.map(g => g.id === goalId ? {
        ...g,
        completed: updated.completed ?? g.completed,
        total: updated.frequency_per_week ?? g.total,
        streak: updated.streak ?? g.streak,
        last_completed_date: updated.last_completed_date || today,
        _doneToday: (() => {
          const serverDone = updated.already_completed_today === true || (updated.last_completed_date === today);
          if (serverDone) return true;
          try { return localStorage.getItem(`goal_done_${goalId}`) === today; } catch { return false; }
        })(),
        frequency: `${updated.frequency_per_week ?? g.total} days a week`,
      } : g));
    }).catch(() => {
      try {
        const existing = localStorage.getItem(`goal_done_${goalId}`);
        if (existing === today) localStorage.removeItem(`goal_done_${goalId}`);
      } catch { /* ignore */ }
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, last_completed_date: target.last_completed_date, _doneToday: target.last_completed_date === today } : g));
    });
  };

  if (showForm) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', display: 'grid', placeItems: 'center', color: '#fff' }}><Target size={20} /></div>
          <div>
            <h1 style={{ margin: 0, color: 'var(--text)', fontSize: '1.75rem', fontWeight: '700' }}>Add New Goal</h1>
            <p style={{ margin: 0, color: 'var(--text)', opacity: 0.8, fontSize: '0.95rem' }}>Set a new goal to track your progress</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 480px', minWidth: 280 }}>
            <GoalForm ref={formRef} showInlineSuggestions={false} onSubmit={handleAddGoal} onCancel={() => setShowForm(false)} />
          </div>
          <aside style={{ flex: '0 0 320px', minWidth: 260 }}>
            <div style={{ position: 'sticky', top: 12, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 16, padding: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>Quick suggestions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {suggestions.map(s => (
                  <button key={s.t} type="button" onClick={() => handlePrefill(s.t, s.d)} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{s.t}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.d}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', display: 'grid', placeItems: 'center', color: '#fff' }}><Target size={20} /></div>
          <div>
            <h1 style={{ margin: 0, color: 'var(--text)', fontSize: '1.75rem', fontWeight: '700' }}>Goals</h1>
            <p style={{ margin: 0, color: 'var(--text)', opacity: 0.8, fontSize: '0.95rem' }}>Track your personal goals and build better habits</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card-grid">
          {[1, 2, 3, 4].map((i) => <div key={i}><Skeleton height={180} radius={16} /></div>)}
        </div>
      ) : (
        <GoalsList goals={goals} onDelete={handleDeleteGoal} onUpdateProgress={handleUpdateProgress} onAdd={() => setShowForm(true)} />
      )}
    </div>
  );
};

export default GoalsView;
