/** One entry in the homepage "What's new" feed. */
export type AnnouncementType = 'lesson' | 'video' | 'simulation' | 'quiz' | 'platform';

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  /** One or two lines; longer text is clamped on the card. */
  description: string;
  /** When it went live, as an ISO date or date-time. */
  date: string;
  /** Where the card leads: the lesson, simulation, video or page. */
  href: string;
  /** Marks a simulation (or anything else) as brand new or improved. */
  status?: 'new' | 'updated';
}

export const ANNOUNCEMENT_TYPES: { type: AnnouncementType; label: string; plural: string }[] = [
  { type: 'lesson', label: 'Lesson', plural: 'Lessons' },
  { type: 'video', label: 'Video', plural: 'Videos' },
  { type: 'simulation', label: 'Simulation', plural: 'Simulations' },
  { type: 'quiz', label: 'Practice', plural: 'Practice & quizzes' },
  { type: 'platform', label: 'Platform', plural: 'Platform' },
];
