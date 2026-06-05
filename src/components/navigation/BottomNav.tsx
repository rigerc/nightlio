import { Home, BarChart3, Trophy, Settings, Target } from 'lucide-react';
import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface BottomNavProps {
  onLoadStatistics?: () => void;
}

interface NavItem {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
}

const BottomNav = ({ onLoadStatistics }: BottomNavProps) => {
  const items: NavItem[] = [
    { key: '/dashboard', label: 'Home', icon: Home, end: true },
    { key: '/dashboard/goals', label: 'Goals', icon: Target },
    { key: '/dashboard/stats', label: 'Stats', icon: BarChart3 },
    { key: '/dashboard/achievements', label: 'Awards', icon: Trophy },
    { key: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const location = useLocation();

  useEffect(() => {
    if (location.pathname.includes('stats') && typeof onLoadStatistics === 'function') {
      onLoadStatistics();
    }
  }, [location.pathname, onLoadStatistics]);

  return (
    <nav className="fixed left-0 right-0 bottom-0 flex md:hidden justify-around items-end px-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] backdrop-blur-md border-t border-[var(--border)] z-50">
      {items.map(({ key, label, icon: Icon, end }) => (
        <NavLink
          key={key}
          to={key}
          end={end}
          aria-label={label}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 bg-transparent border-none text-[var(--text)] no-underline',
              isActive && 'text-[var(--accent-600)]'
            )
          }
        >
          <Icon size={20} />
          <span className="text-[11px]">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
