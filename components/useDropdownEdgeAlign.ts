'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

export type EdgeAlign = 'left' | 'right';

/**
 * Keeps an absolutely-positioned popover/dropdown panel inside the
 * viewport. Measures the rendered panel after it opens (useLayoutEffect
 * runs before paint, so there's no visible flicker) and flips its anchor
 * edge if it would overflow either side.
 *
 * Shared by every nav dropdown (NavDropdown, CurriculumDropdown, SearchBar)
 * so edge-awareness lives in one place instead of being patched per page.
 */
export function useDropdownEdgeAlign<T extends HTMLElement>(
  open: boolean,
  panelRef: RefObject<T>,
  preferred: EdgeAlign = 'right',
  margin = 8
): EdgeAlign {
  const [align, setAlign] = useState<EdgeAlign>(preferred);

  useLayoutEffect(() => {
    if (!open) {
      setAlign(preferred);
      return;
    }
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.left < margin) setAlign('left');
    else if (rect.right > window.innerWidth - margin) setAlign('right');
    else setAlign(preferred);
  }, [open, preferred, panelRef, margin]);

  return align;
}
