'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import '@/lib/equation-stage/equation-stage.css';

export interface GlossaryEntry {
  symbol: string;
  name: string;
  unit: string;
  unitName: string;
  description: string;
}

const MARGIN = 10;
const POPUP_WIDTH = 240;

export function GlossaryOverlay({
  entry,
  anchorEl,
  isTarget,
  onClose,
}: {
  entry: GlossaryEntry;
  anchorEl: HTMLElement;
  isTarget: boolean;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; arrowSide: 'left' | 'right'; flipUp: boolean } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const anchorRect = anchorEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const anchorCx = anchorRect.left + anchorRect.width / 2;

      let left = anchorCx - POPUP_WIDTH / 2;
      let arrowSide: 'left' | 'right' = 'left';
      if (left < MARGIN) {
        left = MARGIN;
        arrowSide = 'left';
      } else if (left + POPUP_WIDTH > vw - MARGIN) {
        left = vw - MARGIN - POPUP_WIDTH;
        arrowSide = 'right';
      }

      const popupHeight = popupRef.current?.offsetHeight ?? 150;
      const spaceBelow = vh - anchorRect.bottom;
      const flipUp = spaceBelow < popupHeight + MARGIN + 16 && anchorRect.top > popupHeight + MARGIN + 16;
      const top = flipUp ? anchorRect.top - popupHeight - 12 : anchorRect.bottom + 12;

      setPos({ left, top, arrowSide, flipUp });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchorEl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popupRef.current?.contains(target) || anchorEl.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    // mousedown, not click, so this doesn't fire on the same click that opened it
    window.addEventListener('mousedown', onOutside);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onOutside);
    };
  }, [anchorEl, onClose]);

  return (
    <div className="fixed inset-0 z-[200]" aria-hidden="true">
      <div
        ref={popupRef}
        role="dialog"
        aria-label={`${entry.name} glossary`}
        className="fixed bg-white border border-[#e4ddcc] rounded-xl shadow-lg p-4 animate-[eqGlossPop_150ms_ease-out]"
        style={{
          left: pos?.left ?? -9999,
          top: pos?.top ?? -9999,
          width: POPUP_WIDTH,
          visibility: pos ? 'visible' : 'hidden',
        }}
      >
        {pos && (
          <div
            className="absolute w-3 h-3 bg-white border-[#e4ddcc] rotate-45"
            style={{
              left: pos.arrowSide === 'left' ? 20 : POPUP_WIDTH - 32,
              ...(pos.flipUp
                ? { bottom: -7, borderRight: '1px solid #e4ddcc', borderBottom: '1px solid #e4ddcc' }
                : { top: -7, borderLeft: '1px solid #e4ddcc', borderTop: '1px solid #e4ddcc' }),
            }}
          />
        )}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="italic text-[19px] font-bold text-[#1b2a41]" style={{ fontFamily: 'Georgia, serif' }}>
            {entry.symbol}
          </span>
          <span className="text-[13px] font-semibold text-[#1b2a41]">{entry.name}</span>
        </div>
        <div className="text-[11.5px] font-mono text-[#8f6428] mb-2">
          {entry.unit} <span className="text-[#a8a196]">— {entry.unitName}</span>
        </div>
        <p className="text-[12px] text-[#4a5a72] leading-snug mb-2.5">{entry.description}</p>
        <p className={`text-[11px] leading-snug ${isTarget ? 'text-[#b34a3c] font-semibold' : 'text-[#a8a196] italic'}`}>
          {isTarget
            ? "This is the variable you're currently solving for — it stays highlighted red throughout the derivation."
            : 'Whatever operation moves this quantity gets applied to both sides of the equation at once — the Golden Rule this simulator shows in action.'}
        </p>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2.5 text-gray-400 hover:text-gray-600 text-sm leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
