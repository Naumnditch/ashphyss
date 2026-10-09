'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { SimulationIcon } from './icons/SimulationIcon';
import { useDropdownEdgeAlign } from './useDropdownEdgeAlign';

interface SearchResult {
  type: 'chapter' | 'lesson' | 'simulation';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

function ResultIcon({ type }: { type: SearchResult['type'] }) {
  if (type === 'simulation') return <SimulationIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />;
  if (type === 'chapter') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-gray-400 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20.5V19h16" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-gray-400 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6M9 8h6M5 4h14v16H5z" />
    </svg>
  );
}

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m21 21-3.5-3.5" />
    </svg>
  );
}

export function SearchBar() {
  const [open, setOpen] = useState(false);
  // Below `sm` the input is an icon until tapped — there's no room for a
  // permanent text field next to the hamburger, messages icon and Admin
  // button. At `sm` and up the input is always visible, as before.
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const align = useDropdownEdgeAlign(open, panelRef, 'right');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!q.trim()) setMobileExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [q]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setMobileExpanded(false);
      }
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  const handleChange = (value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setResults(data.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  return (
    <div className="flex items-center" ref={containerRef}>
      {!mobileExpanded && (
        <button
          type="button"
          onClick={() => setMobileExpanded(true)}
          aria-label="Search"
          className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          <SearchGlyph className="h-[18px] w-[18px]" />
        </button>
      )}

      <div className={`relative ${mobileExpanded ? 'flex-1' : 'hidden'} lg:block`}>
        <SearchGlyph className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={q}
          autoFocus={mobileExpanded}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search the site…"
          className={`text-sm border border-gray-300 rounded-full pl-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
            mobileExpanded ? 'w-full pr-9' : 'w-56 pr-3 focus:w-64'
          }`}
        />
        {mobileExpanded && (
          <button
            type="button"
            onClick={() => {
              setMobileExpanded(false);
              setOpen(false);
              setQ('');
              setResults([]);
            }}
            aria-label="Close search"
            className="sm:hidden absolute right-1.5 top-1/2 h-6 w-6 -translate-y-1/2 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}

        {open && q.trim().length >= 2 && (
          <div
            ref={panelRef}
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50`}
          >
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Searching…</div>
            ) : results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No results for &ldquo;{q}&rdquo;</div>
            ) : (
              <ul className="py-1.5">
                {results.map((r) => (
                  <li key={`${r.type}-${r.id}`}>
                    <Link
                      href={r.href}
                      onClick={() => {
                        setOpen(false);
                        setQ('');
                        setMobileExpanded(false);
                      }}
                      className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <span className="mt-0.5">
                        <ResultIcon type={r.type} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm text-gray-900 truncate">{r.title}</span>
                        {r.subtitle && (
                          <span className="block text-xs text-gray-400 truncate">{r.subtitle}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
