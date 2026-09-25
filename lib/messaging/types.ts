/** Shapes the messaging API returns (shared by the routes and the mailbox UI). */

export type MessageDirection = 'outbound' | 'inbound';
export type EmailStatus = 'none' | 'pending' | 'sent' | 'failed' | 'skipped';

export interface MessageDTO {
  id: string;
  threadId: string;
  direction: MessageDirection;
  channel: 'web' | 'email';
  subject: string | null;
  body: string;
  senderName: string | null;
  createdAt: string;
  readAt: string | null;
  emailStatus: EmailStatus;
  emailError: string | null;
  emailOpenedAt: string | null;
  bulk: boolean;
}

export interface SubscriberDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher';
  status: string;
  tier: number;
  tierName: string;
  sectionId: string | null;
  sectionName: string | null;
  emailNotifications: boolean;
  joinedAt: string;
}

export interface ThreadSummaryDTO {
  threadId: string;
  subscriber: Pick<SubscriberDTO, 'id' | 'firstName' | 'lastName' | 'email' | 'tierName' | 'role'>;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastDirection: MessageDirection | null;
  unread: number;
  messageCount: number;
  hasDraft: boolean;
}

export interface TemplateDTO {
  id: string;
  slug: string | null;
  name: string;
  category: string;
  subject: string;
  body: string;
}

export interface DraftDTO {
  id: string;
  kind: 'compose' | 'bulk' | 'reply';
  subscriberId: string | null;
  recipients: { id: string; name: string; email: string }[];
  filters: Record<string, unknown>;
  subject: string;
  body: string;
  updatedAt: string;
}

export interface BulkSendDTO {
  id: string;
  subject: string;
  filtersLabel: string;
  recipientCount: number;
  emailedCount: number;
  createdAt: string;
}

export type InboxFilter = 'all' | 'unread' | 'received' | 'sent';
