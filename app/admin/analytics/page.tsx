import Link from 'next/link';
import { query } from '@/lib/db/client';
import { AnalyticsChart, type ActivityPoint } from '@/components/admin/AnalyticsChart';

export const dynamic = 'force-dynamic';

const RANGE_OPTIONS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];
const FEED_PAGE_SIZE = 50;
const FEED_MAX_ROWS = 200;

interface Overview {
  dau: number;
  wau: number;
  mau: number;
  logins_today: number;
  signups_period: number;
  downloads_period: number;
  sim_starts_period: number;
}

async function getOverview(from: Date, to: Date): Promise<Overview> {
  const res = await query(
    `SELECT
       (SELECT COUNT(DISTINCT user_id) FROM sessions WHERE last_seen_at > now() - interval '1 day') AS dau,
       (SELECT COUNT(DISTINCT user_id) FROM sessions WHERE last_seen_at > now() - interval '7 days') AS wau,
       (SELECT COUNT(DISTINCT user_id) FROM sessions WHERE last_seen_at > now() - interval '30 days') AS mau,
       (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'login' AND created_at > date_trunc('day', now())) AS logins_today,
       (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'signup' AND created_at BETWEEN $1 AND $2) AS signups_period,
       (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'download' AND created_at BETWEEN $1 AND $2) AS downloads_period,
       (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'simulation_start' AND created_at BETWEEN $1 AND $2) AS sim_starts_period`,
    [from, to]
  );
  const r = res.rows[0];
  return {
    dau: Number(r.dau), wau: Number(r.wau), mau: Number(r.mau),
    logins_today: Number(r.logins_today), signups_period: Number(r.signups_period),
    downloads_period: Number(r.downloads_period), sim_starts_period: Number(r.sim_starts_period),
  };
}

async function getActivityOverTime(from: Date, to: Date): Promise<ActivityPoint[]> {
  const res = await query(
    `SELECT date_trunc('day', created_at)::date AS day,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS active_users,
            COUNT(*) FILTER (WHERE event_type = 'login') AS logins
     FROM analytics_events
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY day ORDER BY day`,
    [from, to]
  );
  return res.rows.map((r: any) => ({ day: r.day, active_users: Number(r.active_users), logins: Number(r.logins) }));
}

async function getTopLessons(from: Date, to: Date, prevFrom: Date) {
  const res = await query(
    `WITH cur AS (
       SELECT entity_id, COUNT(*) AS cnt FROM analytics_events
       WHERE event_type = 'lesson_view' AND entity_type = 'topic' AND created_at BETWEEN $1 AND $2
       GROUP BY entity_id
     ),
     prev AS (
       SELECT entity_id, COUNT(*) AS cnt FROM analytics_events
       WHERE event_type = 'lesson_view' AND entity_type = 'topic' AND created_at BETWEEN $3 AND $1
       GROUP BY entity_id
     )
     SELECT t.id, t.topic_name, ch.chapter_number, ch.title AS chapter_title,
            cur.cnt AS views, COALESCE(prev.cnt, 0) AS prev_views
     FROM cur
     JOIN topics t ON t.id = cur.entity_id
     JOIN chapters ch ON ch.id = t.chapter_id
     LEFT JOIN prev ON prev.entity_id = cur.entity_id
     ORDER BY cur.cnt DESC LIMIT 20`,
    [from, to, prevFrom]
  );
  return res.rows;
}

async function getTopSimulations(from: Date, to: Date) {
  const res = await query(
    `WITH starts AS (
       SELECT entity_id, COUNT(*) AS starts FROM analytics_events
       WHERE event_type = 'simulation_start' AND entity_type = 'simulation' AND created_at BETWEEN $1 AND $2
       GROUP BY entity_id
     ),
     completes AS (
       SELECT entity_id, COUNT(*) AS completes FROM analytics_events
       WHERE event_type = 'simulation_complete' AND entity_type = 'simulation' AND created_at BETWEEN $1 AND $2
       GROUP BY entity_id
     )
     SELECT s.id, s.title, starts.starts, COALESCE(completes.completes, 0) AS completes
     FROM starts
     JOIN simulations s ON s.id = starts.entity_id
     LEFT JOIN completes ON completes.entity_id = starts.entity_id
     ORDER BY starts.starts DESC LIMIT 20`,
    [from, to]
  );
  return res.rows;
}

async function getPracticeEngine(from: Date, to: Date) {
  const res = await query(
    `SELECT t.id, t.topic_name, ch.chapter_number,
            COUNT(*) AS attempts,
            ROUND(100.0 * COUNT(*) FILTER (WHERE ps.is_correct) / NULLIF(COUNT(*), 0), 1) AS pct_correct,
            ROUND(AVG(ps.attempts) FILTER (WHERE ps.is_correct), 2) AS avg_attempts_before_correct
     FROM problem_submissions ps
     JOIN problems p ON p.id = ps.problem_id
     LEFT JOIN topics t ON t.id = p.topic_id
     LEFT JOIN chapters ch ON ch.id = p.chapter_id
     WHERE ps.submitted_at BETWEEN $1 AND $2
     GROUP BY t.id, t.topic_name, ch.chapter_number
     ORDER BY attempts DESC LIMIT 20`,
    [from, to]
  );
  return res.rows;
}

