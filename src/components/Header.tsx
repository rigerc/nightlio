import { useCallback, useEffect, useState } from 'react';
import { Flame, LogOut, Sun, Moon } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBurner } from '../contexts/BurnerContext';
import { useToast } from './ui/ToastProvider';
import { cn } from '../lib/utils';

import SearchBar from './search/SearchBar';
import type { Entry } from '../types';

const resolveShortcutElement = (target: EventTarget | null): Element | null => {
  if (!target || typeof target !== 'object') return null;
  if (target instanceof Node) {
    if (target.nodeType === Node.TEXT_NODE) return (target as Text).parentElement || null;
    if (target instanceof Element) return target;
  }
  return null;
};

const shouldSkipShortcut = (target: EventTarget | null): boolean => {
  const element = resolveShortcutElement(target);
  if (!element) return false;
  if (/^(INPUT|TEXTAREA|SELECT)$/i.test(element.tagName || '')) return true;
  if ((element as HTMLElement).isContentEditable) return true;
  if (element.closest('[contenteditable="true"]')) return true;
  const mdx = element.closest('.mdx-editor');
  if (mdx) {
    const editable = mdx.querySelector('[data-lexical-editor], [contenteditable="true"]');
    if (editable && editable.contains(element)) return true;
  }
  return false;
};

interface HeaderProps {
  currentStreak: number;
  pastEntries: Entry[];
  onSearch: (results: Entry[] | null) => void;
  showSearch?: boolean;
}

const Header = ({ currentStreak, pastEntries, onSearch, showSearch = true }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { theme, cycle } = useTheme();
  const { isBurnerMode, toggleBurnerMode } = useBurner();
  const { show } = useToast();
  const [showAvatar, setShowAvatar] = useState(true);

  const handleSearchShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (!showSearch) return;
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (shouldSkipShortcut(event.target)) return;
      event.preventDefault();
      const input = document.getElementById('global-search-input');
      if (input) {
        input.focus();
        show('Search focused', 'info', 1500);
      }
    },
    [show, showSearch]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, [handleSearchShortcut]);

  const iconBtnBase =
    'inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full border border-[var(--border)] bg-transparent text-[var(--text)] text-xs cursor-pointer transition-all duration-200 hover:bg-[var(--accent-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)]';

  return (
    <header className="sticky top-0 z-40 bg-[color-mix(in_oklab,var(--surface)_62%,transparent)] border-b border-[color-mix(in_oklab,var(--border)_45%,transparent)] backdrop-blur-[18px] px-6 py-4 transition-all duration-200 [html[data-theme=dark]_&]:shadow-[0_20px_42px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 order-1">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5 bg-gradient-to-br from-[var(--accent-bg)] to-[var(--accent-bg-2)] text-white px-3 py-1.5 rounded-full border border-[var(--border)] text-[0.85rem] font-semibold shadow-sm whitespace-nowrap">
              <Flame size={14} strokeWidth={2} />
              <span>{currentStreak} Day Streak</span>
            </div>
          )}
        </div>

        {showSearch && (
          <div className="flex-1 flex justify-center order-3 md:order-2 w-full md:w-auto">
            <div className="w-full max-w-[600px]">
              <SearchBar
                entries={pastEntries}
                onSearch={onSearch}
                placeholder="Search..."
                searchFields={['content', 'date']}
              />
            </div>
          </div>
        )}

        {user && (
          <div className="flex items-center gap-3 order-2 md:order-3">
            <button type="button" onClick={cycle} className={iconBtnBase} title={`Theme: ${theme}`} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
            </button>

            <button
              type="button"
              onClick={toggleBurnerMode}
              className={cn(iconBtnBase, isBurnerMode && 'bg-[color-mix(in_oklab,var(--accent-bg)_18%,transparent)] border-[color-mix(in_oklab,var(--accent-600)_55%,var(--border))]')}
              title={`Burner mode: ${isBurnerMode ? 'on' : 'off'}`}
              aria-label="Toggle burner mode"
              aria-pressed={isBurnerMode}
            >
              <Flame size={14} strokeWidth={2} />
            </button>

            <div className="flex items-center gap-2 text-[var(--text)]">
              {user.avatar_url && showAvatar && (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border-2 border-[var(--accent-600)] object-cover"
                  onError={() => setShowAvatar(false)}
                />
              )}
              <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
            </div>

            <button type="button" onClick={logout} className={iconBtnBase} aria-label="Log out">
              <LogOut size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
