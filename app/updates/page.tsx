import type { Metadata } from 'next';
import { AnnouncementsFeed } from '@/components/announcements/AnnouncementsFeed';
import { SAMPLE_ANNOUNCEMENTS } from '@/lib/announcements/sampleAnnouncements';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "What's New — AshPhys",
  description: 'Every new lesson, simulation, video, practice set and platform update on AshPhys.',
};

export default function UpdatesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">What&rsquo;s New</h1>
      <p className="text-gray-500 mb-8">Every new lesson, simulation, video, practice set and platform update, newest first.</p>
      <AnnouncementsFeed announcements={SAMPLE_ANNOUNCEMENTS} initialCount={12} step={12} now={Date.now()} />
    </div>
  );
}
