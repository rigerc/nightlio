import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { Entry } from '../../types';
import './SearchBar.css';

interface SearchBarProps {
  entries?: Entry[];
  onSearch: (results: Entry[] | null) => void;
  placeholder?: string;
  searchFields?: (keyof Entry)[];
}

export default function SearchBar({
  entries = [],
  onSearch,
  placeholder = 'Search entries...',
  searchFields = ['content', 'date'],
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setIsOpen(false);
      onSearch(null);
      return;
    }

    const queryLower = query.toLowerCase();
    const filtered = entries.filter(entry =>
      searchFields.some(field => {
        const value = entry[field];
        if (!value) return false;
        return String(value).toLowerCase().includes(queryLower);
      })
    );

    setIsOpen(true);
    onSearch(filtered);
  }, [query, entries, searchFields, onSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="search-bar-container" ref={searchRef}>
      <div className="search-bar-input-wrapper">
        <Search size={18} className="search-bar-icon" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          className="search-bar-input"
        />
        {query && (
          <button
            className="search-bar-clear"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>
      {isOpen && <div style={{ display: 'none' }} />}
    </div>
  );
}
