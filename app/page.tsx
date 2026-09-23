import Link from 'next/link';
import { query } from '@/lib/db/client';
import { Reveal } from '@/components/home/Reveal';
import { AnimatedCounter } from '@/components/home/AnimatedCounter';
import { PhysicsBackground } from '@/components/home/PhysicsBackground';
import { FloatingFormulas } from '@/components/home/FloatingFormulas';
import { HeroVideo } from '@/components/home/HeroVideo';

export const dynamic = 'force-dynamic';

interface PlanRow {
  name: string;
  slug: string;
  price_yearly: string;
  features: string[];
}

async function getStats() {
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*) FROM chapters) as chapters,
        (SELECT COUNT(*) FROM topics) as topics,
        (SELECT COUNT(*) FROM simulations) as simulations,
        (SELECT COUNT(*) FROM problems) as questions
    `);
    return result.rows[0];
  } catch {
    return { chapters: 25, topics: 89, simulations: 6, questions: 30 };
  }
}

async function getPlans(): Promise<PlanRow[]> {
  try {
    const result = await query(
      `SELECT name, slug, price_yearly, features FROM subscription_plans WHERE is_active = TRUE ORDER BY tier_level ASC`
    );
    return result.rows;
  } catch {
    return [];
  }
}

const CURRICULA = [
  {
    name: 'IGCSE Physics',
    detail: 'Cambridge 0625 — the complete syllabus',
    status: 'available',
  },
  {
    name: 'IB Physics',
    detail: 'SL & HL',
    status: 'soon',
  },
  {
    name: 'HMH',
    detail: 'US curriculum',
    status: 'soon',
  },
];

const FEATURES = [
  {
    title: 'Simulations You Can Actually Break',
    desc: "Not diagrams — real physics engines. Load a spring past its limit and watch it deform. Solve a circuit that's actually being solved, not animated.",
  },
  {
    title: "Practice That Knows Where You're Stuck",
    desc: 'Question-by-question practice with mastery tracking, IXL-style. Get something wrong, and we point you straight back to the lesson and simulation that fixes it.',
  },
  {
    title: 'One Class, One Login',
    desc: "Join your teacher's section with a code, and everything they assign lives in the same place you study — no separate app for homework.",
  },
  {
    title: 'Built By Someone Who Actually Teaches',
    desc: 'Every lesson, simulation, and question exists because a real physics class needed it — not because it filled a content template.',
  },
];

const SIM_SHOWCASE = [
  { title: 'Pendulum Lab', tagline: 'Damped oscillation, real force vectors', href: '/simulations/pendulum' },
  { title: 'Circuit Builder', tagline: 'A real solver — build any circuit', href: '/simulations/circuit-builder' },
  { title: 'Spring Lab', tagline: "Hooke's law, pushed past its limit", href: '/simulations/spring' },
];

export default async function HomePage() {
  const [stats, plans] = await Promise.all([getStats(), getPlans()]);

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-100 blur-3xl animate-float-slow animate-pulse-soft pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-40 -left-24 w-72 h-72 rounded-full bg-gray-100 blur-3xl animate-float-slow pointer-events-none"
          style={{ animationDelay: '2s' }}
          aria-hidden="true"
        />
        <PhysicsBackground />
        <FloatingFormulas />

        <div className="relative text-center max-w-3xl mx-auto px-4 pt-16 pb-14">
          <div
            className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-600 mb-6 animate-fade-in-up"
            style={{ animationDelay: '0ms' }}
          >
            IGCSE · IB · HMH — all under one roof
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5 animate-fade-in-up"
            style={{ animationDelay: '80ms' }}
          >
            One Website. Every Physics<br className="hidden sm:block" /> Lesson You&rsquo;ll Ever Need.
          </h1>

          <p
            className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto mb-8 animate-fade-in-up"
            style={{ animationDelay: '160ms' }}
          >
            Full curriculum coverage, real interactive simulations, and practice that adapts to
            exactly where you&rsquo;re stuck. Built by a physics teacher, for physics students.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up"
            style={{ animationDelay: '240ms' }}
          >
            <Link
              href="/auth/signup"
              className="bg-gray-900 hover:bg-black text-white px-7 py-3.5 rounded-lg font-semibold text-[15px] transition-transform hover:scale-[1.03] w-full sm:w-auto"
            >
              Start Learning Free
            </Link>
            <Link
              href="/curriculum"
              className="border border-gray-300 hover:bg-gray-50 text-gray-800 px-7 py-3.5 rounded-lg font-semibold text-[15px] transition-colors w-full sm:w-auto"
            >
              Explore the Curriculum
            </Link>
          </div>
          <p
            className="text-xs text-gray-400 mt-4 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            Free forever for the core curriculum. No credit card needed.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 pb-16 animate-fade-in-up" style={{ animationDelay: '360ms' }}>
          <HeroVideo />
        </div>
      </section>

      {/* ---------- Curriculum coverage ---------- */}
      <section className="bg-gray-900 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Reveal className="text-center mb-8">
            <h2 className="text-xl font-bold text-white mb-1">Wherever You&rsquo;re Studying, We&rsquo;ve Got It</h2>
            <p className="text-gray-400 text-sm">One platform, built to cover every major curriculum.</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CURRICULA.map((c, i) => (
              <Reveal key={c.name} delay={i * 100}>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 h-full">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white">{c.name}</h3>
                    {c.status === 'available' ? (
                      <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Available Now
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{c.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Feature grid ---------- */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <Reveal className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Why Students Stay Here</h2>
          <p className="text-gray-500 max-w-lg mx-auto">Not another content library. A place to actually learn.</p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className="border border-gray-200 rounded-xl p-6 bg-white h-full transition-all hover:shadow-md hover:-translate-y-1">
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="bg-gray-50 border-y border-gray-100 py-14">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: parseInt(stats.chapters), label: 'Chapters' },
            { value: parseInt(stats.topics), label: 'Lessons' },
            { value: parseInt(stats.simulations), label: 'Interactive Simulations' },
            { value: parseInt(stats.questions), label: 'Practice Questions', suffix: '+' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                <AnimatedCounter target={s.value} suffix={s.suffix || ''} />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Simulation showcase ---------- */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <Reveal className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">See It In Action</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            A few of the simulations you&rsquo;ll actually use, not just look at.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {SIM_SHOWCASE.map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <Link
                href={s.href}
                className="block border border-gray-200 rounded-xl p-6 bg-white h-full transition-all hover:shadow-md hover:-translate-y-1 hover:border-blue-200"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4 text-lg">
                  ▶
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500 mb-3">{s.tagline}</p>
                <span className="text-sm font-semibold text-blue-600">Try it live →</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Plans ---------- */}
      {plans.length > 0 && (
        <section className="bg-gray-50 border-y border-gray-100 py-16">
          <div className="max-w-5xl mx-auto px-4">
            <Reveal className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Free. Upgrade When You&rsquo;re Ready.</h2>
              <p className="text-gray-500 max-w-lg mx-auto">
                Every plan includes the full curriculum. Higher tiers unlock deeper practice —
                and Pro even includes a private session with a real teacher.
              </p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {plans.map((plan, i) => {
                const isPro = plan.slug === 'pro';
                // Shown at the 12-month rate (cheapest commitment) — matches
                // the default toggle position on /pricing, not the 1-month price.
                const monthly = plan.slug === 'free' ? 0 : Math.round(parseFloat(plan.price_yearly) / 12);
                return (
                  <Reveal key={plan.slug} delay={i * 100}>
                    <div
                      className={`rounded-xl p-6 h-full flex flex-col ${
                        isPro
                          ? 'bg-gray-900 text-white border-2 border-gray-900 shadow-lg'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <h3 className={`font-bold mb-1 ${isPro ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                      <div className="mb-4">
                        <span className={`text-2xl font-bold ${isPro ? 'text-white' : 'text-gray-900'}`}>
                          {monthly === 0 ? 'Free' : `${monthly.toFixed(0)} TRY`}
                        </span>
                        {monthly > 0 && (
                          <span className={isPro ? 'text-gray-400 text-sm' : 'text-gray-400 text-sm'}>
                            /mo, billed yearly
                          </span>
                        )}
                      </div>
                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.map((f) => (
                          <li
                            key={f}
                            className={`text-sm flex items-start gap-2 ${
                              isPro ? 'text-gray-200' : 'text-gray-600'
                            }`}
                          >
                            <span className={isPro ? 'text-green-400' : 'text-green-600'}>✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/auth/signup"
                        className={`text-center text-sm font-semibold py-2.5 rounded-lg transition-colors ${
                          isPro
                            ? 'bg-white text-gray-900 hover:bg-gray-100'
                            : 'bg-gray-900 text-white hover:bg-black'
                        }`}
                      >
                        {monthly === 0 ? 'Get Started' : 'Choose ' + plan.name}
                      </Link>
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <p className="text-center text-xs text-gray-400 mt-6">
              Shown at the 12-month rate — 1 and 3-month plans available too.{' '}
              <Link href="/pricing" className="text-blue-600 hover:underline font-medium">
                See full pricing &amp; billing options →
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* ---------- Final CTA ---------- */}
      <section className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Reveal>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Actually Understand Physics?</h2>
          <p className="text-gray-500 mb-8">Join free. Upgrade only if you want to.</p>
          <Link
            href="/auth/signup"
            className="inline-block bg-gray-900 hover:bg-black text-white px-8 py-3.5 rounded-lg font-semibold transition-transform hover:scale-[1.03]"
          >
            Start Learning Free
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
