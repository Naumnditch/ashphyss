import type { Announcement } from './types';

/**
 * Sample feed: this week's real releases, with real links, so the feed is
 * testable and truthful from day one. Replace with rows from the database
 * (or add to this list) as new content ships — the feed only needs the
 * Announcement shape.
 */
export const SAMPLE_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'rearranger-manim',
    type: 'simulation',
    status: 'updated',
    title: 'Equation Rearranger, rebuilt as a lesson film',
    description: 'Watch any formula rearranged step by step in the style of a 3Blue1Brown video — pause, step back, or jump to any step.',
    date: '2026-09-24T09:00:00Z',
    href: '/simulations/equation-rearranger',
  },
  {
    id: 'circular-motion-lab',
    type: 'simulation',
    status: 'new',
    title: 'Circular Motion Lab in 3D',
    description: 'Horizontal circles, vertical loops and the conical pendulum, with every force drawn to scale. Cut the string and see where it goes.',
    date: '2026-09-23T12:00:00Z',
    href: '/simulations/circular-motion',
  },
  {
    id: 'coulomb-lab',
    type: 'simulation',
    status: 'new',
    title: "Coulomb's Law Lab",
    description: 'Drag charges around in 3D, watch the field lines, and add the forces on a charge as vectors.',
    date: '2026-09-23T11:00:00Z',
    href: '/simulations/coulombs-law',
  },
  {
    id: 'hero-film',
    type: 'video',
    title: 'New film: physics, made visible',
    description: 'A 20-second tour of atoms, orbits, waves and fields, every frame computed from the real equations.',
    date: '2026-09-23T08:00:00Z',
    href: '/#film',
  },
  {
    id: 'lesson-circular-motion',
    type: 'lesson',
    title: 'New lesson: 3.7 Circular motion',
    description: 'Speed, centripetal acceleration and force, vertical circles and the conical pendulum — with worked questions.',
    date: '2026-09-22T15:00:00Z',
    href: '/curriculum/a86aff95-adbc-4634-af1f-528e375e2230#topic-db2c98d5-dd86-5faf-9121-5533bdd5d212',
  },
  {
    id: 'practice-gravitation',
    type: 'quiz',
    title: 'Practice questions: gravitation and orbits',
    description: 'Field strength, Newton’s law of gravitation and orbital speed and period, each with a full worked answer.',
    date: '2026-09-22T14:00:00Z',
    href: '/practice/1585a36a-5b5c-5505-abe3-98e37e28c48b',
  },
  {
    id: 'practice-coulomb',
    type: 'quiz',
    title: "More Coulomb's law practice",
    description: 'Net force from three charges in L-shapes and triangles, plus finding an unknown charge or distance.',
    date: '2026-09-22T13:00:00Z',
    href: '/practice/c6c1d1f5-1c6b-4ab4-a15b-beea25426304',
  },
  {
    id: 'practice-skip-map',
    type: 'platform',
    title: 'Skip a question and come back to it',
    description: 'Practice now has a progress map: green for right, red for wrong, grey for skipped. Tap any square to jump there.',
    date: '2026-09-22T10:00:00Z',
    href: '/practice/db2c98d5-dd86-5faf-9121-5533bdd5d212',
  },
  {
    id: 'worksheet-pdfs',
    type: 'platform',
    title: 'Printable worksheets for every practice set',
    description: 'Download any lesson’s questions as a clean PDF with diagrams and space for working.',
    date: '2026-09-22T09:00:00Z',
    href: '/curriculum',
  },
];
