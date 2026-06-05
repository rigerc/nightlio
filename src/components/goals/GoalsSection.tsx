import { useState, useEffect } from 'react';
import { Target, Plus, ArrowRight, Calendar, CheckCircle } from 'lucide-react';
import Skeleton from '../ui/Skeleton';
import { Button } from '../ui/button';
import apiService from '../../services/api';
import AddGoalCard from './AddGoalCard';
import type { Goal } from '../../types';

interface GoalWithExtra extends Goal {
  frequency: string;
  total: number;
  _doneToday: boolean;
}

interface GoalsSectionProps {
  onNavigateToGoals: () => void;
}

const GoalsSection = ({ onNavigateToGoals }: GoalsSectionProps) => {
  const [goals, setGoals] = useState<GoalWithExtra[]>([]);
  const [loading, setLoading] = useState(true);

  const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const data = await apiService.getGoals();
        if (!mounted) return;
        const today = getToday();
        const mapped: GoalWithExtra[] = (data || []).slice(0, 3).map((g: Goal & { frequency_per_week: number; already_completed_today?: boolean; last_completed_date?: string }) => ({
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
      } catch { /* leave empty */ } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleMarkComplete = (goalId: number) => {
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
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, last_completed_date: target.last_completed_date, _doneToday: false } : g));
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'left', padding: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Skeleton height={28} width={120} /><Skeleton height={32} width={100} />
        </div>
        <div className="card-grid">
          {[1, 2, 3].map((i) => <div key={i}><Skeleton height={160} radius={16} /></div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'left', marginTop: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0, paddingLeft: 'calc(var(--space-1) / 2)', paddingTop: 0, paddingBottom: 'calc(var(--space-1) / 2)', color: 'var(--text)', fontWeight: '600' }}>Goals</h2>
        <button
          onClick={onNavigateToGoals}
          style={{ background: 'none', border: 'none', color: 'var(--accent-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: '500', padding: '6px 8px', borderRadius: '6px', transition: 'background-color 0.2s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bg-softer)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        >
          View All<ArrowRight size={14} />
        </button>
      </div>

      {goals.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)' }}>
            <span style={{ color: 'var(--accent-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg-softer)', border: '1px solid var(--border)' }}>
              <Target size={16} strokeWidth={2} />
            </span>
            <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>No goals yet.</p>
          </div>
          <Button onClick={onNavigateToGoals} className="gap-1.5">
            <Plus size={16} />Add First Goal
          </Button>
        </div>
      ) : (
        <div className="card-grid">
          <AddGoalCard onAdd={onNavigateToGoals} />
          {goals.map(goal => (
            <GoalPreviewCard key={goal.id} goal={goal} onMarkComplete={handleMarkComplete} />
          ))}
        </div>
      )}
    </div>
  );
};

const GoalPreviewCard = ({ goal, onMarkComplete }: { goal: GoalWithExtra; onMarkComplete: (id: number) => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const progressPercentage = (goal.completed / goal.total) * 100;
  const isCompletedWeek = goal.completed >= goal.total;
  const isDoneToday = goal._doneToday;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="entry-card"
      style={{ border: isHovered ? '1px solid color-mix(in oklab, var(--accent-600), transparent 55%)' : '1px solid var(--border)', boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)', position: 'relative' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, marginRight: goal.streak > 0 ? '50px' : '0' }}>
          <span style={{ color: 'var(--accent-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg-softer)', border: '1px solid var(--border)' }}>
            <Target size={16} strokeWidth={2} />
          </span>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text)', opacity: 0.8 }}>
            <Calendar size={14} style={{ marginRight: '4px' }} /><span>{goal.frequency}</span>
          </div>
        </div>
        {goal.streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--accent-600)', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: '500', lineHeight: '1' }}>
            🔥 {goal.streak}
          </div>
        )}
      </div>

      <div className="entry-card__title" style={{ marginBottom: goal.description ? '8px' : '16px' }}>{goal.title}</div>
      {goal.description && <div className="entry-card__excerpt" style={{ marginBottom: '16px' }}>{goal.description}</div>}

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text)', opacity: 0.9 }}>
          <span>Progress</span><span>{goal.completed}/{goal.total}</span>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'var(--accent-bg-softer)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPercentage}%`, height: '100%', background: isCompletedWeek ? 'var(--success)' : 'var(--accent-600)', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <button
        onClick={() => { if (!isDoneToday) onMarkComplete(goal.id); }}
        disabled={isDoneToday}
        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none', background: isDoneToday ? 'var(--success)' : 'var(--accent-bg)', color: '#fff', fontSize: '0.85rem', fontWeight: '500', cursor: isDoneToday ? 'default' : 'pointer', opacity: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background-color 0.2s' }}
      >
        <CheckCircle size={14} />{isDoneToday ? 'Completed' : 'Mark as done'}
      </button>
    </div>
  );
};

export default GoalsSection;
