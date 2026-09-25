-- Messaging / mailbox: one conversation per subscriber with the AshPhys team,
-- delivered on-site and (when an email provider is configured) by email.
-- Applied to production with the Supabase MCP as migration "messaging_mailbox".

-- Email preferences on the subscriber (users) record.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS unsubscribe_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');
ALTER TABLE users ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS users_unsubscribe_token_key ON users (unsubscribe_token);

-- One thread per subscriber. reply_token is embedded in the Reply-To address
-- (inbox+<token>@domain) so an emailed reply finds its way back here.
CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reply_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  last_direction text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS message_threads_last_message_at_idx ON message_threads (last_message_at DESC);

CREATE TABLE IF NOT EXISTS bulk_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  template_id uuid,
  recipient_count integer NOT NULL DEFAULT 0,
  emailed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- direction: 'outbound' = team → subscriber, 'inbound' = subscriber → team.
-- channel: where it was written ('web' or 'email').
-- read_at: when the recipient read it on-site (or an admin opened an inbound one).
-- email_status: 'pending' | 'sent' | 'failed' | 'skipped' (no provider / opted out) | 'none' (inbound).
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES users(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  channel text NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'email')),
  subject text,
  body text NOT NULL,
  body_text text NOT NULL DEFAULT '',
  bulk_send_id uuid REFERENCES bulk_sends(id) ON DELETE SET NULL,
  email_status text NOT NULL DEFAULT 'none',
  email_error text,
  email_opened_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_thread_created_idx ON messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS messages_unread_inbound_idx ON messages (thread_id) WHERE direction = 'inbound' AND read_at IS NULL;
CREATE INDEX IF NOT EXISTS messages_unread_recipient_idx ON messages (recipient_id) WHERE read_at IS NULL;

-- Autosaved drafts. kind: 'compose' (to chosen people), 'bulk' (to a filter), 'reply' (in a thread).
CREATE TABLE IF NOT EXISTS message_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('compose', 'bulk', 'reply')),
  subscriber_id uuid REFERENCES users(id) ON DELETE CASCADE,
  recipient_ids uuid[] NOT NULL DEFAULT '{}',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS message_drafts_reply_key ON message_drafts (admin_id, subscriber_id) WHERE kind = 'reply';

CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The app talks to Postgres directly (lib/db/client.ts); keep these tables
-- closed to the public Supabase API.
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_sends ENABLE ROW LEVEL SECURITY;

-- Starter templates. Placeholders: {{first_name}} {{last_name}} {{full_name}}
-- {{email}} {{tier}} {{section}} {{site_url}}
INSERT INTO message_templates (slug, name, category, subject, body) VALUES
('welcome', 'Welcome to AshPhys', 'onboarding', 'Welcome to AshPhys, {{first_name}}!',
 '<p>Hi {{first_name}},</p><p>Welcome to AshPhys! Your account is ready, and everything you need is one click away:</p><ul><li><a href="{{site_url}}/curriculum">The full curriculum</a>, chapter by chapter</li><li><a href="{{site_url}}/past-papers">Past papers</a> with video walkthroughs</li><li>Interactive simulations inside every lesson</li></ul><p>If you have any question at all, just reply to this message.</p><p>Best,<br>The AshPhys team</p>'),
('enrollment-confirmation', 'Enrollment confirmation', 'enrollment', 'You''re enrolled: AshPhys {{tier}}',
 '<p>Hi {{first_name}},</p><p>This confirms your enrollment on <strong>AshPhys {{tier}}</strong>. Your access is active now, so you can start straight away from your <a href="{{site_url}}/dashboard">dashboard</a>.</p><p>Here is a good place to begin: pick your current chapter in the <a href="{{site_url}}/curriculum">curriculum</a> and try the practice questions at the end of each lesson.</p><p>Welcome aboard,<br>The AshPhys team</p>'),
('course-reminder', 'Course reminder', 'reminder', 'A quick reminder about your physics course',
 '<p>Hi {{first_name}},</p><p>Just a friendly reminder to keep your momentum going this week. Twenty focused minutes a day makes a real difference before exams.</p><p>Pick up where you left off in the <a href="{{site_url}}/curriculum">curriculum</a>, or test yourself with a <a href="{{site_url}}/past-papers">past paper</a>.</p><p>You''ve got this,<br>The AshPhys team</p>'),
('payment-received', 'Payment received', 'billing', 'Payment received: thank you, {{first_name}}',
 '<p>Hi {{first_name}},</p><p>We''ve received your payment and your <strong>{{tier}}</strong> access is active. You don''t need to do anything else.</p><p>If anything looks wrong, reply to this message and we''ll sort it out.</p><p>Thank you,<br>The AshPhys team</p>'),
('renewal-reminder', 'Subscription renewal reminder', 'billing', 'Your AshPhys subscription is ending soon',
 '<p>Hi {{first_name}},</p><p>Your <strong>{{tier}}</strong> subscription is ending soon. To keep your access to every lesson, simulation and past-paper walkthrough, you can renew from the <a href="{{site_url}}/pricing">pricing page</a>.</p><p>Thanks for learning with us,<br>The AshPhys team</p>'),
('video-solution-ready', 'Video solution ready', 'requests', 'Your video solution is ready',
 '<p>Hi {{first_name}},</p><p>Good news: the video solution you asked for is ready. You can watch it from your <a href="{{site_url}}/video-requests">video requests</a> page.</p><p>Best,<br>The AshPhys team</p>'),
('tutoring-scheduled', 'Tutoring session scheduled', 'requests', 'Your 1-on-1 tutoring session is booked',
 '<p>Hi {{first_name}},</p><p>Your 1-on-1 tutoring session is confirmed. You''ll find the date, time and meeting link on your <a href="{{site_url}}/tutoring">tutoring page</a>.</p><p>Bring any questions you''d like to go through. See you there!</p><p>The AshPhys team</p>'),
('exam-prep', 'Exam preparation tips', 'reminder', 'Exam season: how to get the most out of AshPhys',
 '<p>Hi {{first_name}},</p><p>Exams are coming up, so here is a simple plan for the next few weeks:</p><ol><li>Do one timed <a href="{{site_url}}/past-papers">past paper</a> a week and mark it honestly.</li><li>For every mistake, rewatch that question''s walkthrough.</li><li>Revisit the lessons behind your weakest topics and redo their practice questions.</li></ol><p>Reply any time if you''re stuck on something.</p><p>Good luck,<br>The AshPhys team</p>')
ON CONFLICT (slug) DO NOTHING;
