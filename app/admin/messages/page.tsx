import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Mailbox } from '@/components/messages/Mailbox';
import { audienceOptions } from '@/lib/messaging/audience';
import { emailStatusSummary } from '@/lib/messaging/config';
import { listTemplates } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Messages · AshPhys admin' };

// The admin layout already restricts this page to admins.
export default async function AdminMessagesPage() {
  const [templates, audience] = await Promise.all([listTemplates(), audienceOptions()]);
  return (
    <Suspense>
      <Mailbox initialTemplates={templates} audience={audience} email={emailStatusSummary()} />
    </Suspense>
  );
}