async function getTopDownloads(from: Date, to: Date) {
  const [booklets, papers] = await Promise.all([
    query(
      `SELECT b.id, b.title, d.downloads
       FROM (
         SELECT entity_id, COUNT(*) AS downloads FROM analytics_events
         WHERE event_type = 'download' AND entity_type = 'booklet' AND created_at BETWEEN $1 AND $2
         GROUP BY entity_id
       ) d
       JOIN booklets b ON b.id = d.entity_id
       ORDER BY d.downloads DESC LIMIT 10`,
      [from, to]
    ),
    query(
      `SELECT p.id, p.year, p.session, p.paper_number, p.variant, d.downloads
       FROM (
         SELECT entity_id, COUNT(*) AS downloads FROM analytics_events
         WHERE event_type = 'download' AND entity_type = 'past_paper' AND created_at BETWEEN $1 AND $2
         GROUP BY entity_id
       ) d
       JOIN past_papers p ON p.id = d.entity_id
       ORDER BY d.downloads DESC LIMIT 10`,
      [from, to]
    ),
  ]);
  return { booklets: booklets.rows, papers: papers.rows };
}

async function getRecentActivity(page: number) {
  const offset = Math.min((page - 1) * FEED_PAGE_SIZE, FEED_MAX_ROWS - FEED_PAGE_SIZE);
  const res = await query(
    `SELECT ae.id, ae.event_type, ae.entity_type, ae.path, ae.created_at, u.email,
            COALESCE(t.topic_name, sim.title, bk.title, pp.paper_name) AS entity_name
     FROM analytics_events ae
     LEFT JOIN users u ON u.id = ae.user_id
     LEFT JOIN topics t ON ae.entity_type = 'topic' AND t.id = ae.entity_id
     LEFT JOIN simulations sim ON ae.entity_type = 'simulation' AND sim.id = ae.entity_id
     LEFT JOIN booklets bk ON ae.entity_type = 'booklet' AND bk.id = ae.entity_id
     LEFT JOIN past_papers pp ON ae.entity_type = 'past_paper' AND pp.id = ae.entity_id
     ORDER BY ae.created_at DESC
     LIMIT $1 OFFSET $2`,
    [FEED_PAGE_SIZE, offset]
  );
  return res.rows;
}

