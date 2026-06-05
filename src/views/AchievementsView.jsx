import { useState, useEffect } from 'react';
import { Zap, Flame, Crown, BarChart3, Target } from 'lucide-react';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import apiService from '../services/api';

const ICONS = { Zap, Flame, Crown, BarChart3, Target };

const RARITY_STYLES = {
  legendary: { background: 'linear-gradient(135deg, #f59e0b22, #ef444422)', border: '#f59e0b55', badge: '#f59e0b' },
  rare:      { background: 'linear-gradient(135deg, #3b82f622, #8b5cf622)', border: '#3b82f655', badge: '#3b82f6' },
  uncommon:  { background: 'linear-gradient(135deg, #10b98122, #06b6d422)', border: '#10b98155', badge: '#10b981' },
  common:    { background: 'var(--surface)', border: 'var(--border)', badge: 'var(--text-muted)' },
};

const getAllAchievements = () => [
  { achievement_type: 'first_entry',     name: 'First Entry',       description: 'Log your first mood entry',          icon: 'Zap',      rarity: 'common'    },
  { achievement_type: 'week_warrior',    name: 'Week Warrior',      description: 'Maintain a 7-day streak',            icon: 'Flame',    rarity: 'uncommon'  },
  { achievement_type: 'consistency_king',name: 'Consistency King',  description: 'Maintain a 30-day streak',           icon: 'Crown',    rarity: 'rare'      },
  { achievement_type: 'data_lover',      name: 'Data Lover',        description: 'View statistics 10 times',           icon: 'BarChart3',rarity: 'uncommon'  },
  { achievement_type: 'mood_master',     name: 'Mood Master',       description: 'Log 100 total entries',              icon: 'Target',   rarity: 'legendary' },
];

const AchievementCard = ({ achievement, isUnlocked, progressValue, progressMax, onClick }) => {
  const Icon = ICONS[achievement.icon] ?? Zap;
  const style = RARITY_STYLES[achievement.rarity] ?? RARITY_STYLES.common;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        background: style.background,
        border: `1px solid ${style.border}`,
        borderRadius: 16,
        padding: '1.25rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        opacity: isUnlocked ? 1 : 0.65,
        transition: 'box-shadow 0.18s ease, opacity 0.18s ease',
        outline: 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: '50%',
          background: `${style.badge}22`, color: style.badge,
          flexShrink: 0,
        }}>
          <Icon size={22} strokeWidth={1.8} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>{achievement.name}</div>
          <span style={{
            fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: style.badge,
          }}>
            {achievement.rarity}
          </span>
        </div>
        {isUnlocked && (
          <span style={{
            marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600,
            background: '#22c55e22', color: '#16a34a', borderRadius: 999,
            padding: '2px 10px', border: '1px solid #22c55e44', flexShrink: 0,
          }}>
            Unlocked
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {achievement.description}
      </p>
      {!isUnlocked && progressMax > 0 && (
        <ProgressBar value={progressValue ?? 0} max={progressMax} />
      )}
    </div>
  );
};

const AchievementsView = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [progress, setProgress] = useState({});

  useEffect(() => { loadAchievements(); }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const [data, prog] = await Promise.all([
        apiService.getUserAchievements(),
        apiService.getAchievementsProgress(),
      ]);
      setAchievements(data);
      setProgress(prog || {});
    } catch (err) {
      setError('Failed to load achievements');
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading achievements…</div>;
  }

  if (error) {
    return <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--accent-600)' }}>{error}</div>;
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {getAllAchievements().map((achievement) => {
          const unlocked = achievements.find(a => a.achievement_type === achievement.achievement_type);
          const isUnlocked = !!unlocked;
          const p = progress[achievement.achievement_type] ?? null;
          return (
            <AchievementCard
              key={achievement.achievement_type}
              achievement={unlocked || achievement}
              isUnlocked={isUnlocked}
              progressValue={isUnlocked ? undefined : (p ? p.current : 0)}
              progressMax={p ? p.max : 7}
              onClick={() => setActive(unlocked || achievement)}
            />
          );
        })}
      </div>

      <Modal open={!!active} onClose={() => setActive(null)} title={active?.name || 'Achievement'}>
        <p style={{ marginTop: 0 }}>{active?.description}</p>
        {!achievements.find(a => a.achievement_type === active?.achievement_type) && (() => {
          const p = progress[active?.achievement_type] || { current: 0, max: 7 };
          return <ProgressBar value={p.current || 0} max={p.max || 7} label="Progress to unlock" />;
        })()}
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
          Log daily to maintain your streak. Viewing statistics contributes to "Data Lover".
        </div>
      </Modal>
    </div>
  );
};

export default AchievementsView;
