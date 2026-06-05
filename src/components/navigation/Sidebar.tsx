import { Home, BarChart3, Trophy, Settings, Target } from 'lucide-react';
import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface SidebarProps {
  onLoadStatistics?: () => void;
}

interface NavItem {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
}

const Sidebar = ({ onLoadStatistics }: SidebarProps) => {
  const items: NavItem[] = [
    { key: '/dashboard', label: 'Home', icon: Home, end: true },
    { key: '/dashboard/goals', label: 'Goals', icon: Target },
    { key: '/dashboard/stats', label: 'Statistics', icon: BarChart3 },
    { key: '/dashboard/achievements', label: 'Achievements', icon: Trophy },
  ];

  const location = useLocation();

  useEffect(() => {
    if (location.pathname.includes('stats') && typeof onLoadStatistics === 'function') {
      onLoadStatistics();
    }
  }, [location.pathname, onLoadStatistics]);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150 w-full box-border no-underline',
      isActive
        ? 'bg-gradient-to-br from-[var(--accent-bg)] to-[var(--accent-bg-2)] text-white border-transparent shadow-sm'
        : 'bg-transparent border-transparent text-[var(--text)] opacity-80 hover:bg-[var(--accent-bg-soft)] hover:opacity-100'
    );

  return (
    <aside className="fixed left-0 top-0 w-[280px] h-screen z-50 bg-[color-mix(in_oklab,var(--surface)_60%,var(--bg))] backdrop-blur-xl border-r border-[var(--border)] box-border transition-transform duration-300">
      <div className="flex flex-col gap-1 p-6 h-full overflow-y-auto">
        <div className="flex flex-col gap-3 pb-6 border-b border-[var(--border)] mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] grid place-items-center overflow-hidden">
              <img src="/logo.png" alt="Nightlio" className="w-full h-full object-contain block" />
            </div>
            <strong className="text-[var(--text)] text-2xl font-bold tracking-tight">Nightlio</strong>
          </div>
          <span className="text-[var(--text)] opacity-85 text-sm pl-1">Your daily mood companion.</span>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          {items.map(({ key, label, icon: Icon, end }) => (
            <NavLink key={key} to={key} end={end} className={navItemClass} title={label}>
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--border)] flex flex-col">
          <NavLink to="/dashboard/settings" className={navItemClass} title="Settings">
            <Settings size={18} className="shrink-0" />
            <span>Settings</span>
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