async function getDeviceInsight(from: Date, to: Date) {
  const res = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name,
            COUNT(*) FILTER (WHERE s.revoked_at IS NULL AND s.created_at > now() - interval '90 days') AS active_sessions,
            COUNT(*) FILTER (WHERE s.created_at BETWEEN $1 AND $2) AS sessions_in_period
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     GROUP BY u.id, u.email, u.first_name, u.last_name
     HAVING COUNT(*) FILTER (WHERE s.revoked_at IS NULL AND s.created_at > now() - interval '90 days') >= 2
         OR COUNT(*) FILTER (WHERE s.created_at BETWEEN $1 AND $2) >= 3
     ORDER BY sessions_in_period DESC, active_sessions DESC
     LIMIT 20`,
    [from, to]
  );
  return res.rows;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return current > 0 ? <span className="text-green-600 text-xs">new</span> : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-gray-400 text-xs">–</span>;
  return (
    <span className={`text-xs font-medium ${pct > 0 ? 'text-green-600' : 'text-red-500'}`}>
      {pct > 0 ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
}

const paperLabel = (p: any) => `${p.session} ${p.year} P${p.paper_number}V${p.variant}`;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { days?: string; feedPage?: string };
}) {
  const days = [7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const prevFrom = new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
  const feedPage = Math.min(Math.max(parseInt(searchParams.feedPage || '1', 10) || 1, 1), FEED_MAX_ROWS / FEED_PAGE_SIZE);

  const [overview, activity, topLessons, topSims, practice, downloads, recent, deviceInsight] = await Promise.all([
    getOverview(from, to),
    getActivityOverTime(from, to),
    getTopLessons(from, to, prevFrom),
    getTopSimulations(from, to),
    getPracticeEngine(from, to),
    getTopDownloads(from, to),
    getRecentActivity(feedPage),
    getDeviceInsight(from, to),
  ]);

  const rangeHref = (d: number) => `/admin/analytics?days=${d}`;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Analytics</h1>
          <p className="text-gray-500 text-sm">What&rsquo;s actually being used, site-wide.</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {RANGE_OPTIONS.map((r) => (
            <Link
              key={r.days}
              href={rangeHref(r.days)}
              className={`text-sm font-medium px-3 py-1.5 rounded-md whitespace-nowrap ${
                days === r.days ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 1. Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        <StatCard label="Daily active users" value={overview.dau} />
        <StatCard label="Weekly active users" value={overview.wau} />
        <StatCard label="Monthly active users" value={overview.mau} />
        <StatCard label="Logins today" value={overview.logins_today} />
        <StatCard label={`New signups (${days}d)`} value={overview.signups_period} />
        <StatCard label={`Downloads (${days}d)`} value={overview.downloads_period} />
        <StatCard label={`Sim starts (${days}d)`} value={overview.sim_starts_period} />
      </div>

      {/* 2. Activity over time */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Activity over time</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No events recorded yet in this range.</p>
        ) : (
          <AnalyticsChart data={activity} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 3. Most-viewed lessons */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-5 pt-5 pb-3">Most-viewed lessons</h2>
          {topLessons.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 pb-5">No lesson views recorded yet in this range.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {topLessons.map((l: any) => (
                <div key={l.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 truncate">{l.topic_name}</div>
                    <div className="text-xs text-gray-400">Ch. {l.chapter_number} — {l.chapter_title}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TrendArrow current={Number(l.views)} previous={Number(l.prev_views)} />
                    <span className="text-sm font-semibold text-gray-900">{l.views}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Most-used simulations */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-5 pt-5 pb-3">Most-used simulations</h2>
          {topSims.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 pb-5">No simulation starts recorded yet in this range.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {topSims.map((s: any) => (
                <div key={s.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-900 truncate">{s.title}</div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-500">
                    {Number(s.completes) > 0 && (
                      <span>{Math.round((Number(s.completes) / Number(s.starts)) * 100)}% complete</span>
                    )}
                    <span className="text-sm font-semibold text-gray-900">{s.starts}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Practice engine */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-5 pt-5 pb-3">Practice engine</h2>
          {practice.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 pb-5">No practice attempts recorded yet in this range.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {practice.map((p: any) => (
                <div key={p.id ?? p.chapter_number} className="px-5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-900 truncate">{p.topic_name ?? `Chapter ${p.chapter_number}`}</div>
                    <span className="text-sm font-semibold text-gray-900">{p.attempts} attempts</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {p.pct_correct != null ? `${p.pct_correct}% correct` : '—'}
                    {p.avg_attempts_before_correct != null && ` · avg ${p.avg_attempts_before_correct} attempts before correct`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Downloads */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-5 pt-5 pb-3">Downloads</h2>
          {downloads.booklets.length === 0 && downloads.papers.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 pb-5">No downloads recorded yet in this range.</p>
          ) : (
            <div className="px-5 pb-5 space-y-4">
              {downloads.booklets.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Top booklets</div>
                  {downloads.booklets.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-800 truncate">{b.title}</span>
                      <span className="font-semibold text-gray-900 flex-shrink-0 ml-2">{b.downloads}</span>
                    </div>
                  ))}
                </div>
              )}
              {downloads.papers.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Top past papers</div>
                  {downloads.papers.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-800 truncate">{paperLabel(p)}</span>
                      <span className="font-semibold text-gray-900 flex-shrink-0 ml-2">{p.downloads}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 8. Device/session insight */}
      {deviceInsight.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-5 pt-5 pb-1">Accounts near the device limit</h2>
          <p className="text-xs text-gray-400 px-5 pb-3">
            2+ active devices, or 3+ new sessions started in this range — worth a look if a join code or login got shared.
          </p>
          <div className="divide-y divide-gray-100">
            {deviceInsight.map((d: any) => (
              <div key={d.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 truncate">{[d.first_name, d.last_name].filter(Boolean).join(' ') || d.email}</div>
                  <div className="text-xs text-gray-400 truncate">{d.email}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-500">
                  <span className={Number(d.active_sessions) >= 2 ? 'text-amber-600 font-semibold' : ''}>
                    {d.active_sessions} active device{Number(d.active_sessions) === 1 ? '' : 's'}
                  </span>
                  <span>{d.sessions_in_period} new this range</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <Link href="/admin/users" className="text-xs text-blue-600 hover:underline font-medium">
              Manage in Users →
            </Link>
          </div>
        </div>
      )}

      {/* 7. Recent activity feed */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-5 pt-5 pb-3">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 pb-5">No events recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map((e: any) => (
              <div key={e.id} className="px-5 py-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 flex-shrink-0">
                    {e.event_type}
                  </span>
                  <span className="text-gray-700 truncate">
                    {e.email ?? 'anonymous'}
                    {e.entity_name ? ` — ${e.entity_name}` : e.path ? ` — ${e.path}` : ''}
                  </span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Page {feedPage} of {FEED_MAX_ROWS / FEED_PAGE_SIZE}</span>
          <div className="flex gap-2">
            {feedPage > 1 && (
              <Link href={`/admin/analytics?days=${days}&feedPage=${feedPage - 1}`} className="text-xs text-blue-600 hover:underline font-medium">
                ← Newer
              </Link>
            )}
            {feedPage < FEED_MAX_ROWS / FEED_PAGE_SIZE && (
              <Link href={`/admin/analytics?days=${days}&feedPage=${feedPage + 1}`} className="text-xs text-blue-600 hover:underline font-medium">
                Older →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
