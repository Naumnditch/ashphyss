/**
 * The analytics half of /admin/students/[id]: question outcomes, time on the
 * site, strengths and weak points, and the questions a student keeps missing.
 * Server component; every chart has a "Show as a table" view and a native
 * hover title per mark.
 */

import type { StudentAnalytics } from '@/lib/admin/studentAnalytics';
import type { StudentStats } from '@/lib/admin/students';
import {
  ACTIVE_GAP_MINUTES,
  MIN_CHAPTER_ATTEMPTS,
  formatMinutes,
  formatPercent,
  rankByAccuracy,
} from '@/lib/admin/studentHistory';
import { LocalTime } from '@/components/admin/LocalTime';

const RIGHT = 'var(--viz-1)';
const WRONG = 'var(--viz-2)';

const DIFFICULTY: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Challenging', 5: 'Extension' };

export function Card({ id, title, children, aside }: { id?: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section id={id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 mb-6 scroll-mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, sub, swatch }: { label: string; value: React.ReactNode; sub?: React.ReactNode; swatch?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-3.5 py-3 min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {swatch && <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: swatch }} aria-hidden />}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-lg sm:text-xl font-semibold text-gray-900 tabular-nums truncate">{value}</div>
      {sub && <div className="text-xs text-gray-500 leading-snug">{sub}</div>}
    </div>
  );
}

function TableToggle({ children }: { children: React.ReactNode }) {
  return (
    <details className="mt-2 text-xs text-gray-500">
      <summary className="cursor-pointer select-none">Show as a table</summary>
      <div className="overflow-x-auto mt-2">{children}</div>
    </details>
  );
}

/** One accuracy meter: label, "73% · 22/30", and a thin bar. */
function AccuracyBar({ label, correct, attempted }: { label: string; correct: number; attempted: number }) {
  const pct = attempted ? (correct / attempted) * 100 : 0;
  return (
    <li className="text-sm" title={`${label}: ${correct} of ${attempted} answers right`}>
      <div className="flex justify-between gap-3">
        <span className="text-gray-700 truncate">{label}</span>
        <span className="text-gray-500 tabular-nums shrink-0">
          {formatPercent(correct, attempted)} · {correct}/{attempted}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: RIGHT }} />
      </div>
    </li>
  );
}

