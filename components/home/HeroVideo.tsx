'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The homepage film (rendered from video/hero/scene.html). Muted, looping and
 * pausable; it waits for a click when the visitor prefers reduced motion, and
 * stops decoding while it is scrolled out of view.
 */
export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(reduce);
    if (reduce) userPaused.current = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) el.play().catch(() => {});
        else if (!entry.isIntersecting) el.pause();
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) {
      userPaused.current = false;
      el.play().catch(() => {});
    } else {
      userPaused.current = true;
      el.pause();
    }
  };

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#060a13] shadow-2xl shadow-blue-950/20 ring-1 ring-black/5">
      <video
        ref={video}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
        poster="/video/ashphys-hero-poster.jpg"
        aria-label="AshPhys — physics, made visible: an animation of an atom, an orbit, a wave and an electric field"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src="/video/ashphys-hero.webm" type="video/webm" />
        <source src="/video/ashphys-hero.mp4" type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause the animation' : 'Play the animation'}
        className={`absolute flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm ring-1 ring-white/20 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
          !playing && reducedMotion ? 'inset-0 m-auto h-16 w-16' : 'bottom-3 right-3 h-9 w-9'
        }`}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className={!playing && reducedMotion ? 'h-7 w-7' : 'h-4 w-4'} fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
