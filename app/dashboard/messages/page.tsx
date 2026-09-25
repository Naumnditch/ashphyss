import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { StudentInbox } from '@/components/messages/StudentInbox';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Messages · AshPhys' };

export default async function MessagesPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  // Admins manage every conversation from the admin mailbox.
  if (user.role === 'admin') redirect(`/admin/messages${searchParams.s ? `?s=${encodeURIComponent(searchParams.s)}` : ''}`);

  const res = await query(`SELECT email_notifications FROM users WHERE id = $1`, [user.id]);
  return <StudentInbox firstName={user.firstName} initialEmailNotifications={Boolean(res.rows[0]?.email_notifications ?? true)} />;
}
