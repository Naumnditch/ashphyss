'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useDropdownEdgeAlign } from './useDropdownEdgeAlign';

export interface NavItem {
  href: string;
  label: string;
  hint?: string;
}

/**
 * Small grouped menu for the navbar. Nine top-level links crowded the header
 * and forced two-line wrapping on the longer labels, so the secondary ones
 * live in these instead — keeping the bar to a handful of items.
 */
export function NavDropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const align = useDropdownEdgeAlign(open, panelRef, 'right');

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-sm hover:underline flex items-center gap-1 whitespace-nowrap"
      >
        {label}
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-56 max-w-[calc(100vw-1rem)] bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 z-50`}
        >
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-gray-50"
            >
              <span className="block text-sm text-gray-900">{it.label}</span>
              {it.hint && <span className="block text-xs text-gray-400 mt-0.5">{it.hint}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
