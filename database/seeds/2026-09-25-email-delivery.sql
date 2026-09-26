-- Email delivery tracking and automatic retries for mailbox messages.
-- Applied to production with the Supabase MCP as migration "messaging_email_delivery".
--
-- email_status: 'pending' (being sent; email_next_attempt_at is the lease),
-- 'sent', 'failed' (email_next_attempt_at set = retry scheduled, null = gave up),
-- 'skipped' (unsubscribed, invalid address, or no provider), 'none' (inbound).
ALTER TABLE messages ADD COLUMN IF NOT EXISTS email_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS email_last_attempt_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS email_next_attempt_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS email_provider_id text;
CREATE INDEX IF NOT EXISTS messages_email_retry_idx ON messages (email_next_attempt_at)
  WHERE direction = 'outbound' AND email_status IN ('failed', 'pending') AND email_next_attempt_at IS NOT NULL;

-- Automatic retries (applied as migration "messaging_email_retry_cron"): every 5 minutes,
-- if any email is due, call the app's retry endpoint. The bearer token is CRON_SECRET in
-- Vercel, stored here in Supabase Vault (the real value is not kept in this file).
-- CREATE EXTENSION IF NOT EXISTS pg_net;
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT vault.create_secret('<CRON_SECRET>', 'email_retry_cron_secret', '...');
-- SELECT cron.schedule('ashphys-email-retry', '*/5 * * * *', $job$
--   SELECT net.http_get(
--     url := 'https://www.ashphys.org/api/cron/email-retry',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_retry_cron_secret')),
--     timeout_milliseconds := 55000)
--   WHERE EXISTS (SELECT 1 FROM public.messages WHERE direction = 'outbound'
--                 AND email_status IN ('failed', 'pending') AND email_next_attempt_at <= now());
-- $job$);
