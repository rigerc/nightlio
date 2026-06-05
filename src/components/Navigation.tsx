import { Home, BarChart3, Trophy } from 'lucide-react';

type View = 'history' | 'stats' | 'achievements';

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLoadStatistics: () => void;
}

const Navigation = ({ currentView, onViewChange, onLoadStatistics }: NavigationProps) => {
  const handleStatsClick = () => {
    onViewChange('stats');
    onLoadStatistics();
  };

  const btnStyle = (view: View): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 1rem',
    background: currentView === view ? 'linear-gradient(135deg, var(--accent-bg), var(--accent-bg-2))' : 'transparent',
    color: currentView === view ? '#fff' : 'var(--text)',
    border: currentView === view ? '1px solid color-mix(in oklab, var(--accent-600), transparent 55%)' : '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'background 180ms ease, color 180ms ease, border-color 180ms ease',
  });

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', marginBottom: '3rem' }}>
      <button onClick={() => onViewChange('history')} style={btnStyle('history')}>
        <Home size={16} /> Home
      </button>
      <button onClick={handleStatsClick} style={btnStyle('stats')}>
        <BarChart3 size={16} /> Stats
      </button>
      <button onClick={() => onViewChange('achievements')} style={btnStyle('achievements')}>
        <Trophy size={16} /> Achievements
      </button>
    </div>
  );
};

export default Navigation;