export function StudentAnalyticsPanel({
  analytics,
  stats,
  lastLoginAt,
  lastActiveAt,
}: {
  analytics: StudentAnalytics;
  stats: StudentStats;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
}) {
  const { outcomes: o, usage: u } = analytics;
  const total = o.right + o.wrong + o.skipped + o.notReached;
  const segments = [
    { key: 'right', label: 'Right', value: o.right, color: RIGHT },
    { key: 'wrong', label: 'Wrong', value: o.wrong, color: WRONG },
    { key: 'skipped', label: 'Skipped', value: o.skipped, color: 'rgb(var(--gray-400))' },
    { key: 'notReached', label: 'Not reached', value: o.notReached, color: 'rgb(var(--gray-200))' },
  ];

  const topicRank = rankByAccuracy(analytics.topics);
  const chapterRank = rankByAccuracy(stats.chapters);
  const reasons = [
    { label: 'Wrong value', value: o.wrongReasons.wrongValue },
    { label: 'Right number, wrong unit', value: o.wrongReasons.wrongUnit },
    { label: 'Answer could not be read', value: o.wrongReasons.unparseable },
    { label: 'Other (wrong option, etc.)', value: o.wrongReasons.other },
  ].filter((r) => r.value > 0);
  const wrongSubs = o.submissions - o.correctSubmissions;

  const maxWeekMinutes = Math.max(1, ...stats.weekly.map((w) => w.activeMinutes));
  const maxWeekAnswers = Math.max(1, ...analytics.weeklyAnswers.map((w) => w.correct + w.incorrect));

  return (
    <>
      {/* Questions */}
      <Card id="questions" title="Questions">
        {total > 0 ? (
          <>
            <div className="flex h-3 w-full gap-[2px] rounded-full overflow-hidden" role="img" aria-label="Question outcomes">
              {segments
                .filter((s) => s.value > 0)
                .map((s) => (
                  <div
                    key={s.key}
                    title={`${s.label}: ${s.value} (${formatPercent(s.value, total)})`}
                    style={{ flexGrow: s.value, background: s.color }}
                  />
                ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2 mb-4 text-xs text-gray-600">
              {segments.map((s) => (
                <li key={s.key} className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
                  {s.label} <span className="tabular-nums text-gray-900 font-medium">{s.value}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-gray-400 mb-4">No practice yet.</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Tile label="Answered" value={o.answered} sub={o.inStartedLessons ? `of ${o.inStartedLessons} in lessons started` : 'questions'} />
          <Tile label="Right" swatch={RIGHT} value={o.right} sub={`${formatPercent(o.right, o.answered)} of answered`} />
          <Tile label="Wrong" swatch={WRONG} value={o.wrong} sub="latest answer still wrong" />
          <Tile label="Skipped" value={o.skipped} sub="skipped, not answered since" />
          <Tile label="Not reached" value={o.notReached} sub="in lessons started" />
          <Tile label="First-try right" value={formatPercent(o.firstTryRight, o.answered)} sub={`${o.firstTryRight} of ${o.answered} questions`} />
          <Tile
            label="Answer accuracy"
            value={formatPercent(o.correctSubmissions, o.submissions)}
            sub={`${o.submissions} answers incl. retries`}
          />
          <Tile
            label="Time per answer"
            value={o.medianTimeMs === null ? '—' : formatMinutes(o.medianTimeMs / 60000)}
            sub="median"
          />
          <Tile label="Hints used" value={o.hintsUsed} sub={`on ${formatPercent(o.hintsUsed, o.submissions)} of answers`} />
          <Tile label="Lessons mastered" value={analytics.topicsMastered} sub={`best streak ${analytics.bestStreak}`} />
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Right/wrong is by the latest answer to each question. Skips are recorded from 17 Oct 2026 (before that they
          were only kept in the student’s browser). “Not reached” counts questions in the lessons they have opened in
          practice that they have neither answered nor skipped.
        </p>
      </Card>

      {/* Time & activity */}
      <Card id="activity" title="Time & activity">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          <Tile label="Last login" value={<LocalTime value={lastLoginAt} format="date" />} sub={lastLoginAt ? <LocalTime value={lastLoginAt} format="time" /> : 'none recorded'} />
          <Tile label="Last active" value={<LocalTime value={lastActiveAt} format="date" />} sub={lastActiveAt ? <LocalTime value={lastActiveAt} format="time" /> : '—'} />
          <Tile label="Time on site" value={formatMinutes(u.totalActiveMinutes)} sub={u.firstActivityAt ? <>since <LocalTime value={u.firstActivityAt} format="date" /></> : 'all time'} />
          <Tile label="Last 7 days" value={formatMinutes(u.activeMinutes7d)} sub={`${formatMinutes(u.activeMinutes30d)} in 30 days`} />
          <Tile label="Active days" value={u.activeDays30d} sub={`in 30 days · ${u.activeDays} in total`} />
          <Tile label="Logins" value={u.logins30d} sub="last 30 days" />
          <Tile label="Practice sessions" value={u.practiceSessions} />
          <Tile label="Lessons opened" value={u.lessonsOpened} sub={`${u.simulationsStarted} simulations started`} />
          <Tile label="Solutions opened" value={u.solutionsOpened} sub={`${u.downloads} downloads`} />
          <Tile label="Video requests" value={u.videoRequests} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Time on site per week</h3>
            <WeekBars
              weeks={stats.weekly.map((w) => ({ week: w.week, parts: [{ value: w.activeMinutes, color: RIGHT, label: formatMinutes(w.activeMinutes) }] }))}
              max={maxWeekMinutes}
              label="Estimated minutes on the site per week"
            />
            <TableToggle>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-400">
                    <th className="py-1 pr-3 font-medium">Week of</th>
                    <th className="py-1 pr-3 font-medium text-right">On site</th>
                    <th className="py-1 font-medium text-right">Answering</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.weekly.map((w) => (
                    <tr key={w.week} className="border-t border-gray-100">
                      <td className="py-1 pr-3">{w.week}</td>
                      <td className="py-1 pr-3 text-right tabular-nums">{formatMinutes(w.activeMinutes)}</td>
                      <td className="py-1 text-right tabular-nums">{formatMinutes(w.practiceMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableToggle>
          </div>
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <h3 className="text-sm font-medium text-gray-900">Answers per week</h3>
              <span className="flex gap-3 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: RIGHT }} aria-hidden /> Right
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: WRONG }} aria-hidden /> Wrong
                </span>
              </span>
            </div>
            <WeekBars
              weeks={analytics.weeklyAnswers.map((w) => ({
                week: w.week,
                parts: [
                  { value: w.incorrect, color: WRONG, label: `${w.incorrect} wrong` },
                  { value: w.correct, color: RIGHT, label: `${w.correct} right` },
                ],
              }))}
              max={maxWeekAnswers}
              label="Right and wrong answers per week"
            />
            <TableToggle>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-400">
                    <th className="py-1 pr-3 font-medium">Week of</th>
                    <th className="py-1 pr-3 font-medium text-right">Right</th>
                    <th className="py-1 pr-3 font-medium text-right">Wrong</th>
                    <th className="py-1 font-medium text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.weeklyAnswers.map((w) => (
                    <tr key={w.week} className="border-t border-gray-100">
                      <td className="py-1 pr-3">{w.week}</td>
                      <td className="py-1 pr-3 text-right tabular-nums">{w.correct}</td>
                      <td className="py-1 pr-3 text-right tabular-nums">{w.incorrect}</td>
                      <td className="py-1 text-right tabular-nums">{formatPercent(w.correct, w.correct + w.incorrect)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableToggle>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Time on site is estimated from the gaps between recorded actions (pages, lessons, answers, solutions): a gap
          of up to {ACTIVE_GAP_MINUTES} minutes counts, a longer one is a break. Page activity is recorded from 17 Sep
          2026. “Answering” is the time on questions as timed by the practice page.
        </p>
      </Card>

      {/* Strengths & weak points */}
      <Card id="strengths" title="Strengths & weak points">
        {topicRank.best.length === 0 && chapterRank.best.length === 0 ? (
          <p className="text-sm text-gray-400">
            Not enough answers yet — a lesson or chapter needs {MIN_CHAPTER_ATTEMPTS}+ answers to be ranked.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Strongest lessons</h3>
              <ul className="space-y-2">
                {topicRank.best.map((t) => (
                  <AccuracyBar key={t.topic_id} label={t.topic_name} correct={t.correct} attempted={t.attempted} />
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Weakest lessons</h3>
              {topicRank.worst.length ? (
                <ul className="space-y-2">
                  {topicRank.worst.map((t) => (
                    <AccuracyBar key={t.topic_id} label={t.topic_name} correct={t.correct} attempted={t.attempted} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">Needs a second lesson with {MIN_CHAPTER_ATTEMPTS}+ answers.</p>
              )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {stats.chapters.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">By chapter</h3>
              <ul className="space-y-2">
                {stats.chapters.map((c) => (
                  <AccuracyBar key={c.chapter_id} label={c.label} correct={c.correct} attempted={c.attempted} />
                ))}
              </ul>
            </div>
          )}
          {analytics.difficulty.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">By difficulty</h3>
              <ul className="space-y-2">
                {analytics.difficulty.map((d) => (
                  <AccuracyBar
                    key={d.level}
                    label={d.level ? `${d.level} · ${DIFFICULTY[d.level] ?? `Level ${d.level}`}` : 'Unrated'}
                    correct={d.correct}
                    attempted={d.attempted}
                  />
                ))}
              </ul>
            </div>
          )}
          {analytics.topics.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Every lesson practised</h3>
              <ul className="space-y-2">
                {[...analytics.topics]
                  .sort((a, b) => b.attempted - a.attempted)
                  .map((t) => (
                    <AccuracyBar key={t.topic_id} label={`${t.mastered ? '★ ' : ''}${t.topic_name}`} correct={t.correct} attempted={t.attempted} />
                  ))}
              </ul>
              <p className="text-[11px] text-gray-400 mt-1">★ mastered</p>
            </div>
          )}
          {reasons.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Why answers were marked wrong</h3>
              <ul className="space-y-2">
                {reasons.map((r) => (
                  <li key={r.label} className="text-sm" title={`${r.label}: ${r.value} of ${wrongSubs} wrong answers`}>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-700">{r.label}</span>
                      <span className="text-gray-500 tabular-nums">
                        {r.value} · {formatPercent(r.value, wrongSubs)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${wrongSubs ? (r.value / wrongSubs) * 100 : 0}%`, background: WRONG }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Most-missed questions */}
      {analytics.missed.length > 0 && (
        <Card id="missed" title="Questions they keep missing">
          <ul className="divide-y divide-gray-100 -my-2">
            {analytics.missed.map((m) => (
              <li key={m.problem_id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full border ${
                      m.latest_correct ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {m.latest_correct ? 'Got it eventually' : 'Still wrong'}
                  </span>
                  <span className="text-gray-900 font-medium">
                    {m.problem_number !== null ? `Q${m.problem_number}` : 'Question'}
                    {m.topic_name && <span className="text-gray-500 font-normal"> · {m.topic_name}</span>}
                  </span>
                  <span className="text-gray-500 tabular-nums ml-auto">
                    {m.wrong} wrong of {m.tries} tr{m.tries === 1 ? 'y' : 'ies'} · <LocalTime value={m.last_at} format="date" />
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1 break-words line-clamp-2">{m.question}</p>
                {m.last_answer && <p className="text-xs text-gray-500 mt-0.5 break-words">Last answer: {m.last_answer}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

/** Vertical weekly bars; each bar may stack parts (bottom first) with a 2px gap. */
function WeekBars({
  weeks,
  max,
  label,
}: {
  weeks: { week: string; parts: { value: number; color: string; label: string }[] }[];
  max: number;
  label: string;
}) {
  return (
    <>
      <div className="flex items-end gap-1 h-28" role="img" aria-label={label}>
        {weeks.map((w) => {
          const sum = w.parts.reduce((s, p) => s + p.value, 0);
          return (
            <div
              key={w.week}
              className="flex-1 h-full flex flex-col-reverse justify-start gap-[2px] min-w-0"
              title={`Week of ${w.week}: ${w.parts.map((p) => p.label).join(', ')}`}
            >
              {sum > 0 &&
                w.parts
                  .filter((p) => p.value > 0)
                  .map((p, i, arr) => (
                    <div
                      key={i}
                      className={i === arr.length - 1 ? 'rounded-t' : ''}
                      style={{ height: `${Math.max(3, (p.value / max) * 100)}%`, background: p.color }}
                    />
                  ))}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1 text-[10px] text-gray-400">
        {weeks.map((w, i) => (
          // Every third label only, so they can overflow their narrow column without colliding.
          <div key={w.week} className="flex-1 min-w-0 flex justify-center whitespace-nowrap">
            {i % 3 === 0 || i === weeks.length - 1 ? w.week.slice(5) : ''}
          </div>
        ))}
      </div>
    </>
  );
}
