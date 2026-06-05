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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      onSearch(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const queryLower = query.toLowerCase();
      const filtered = entries.filter(entry =>
        searchFields.some(field => {
          const value = entry[field];
          if (!value) return false;
          return String(value).toLowerCase().includes(queryLower);
        })
      );
      onSearch(filtered);
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, entries, searchFields, onSearch]);

  return (
    <div className="search-bar-container">
      <div className="search-bar-input-wrapper">
        <Search size={18} className="search-bar-icon" />
        <input
          id="global-search-input"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-bar-input"
          aria-label="Search journal entries"
        />
        {query && (
          <button
            className="search-bar-clear"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
