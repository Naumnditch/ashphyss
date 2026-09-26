import { afterEach, describe, expect, it } from 'vitest';
import { htmlToText, isBlankHtml, previewOf, sanitizeMessageHtml, textToHtml } from '../html';
import { fillPlaceholders, placeholderValues } from '../placeholders';
import { emailProvider, replyAddress } from '../config';
import { normalizeInbound, replyTokenFrom, stripQuotedReply } from '../inbound';
import { buildRecipientWhere, describeFilters, recipientFiltersSchema } from '../filters';
import { buildEmail, REPLY_MARKER } from '../emailLayout';

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
});

describe('html', () => {
  it('keeps formatting, strips scripts, handlers and javascript: links', () => {
    const out = sanitizeMessageHtml(
      '<p onclick="x()">Hi <strong>there</strong><script>alert(1)</script> <a href="javascript:alert(1)">bad</a> <a href="https://ashphys.org">ok</a></p><img src=x onerror=alert(1)>'
    );
    expect(out).toContain('<strong>there</strong>');
    expect(out).not.toMatch(/script|onclick|onerror|javascript:|<img/);
    expect(out).toContain('href="https://ashphys.org"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('keeps template links that are filled in later', () => {
    expect(sanitizeMessageHtml('<a href="{{site_url}}/pricing">pricing</a>')).toContain('href="{{site_url}}/pricing"');
  });

  it('turns a plain-text reply into escaped paragraphs with links', () => {
    const html = textToHtml('Hello <b>sir</b>\nline two\n\nsee https://ashphys.org/pricing.');
    expect(html).toBe(
      '<p>Hello &lt;b&gt;sir&lt;/b&gt;<br>line two</p><p>see <a href="https://ashphys.org/pricing" target="_blank" rel="noopener noreferrer">https://ashphys.org/pricing</a>.</p>'
    );
  });

  it('flattens HTML to readable text', () => {
    const text = htmlToText('<p>Hi&nbsp;Sam &amp; co,</p><ul><li>one</li><li>two</li></ul><p><a href="https://x.org">site</a></p>');
    expect(text).toBe('Hi Sam & co,\n\n• one\n• two\n\nsite (https://x.org)');
    expect(isBlankHtml('<p><br></p>')).toBe(true);
    expect(previewOf('a'.repeat(200), 20)).toHaveLength(20);
  });
});

describe('placeholders', () => {
  const values = placeholderValues({ firstName: 'Ada', lastName: '<Lovelace>', email: 'ada@x.org', tierName: 'Pro', sectionName: null }, 'https://www.ashphys.org');

  it('fills and escapes per recipient', () => {
    expect(fillPlaceholders('<p>Hi {{ first_name }} {{last_name}}, {{tier}} in {{section}}</p>', values, { html: true })).toBe(
      '<p>Hi Ada &lt;Lovelace&gt;, Pro in your class</p>'
    );
    expect(fillPlaceholders('Welcome {{first_name}} {{unknown}}', values, { html: false })).toBe('Welcome Ada {{unknown}}');
    expect(fillPlaceholders('<a href="{{site_url}}/x">', values, { html: true })).toBe('<a href="https://www.ashphys.org/x">');
  });

  it('greets people with no first name', () => {
    expect(placeholderValues({ firstName: '', lastName: '', email: 'e', tierName: 'Free', sectionName: 'Y11' }, 's').first_name).toBe('there');
  });
});

describe('config', () => {
  it('picks the provider from env vars', () => {
    for (const k of ['EMAIL_PROVIDER', 'RESEND_API_KEY', 'SENDGRID_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) delete process.env[k];
    expect(emailProvider()).toBeNull();
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASS = 'p';
    expect(emailProvider()).toBe('smtp');
    process.env.RESEND_API_KEY = 're_x';
    expect(emailProvider()).toBe('resend');
    process.env.EMAIL_PROVIDER = 'sendgrid';
    expect(emailProvider()).toBeNull();
    process.env.SENDGRID_API_KEY = 'SG.x';
    expect(emailProvider()).toBe('sendgrid');
  });

  it('plus-addresses the reply inbox', () => {
    delete process.env.MAIL_REPLY_TO;
    expect(replyAddress('abc')).toBeNull();
    process.env.MAIL_REPLY_TO = 'AshPhys <messages@reply.ashphys.org>';
    expect(replyAddress('abc')).toBe('messages+abc@reply.ashphys.org');
    process.env.MAIL_REPLY_TO = 'inbox+old@ashphys.org';
    expect(replyAddress('abc')).toBe('inbox+abc@ashphys.org');
  });
});

describe('inbound email', () => {
  const token = '0123456789abcdef0123456789abcdef';

  it('reads SendGrid Inbound Parse fields', () => {
    const e = normalizeInbound({
      from: 'Sam Student <Sam@Example.com>',
      to: `messages+${token}@reply.ashphys.org`,
      envelope: JSON.stringify({ to: [`messages+${token}@reply.ashphys.org`], from: 'sam@example.com' }),
      subject: 'Re: Welcome',
      text: 'Thanks!\n\nOn Mon, 1 Sep 2026 at 10:00, AshPhys <messages@ashphys.org> wrote:\n> Welcome',
    })!;
    expect(e.from).toBe('sam@example.com');
    expect(e.fromName).toBe('Sam Student');
    expect(replyTokenFrom(e.recipients)).toBe(token);
    expect(stripQuotedReply(e.text)).toBe('Thanks!');
  });

  it('reads Postmark and event-envelope JSON', () => {
    const pm = normalizeInbound({ FromFull: { Email: 'a@b.co', Name: 'A' }, ToFull: [{ Email: `x+${token}@y.org` }], Subject: 'Hi', StrippedTextReply: 'Yes please' })!;
    expect(pm.from).toBe('a@b.co');
    expect(pm.text).toBe('Yes please');
    expect(replyTokenFrom(pm.recipients)).toBe(token);

    const ev = normalizeInbound({ type: 'email.received', data: { from: 'a@b.co', to: [`x+${token}@y.org`], subject: 'Hi', html: '<p>Sure</p>' } })!;
    expect(ev.text).toBe('Sure');
    expect(replyTokenFrom(ev.recipients)).toBe(token);
    expect(normalizeInbound({ subject: 'no sender' })).toBeNull();
  });

  it('cuts quoted history in the common client formats', () => {
    expect(stripQuotedReply(`Sounds good\n\n${REPLY_MARKER}\nold`)).toBe('Sounds good');
    expect(stripQuotedReply('Ok\n\nOn Tue, Sep 2, 2026 at 9:15 AM AshPhys <\nmessages@ashphys.org> wrote:\n> hi')).toBe('Ok');
    expect(stripQuotedReply('Fine\n________________________________\nFrom: AshPhys\nSent: today')).toBe('Fine');
    expect(stripQuotedReply('Line one\n> quoted\n>> more')).toBe('Line one');
  });
});

describe('recipient filters', () => {
  it('defaults to active students and never admins', () => {
    const f = recipientFiltersSchema.parse({});
    const { where, params } = buildRecipientWhere(f);
    expect(where).toContain(`u.role <> 'admin'`);
    expect(params).toEqual([['student'], ['active']]);
    expect(describeFilters(f)).toBe('Students');
  });

  it('numbers parameters and combines filters', () => {
    const f = recipientFiltersSchema.parse({
      roles: ['student', 'teacher'],
      tiers: [1, 2],
      sectionIds: ['11111111-1111-1111-1111-111111111111', 'none'],
      enrollment: 'not_enrolled',
      joinedWithinDays: 30,
      subscriptionEndsWithinDays: 7,
      emailOptedInOnly: true,
    });
    const { where, params } = buildRecipientWhere(f, 3);
    expect(params).toHaveLength(6);
    expect(where).toContain('$8');
    expect(where).not.toContain('$9');
    expect(where).toContain('u.section_id IS NULL');
    expect(where).toContain('NOT EXISTS (SELECT 1 FROM course_enrollments');
    expect(describeFilters(f, { '11111111-1111-1111-1111-111111111111': 'Year 11' })).toBe(
      'Students and teachers, on Plus / Pro, in Year 11 / no class, not enrolled in any course, joined in the last 30 days, subscription ending within 7 days, accepting emails'
    );
  });
});

describe('email layout', () => {
  it('carries the unsubscribe link and postal address (CAN-SPAM)', () => {
    process.env.MAIL_POSTAL_ADDRESS = '1 Physics Way, Istanbul, Türkiye';
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.ashphys.org/';
    const { html, text } = buildEmail({
      bodyHtml: '<p>Hello</p>',
      action: { href: 'https://www.ashphys.org/dashboard/messages', label: 'Open' },
      reason: 'You have an account',
      unsubscribeToken: 'tok',
      pixelUrl: null,
    });
    expect(html).toContain('https://www.ashphys.org/unsubscribe?token=tok');
    expect(html).toContain('1 Physics Way, Istanbul, Türkiye');
    expect(text).toContain('Unsubscribe from AshPhys emails: https://www.ashphys.org/unsubscribe?token=tok');
  });
});

describe('mailbox times', async () => {
  const { formatListTime, formatMessageTime, formatDayHeading } = await import('../time');
  const now = new Date(2026, 8, 25, 15, 0).getTime();
  it('shortens by age', () => {
    expect(formatListTime(new Date(2026, 8, 25, 9, 5).toISOString(), now)).toBe('09:05');
    expect(formatListTime(new Date(2026, 8, 24, 23, 0).toISOString(), now)).toBe('Yesterday');
    expect(formatListTime(new Date(2026, 8, 21).toISOString(), now)).toBe('Mon');
    expect(formatListTime(new Date(2026, 7, 2).toISOString(), now)).toBe('2 Aug');
    expect(formatListTime(new Date(2025, 7, 2).toISOString(), now)).toBe('2 Aug 2025');
    expect(formatMessageTime(new Date(2026, 8, 24, 8, 30).toISOString(), now)).toBe('Yesterday 08:30');
    expect(formatDayHeading(new Date(2026, 8, 12).toISOString(), now)).toBe('Saturday, 12 September 2026');
  });
});

describe('email delivery', async () => {
  const { nextRetryAt, MAX_EMAIL_ATTEMPTS } = await import('../retryPolicy');
  const { emailFormatOk, checkEmail } = await import('../validateEmail');
  const { httpFailureIsPermanent, smtpFailureIsPermanent } = await import('../mailer');
  const { summarizeSend } = await import('../sendSummary');
  const { configuredReplyTo } = await import('../config');

  it('backs off, then gives up; permanent failures never retry', () => {
    const t0 = Date.UTC(2026, 8, 26, 12, 0);
    expect(nextRetryAt(1, false, t0)!.getTime() - t0).toBe(2 * 60_000);
    expect(nextRetryAt(2, false, t0)!.getTime() - t0).toBe(10 * 60_000);
    expect(nextRetryAt(6, false, t0)!.getTime() - t0).toBe(1440 * 60_000);
    expect(nextRetryAt(MAX_EMAIL_ATTEMPTS, false, t0)).toBeNull();
    expect(nextRetryAt(1, true, t0)).toBeNull();
  });

  it('classifies provider failures', () => {
    expect([400, 422].map(httpFailureIsPermanent)).toEqual([true, true]);
    expect([401, 403, 408, 429, 500, 503].map(httpFailureIsPermanent).some(Boolean)).toBe(false);
    expect(smtpFailureIsPermanent(550)).toBe(true);
    expect(smtpFailureIsPermanent(535)).toBe(false);
    expect(smtpFailureIsPermanent(421)).toBe(false);
    expect(smtpFailureIsPermanent(undefined)).toBe(false);
  });

  it('validates addresses', async () => {
    for (const ok of ['a@b.co', 'first.last+tag@sub.example.org', "o'neil@example.ie"]) expect(emailFormatOk(ok), ok).toBe(true);
    for (const bad of ['', 'plain', 'a@b', 'a@@b.com', '.a@b.com', 'a..b@c.com', 'a b@c.com', 'a@-b.com', `${'x'.repeat(65)}@b.com`]) expect(emailFormatOk(bad), bad).toBe(false);
    process.env.MAIL_VALIDATE_DNS = 'off';
    expect(await checkEmail('someone@nonexistent-domain-zz9x.com')).toEqual({ ok: true });
    expect((await checkEmail('nope')).ok).toBe(false);
  });

  it('checks the domain can receive mail (live DNS)', async () => {
    delete process.env.MAIL_VALIDATE_DNS;
    expect(await checkEmail('student@gmail.com')).toEqual({ ok: true });
    const bad = await checkEmail('student@no-such-domain-ashphys-zz9x.com');
    expect(bad.ok).toBe(false);
  }, 15_000);

  it('picks the Reply-To', () => {
    delete process.env.MAIL_REPLY_TO;
    delete process.env.MAIL_INBOUND_SECRET;
    expect(configuredReplyTo('t'.repeat(32))).toBeNull();
    process.env.MAIL_REPLY_TO = 'AshPhys <help@ashphys.org>';
    expect(configuredReplyTo('abc')).toEqual({ address: 'help@ashphys.org', synced: false });
    process.env.MAIL_INBOUND_SECRET = 's';
    expect(configuredReplyTo('abc')).toEqual({ address: 'help+abc@ashphys.org', synced: true });
  });

  it('tells the admin when on-site worked but email did not', () => {
    const fmt = () => '14:32';
    expect(summarizeSend({ recipients: 2, emailed: 2, problems: [] }, true, fmt)).toEqual({ tone: 'ok', title: 'Sent to 2 people · 2 emailed' });
    expect(summarizeSend({ recipients: 1, emailed: 0, problems: [{ name: 'Laila', status: 'skipped', error: 'No email provider configured', retryAt: null }] }, true, fmt).tone).toBe('ok');
    const one = summarizeSend({ recipients: 1, emailed: 0, problems: [{ name: 'Laila', status: 'failed', error: 'Resend 503: busy', retryAt: '2026-09-26T14:32:00Z' }] }, true, fmt);
    expect(one).toEqual({ tone: 'warn', title: 'Delivered on AshPhys, but not by email yet', detail: 'Email to Laila failed (Resend 503: busy); retrying automatically at 14:32.' });
    const mixed = summarizeSend(
      {
        recipients: 5,
        emailed: 2,
        problems: [
          { name: 'A', status: 'skipped', error: 'Unsubscribed from emails', retryAt: null },
          { name: 'B', status: 'skipped', error: 'Invalid email address: x.zz can\'t receive email', retryAt: null },
          { name: 'C', status: 'failed', error: 'SendGrid 400: bad (not retried: rejected by the email service)', retryAt: null },
        ],
      },
      true,
      fmt
    );
    expect(mixed.tone).toBe('warn');
    expect(mixed.detail).toBe("Couldn't email 2 people: invalid email address; SendGrid 400: bad.");
  });
});
