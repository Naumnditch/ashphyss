'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CURRICULUM_LIST } from '@/lib/curricula';
import { useDropdownEdgeAlign } from './useDropdownEdgeAlign';

export function CurriculumDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const align = useDropdownEdgeAlign(open, panelRef, 'left');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm hover:underline flex items-center gap-1"
      >
        Curriculum
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
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-72 max-w-[calc(100vw-1rem)] bg-white border border-gray-200 rounded-lg shadow-lg z-50`}
        >
          <Link
            href="/curriculum"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 border-b border-gray-100"
          >
            View Full Curriculum →
          </Link>
          <div className="grid grid-cols-2 gap-1 p-2 border-b border-gray-100">
            {CURRICULUM_LIST.map((c) => (
              <Link
                key={c.id}
                href={`/curriculum?c=${c.id}`}
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded px-2 py-1.5"
              >
                {c.shortName}
                <span className="block font-normal text-[10px] text-gray-400">
                  {c.syllabusCode === 'IB' ? 'SL & HL' : `Cambridge ${c.syllabusCode}`}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
