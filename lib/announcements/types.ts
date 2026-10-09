/** One entry in the homepage "What's new" feed and hero pill. */

/** What kind of content it is — drives the icon/colour and the filter chips. */
export type AnnouncementCategory = 'lesson' | 'video' | 'simulation' | 'quiz' | 'platform';

/** What happened to it — drives the small "New / Improved / Fix" badge. */
export type UpdateKind = 'new' | 'improved' | 'fix';

export interface Announcement {
  id: string;
  category: AnnouncementCategory;
  /** new | improved | fix. */
  type: UpdateKind;
  title: string;
  /** One or two lines; longer text is clamped on the card. */
  description: string;
  /** When it went live, as an ISO date or date-time. */
  date: string;
  /** Where the card leads: the lesson, simulation, video or page. */
  href: string;
  /**
   * Gate for the pill and feed: an entry with published=false, or a date in
   * the future, is never shown anywhere. Set this to false while drafting
   * an entry ahead of its real ship date.
   */
  published: boolean;
}

export const ANNOUNCEMENT_CATEGORIES: { type: AnnouncementCategory; label: string; plural: string }[] = [
  { type: 'lesson', label: 'Lesson', plural: 'Lessons' },
  { type: 'video', label: 'Video', plural: 'Videos' },
  { type: 'simulation', label: 'Simulation', plural: 'Simulations' },
  { type: 'quiz', label: 'Practice', plural: 'Practice & quizzes' },
  { type: 'platform', label: 'Platform', plural: 'Platform' },
];

export const UPDATE_KIND_LABEL: Record<UpdateKind, string> = {
  new: 'New',
  improved: 'Improved',
  fix: 'Fix',
};
