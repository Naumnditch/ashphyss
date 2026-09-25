import type { Metadata } from 'next';
import { UnsubscribeForm } from '@/components/messages/UnsubscribeForm';
import { userByUnsubscribeToken } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Email preferences · AshPhys', robots: { index: false } };

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export default async function UnsubscribePage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? '';
  const user = /^[a-f0-9]{32}$/i.test(token) ? await userByUnsubscribeToken(token) : null;

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">AshPhys</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Email preferences</h1>
        {user ? (
          <UnsubscribeForm token={token} email={maskEmail(user.email)} initiallySubscribed={Boolean(user.email_notifications)} />
        ) : (
          <p className="mt-3 text-gray-600">
            This link isn&apos;t valid any more. If you&apos;re signed in, you can change email settings from your{' '}
            <a href="/dashboard/messages" className="text-blue-700 underline">
              messages page
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
