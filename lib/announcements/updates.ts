import type { Announcement } from './types';

/**
 * The single source of truth for "what's new": the hero pill, the homepage
 * feed and /updates all read from this list (via getVisibleUpdates — see
 * format.ts) and nothing else. There is no separate "sample" data anymore.
 *
 * Add a new entry when something ships: one object below with a real date
 * (the day it actually went live) and an href to the real page a visitor
 * lands on. Leave `published: false` while something is still being
 * finished, and flip it to `true` the day it ships — getVisibleUpdates()
 * hides anything unpublished or future-dated everywhere automatically, so
 * nothing needs to be deleted or moved by hand. See the "Updates feed" note
 * in PROJECT_STATUS.md for the full how-to.
 */
export const UPDATES: Announcement[] = [
  {
    id: 'as-kinematics-banks',
    category: 'quiz',
    type: 'new',
    title: '440 new AS Level Kinematics questions',
    description: 'A fresh, tier-ordered 20-question bank for every lesson in Chapters 1–2 (Kinematics and Accelerated motion), most with a worked figure.',
    date: '2026-10-09',
    href: '/curriculum?c=as',
    published: true,
  },
  {
    id: 'help-cta',
    category: 'platform',
    type: 'new',
    title: "A site-wide “Need help?” button",
    description: 'Request a video walkthrough of any question, or book a 1-on-1 tutoring session, from wherever you are on the site.',
    date: '2026-10-06',
    href: '/video-requests',
    published: true,
  },
  {
    id: 'receipt-upload-fix',
    category: 'platform',
    type: 'fix',
    title: 'Fixed a crash on the receipt upload page',
    description: 'Uploading a payment receipt no longer fails when the paid-courses table is unavailable.',
    date: '2026-10-06',
    href: '/subscribe/verify',
    published: true,
  },
  {
    id: 'circular-gravitation-challenge',
    category: 'quiz',
    type: 'improved',
    title: 'Circular motion & gravitation: 10 new challenge questions',
    description: 'Harder, exam-style questions added to the circular motion and gravitation lessons, IGCSE and A Level alike.',
    date: '2026-10-06',
    href: '/curriculum?c=igcse',
    published: true,
  },
  {
    id: 'rearranger-cross-multiply',
    category: 'simulation',
    type: 'improved',
    title: 'Equation Rearranger: a cross-multiplication shortcut',
    description: "When a variable is in a denominator, watch it swap straight across the equals sign instead of three separate moves.",
    date: '2026-10-01',
    href: '/simulations/equation-rearranger',
    published: true,
  },
  {
    id: 'a-level-circular-gravitation',
    category: 'quiz',
    type: 'new',
    title: '99 new A Level practice questions',
    description: 'Circular motion and gravitation, units 12–13, with 46 original worked figures from real worksheet problems.',
    date: '2026-09-30',
    href: '/curriculum?c=a-level',
    published: true,
  },
  {
    id: 'multi-curriculum-launch',
    category: 'platform',
    type: 'new',
    title: 'AS, A Level and IB join IGCSE on AshPhys',
    description: 'Four curricula, side by side, on one platform — pick yours and every lesson, lab and practice set follows.',
    date: '2026-09-29',
    href: '/curriculum',
    published: true,
  },
  {
    id: 'interactive-solutions',
    category: 'lesson',
    type: 'improved',
    title: 'Interactive, worked solutions inside practice',
    description: 'Stuck on a question? An optional step-by-step animated solution can now open right where you are, no separate catalog to search.',
    date: '2026-09-27',
    href: '/curriculum',
    published: true,
  },
];
