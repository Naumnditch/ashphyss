# AshPhys — Current Project Status

**Read this first if you're a new Claude conversation picking this project up.**
This file is the source of truth for "what's actually built and where things
stand," separate from README_DEVELOPMENT.md (generic setup instructions).
Update it whenever something significant ships or changes.

Last updated: 2026-11-02 (**question explanations now show their equations in LaTeX**, converted automatically in code with no AI or API cost; optional hand-written six-section worked solutions at `/admin/explanations` — see "Question explanations in LaTeX"). Previously 2026-10-30 (second announcement video **Share Your Solution** (~30 s, real footage + hand-drawn notes) and the hero "What's New" slot is now a **newest-first playlist** with a Next button — see "Share Your Solution video + hero playlist"; its production row is in **unpublished**: press Publish at /admin/updates once this branch is deployed). Previously 2026-10-29 (student workspace and "Share my solution": students work each practice question on their own canvas + typed steps and can share it for review; admins approve/reject/verify at /admin/shared-solutions; approved ones show as "Student solution by …" beside the teacher solution — see "Student workspace & Share my solution"; migration `shared_solutions` APPLIED to production 2026-10-29). Previously 2026-10-28, latest (answer feedback: confetti + a synthesized chime on a correct practice answer, a shake + soft tone on a wrong one, a bigger celebration on finishing a set or mastering a lesson, a speaker mute button in the practice top bar, button/modal/toast/route motion, all in `lib/feedback` and switched off under reduced motion — see "Answer feedback: confetti, sounds and motion"). Before that (homepage "What's New" announcement videos: `site_updates` table + public bucket + RLS, /admin/updates, hero slot with muted loop / modal / previous updates; the `video/` Remotion pipeline; the first video, Handwritten Worked Solutions, replays the owner's stored handwriting; canvas strokes now store per-point timestamps — see "Hero 'What's New' announcement videos + video pipeline"; **the site_updates migration still needs applying to production**). Earlier 2026-10-28 (handwritten worked solutions on every practice question: admin-only canvas, students see it read-only after a wrong answer under the solutions tier gate; practice page redesigned to fit one viewport — see "Handwritten worked solutions & full-screen practice page"). Also 2026-10-27 (student progress reports: "My Progress Report" dashboard tab, teacher notes, PDF download — see "Student progress report" under "Live site"). Previously 2026-10-26 (AS Chapter 6 Momentum one-page cheat sheets, 7 lessons — see "Revision cheat sheets"). Also 2026-10-26 (AS Chapter 6 Momentum: 20-question tier-ordered banks for 6.1 The idea of momentum, 6.2 Conservation of momentum and collisions, 6.3 Understanding collisions, 41 parametric figures — see "AS Chapter 6 Momentum practice banks"). Previously 2026-10-19 (AS Chapters 1 Kinematics and 2 Accelerated motion: one-page cheat sheet per lesson, 8 + 14 sheets — see "Revision cheat sheets"). Previously 2026-10-17 (revision cheat sheets: new six-section format, precise vector diagrams instead of Rough.js, and an A Level Circular motion sheet (horizontal, vertical, conical) alongside the IGCSE one — see "Revision cheat sheets" below). Also 2026-10-17 (student analytics on `/admin/students/[id]`: right/wrong/skipped/not reached, time on site, strengths and weak points, most-missed questions; practice skips now recorded — see "Student analytics (2026-10-17)" under "Admin student history & activity"). Previously 2026-10-16 (new admin student history page at `/admin/students` + logging of admin revocations/account changes — see "Admin student history & activity" below). Previously 2026-10-15 (Landing page refresh from `claude/relaxed-pasteur-623hnp` merged in and live: restructured hero, full-width updates banner, real updates list in `lib/announcements/updates.ts` (sampleAnnouncements.ts is gone; the What's New entries added on main were ported into it), mobile menu sheet — see "Landing page refresh" below. Also today: Khan-style curriculum redesign merged into `main` and live — it had only ever been deployed from `claude/friendly-allen-1mudd4` and was overwritten by later production deploys; see "Curriculum view redesign" below. Earlier the same day: What's New feed caught up: it had stopped at 24 Sep because nobody added entries — see "What's New feed was stale" under the homepage feed section). Previously 2026-10-14, newest (student video request submit "Network error" fixed — see "Video request submission: 'Network error'" below; migration 06 added, NOT applied). Before that, latest (admin Video Solve Requests page stuck on "Loading…" fixed — see "Admin video requests: stuck on Loading…" below; **PRODUCTION IS RUNNING CODE THAT NEEDS MIGRATIONS 01–05, WHICH ARE NOT APPLIED**). Before that (student dashboard rebuilt as a two-column tabbed page — see "Student dashboard: two-column tabs" below; migration 05 added, NOT yet applied). Earlier 2026-10-14 (lesson videos, student dashboard, hero video-request CTA, real row-level security — see "Lesson videos, student dashboard & hero request CTA" below; migrations NOT yet applied to production). Previously 2026-10-13 (17.4 Coulomb's law: CHALLENGING tier Q60–Q99, 40 questions incl. 23 suspended-charge problems, two last-digit fixes to Q40/Q58 — see "17.4 Coulomb CHALLENGING tier" below. ALSO: Vercel now builds from `ashphys` `main`, not `ashphyss` — see "Live site"). Previously 2026-10-09 (AS Level Kinematics + Accelerated motion: 440 new tier-ordered questions across all 22 lessons of Chapters 1-2, 230 with reusable generated figures — see "AS Level Kinematics & Accelerated motion practice banks" below). Previously 2026-10-06 (Circular Motion & Gravitation Challenge Set: +10 questions in each shared lesson, both banks — see "Challenge set" below). Previously 2026-10-01 (cross-multiplication shortcut in the Equation Rearranger — see "Cross-multiplication in the Equation Rearranger"). Previously 2026-09-30 (A Level units 12–13 practice banks: 99 questions with 46 original figures from the owner's circular motion and gravitation worksheets — see "A Level circular motion & gravitation practice". The multi-curriculum branch reached `master` with it.)

---

## Live site

- Production: **www.ashphys.org** (aliases: ashphys.org, ashphyss.vercel.app)
- Owner/admin login: `naumnditch572@gmail.com` (role=admin in the `users` table)
- GitHub: `github.com/Naumnditch/ashphys.git` → branch `main` **is the production branch**
  (verified 2026-10-13 from the Vercel project: every production deployment's
  git source is `Naumnditch/ashphys@main`, and pushes to other `ashphys`
  branches create preview deployments). The Vercel project is still *named*
  `ashphyss`, which is where the old "double s" note came from.
- `github.com/Naumnditch/ashphyss.git` (double s) is no longer what Vercel
  builds; its `master` is a stale mirror (it lacks the HelpCta commit that is
  live). Pushing there does not deploy.
- Standard deploy: `git push origin main` (from the `ashphys` clone).
- Supabase project: `ashphys-platform` (id `uolwvcszclviqrtyxwgl`, eu-central-1)
- Vercel project: `ashphyss` (id `prj_7lk98vPTJcP5ScK1syAZA0aPgTNV`), team `abdelrahman-elashmawys-projects`

### Question explanations in LaTeX (NEW 2026-11-02)

**Every explanation's equations are typeset as LaTeX, automatically and for
free.** `lib/explanations/autoLatex.ts` (`segmentMath`) finds the equations in
the stored plain-text explanation ("v = 2πr/T = (2π × 50) ÷ 9.0 = 34.9 m/s") and
converts each to LaTeX (`v = 2\pi r/T = (2\pi \times 50) \div 9.0 = 34.9\ \text{m}/\text{s}`):
× ÷ − → \times \div -, Greek letters, ² ⁻¹ → ^{}, ₀ ₁ → _{}, √(…) → \sqrt{…},
sin/cos/tan/ln/lg, ½ → \tfrac12, t½ → t_{1/2}, ° and °C, and SI units after a
number in \text{} (Ω and µ as symbols). Prose, bare numbers ("24.0, 31.5") and
sentences like "speed = distance ÷ time" are left alone. It runs in the browser
when the explanation is shown (`components/explanations/ExplanationView.tsx`);
nothing in the database changes. Two safety nets: if the pieces do not rebuild
the original text exactly, the whole explanation is shown unchanged, and an
equation KaTeX cannot parse is shown as its original text. **No AI and no API
calls are involved** — the owner asked for no paid processing (2026-11-02), so
the Claude-API rewrite tool that was first built for this was removed the same
day (along with the `@anthropic-ai/sdk` dependency).

**Optional hand-written worked solutions.** `/admin/explanations` (sidebar:
Content → Question explanations) lists every question with its explanation as
students see it, and lets the admin write a six-section worked solution by hand
(Given / Unit conversion / Principle / Substitution and calculation / boxed
Result / Common errors, Markdown + LaTeX, live preview). It is validated
(`lib/explanations/validate.ts`: six sections in order, under 150 words, no
"!", valid LaTeX, boxed number within 2 % of `answer_correct`) and replaces the
original for students once it passes ("Publish anyway" overrides). Stored in
`problems.explanation_structured*` columns
(`database/seeds/2026-11-02-structured-explanations.sql`, **applied to
production**); the original `explanation` column is never overwritten. Twelve
questions already have one: Q1–Q6 (numeric and MCQ) of 3.7 Circular motion
(extension), written 2026-11-02.

Tests: `lib/explanations/__tests__/`, `components/explanations/__tests__/`.

### Student workspace & "Share my solution" (NEW 2026-10-29)

**What it is.** On every practice question a student now has their own private
workspace in the right-hand panel ("✎ My working"): the same handwriting canvas
the teacher uses, plus a "📝 Typed steps" box, both autosaved. Under it,
**Share my solution** (enabled only once strokes or steps are saved) opens a form:
display name (default first name + last initial, editable), "I worked out this
solution myself.", the licence line "I allow AshPhys to publish this solution,
with my display name, on the platform and use it in future materials.", the age
question the first time, and for under-18s a parent/guardian checkbox that is
required. Submitting copies the saved working into a `pending` submission.
An admin reviews it at **/admin/shared-solutions** (sidebar → Requests → Student
solutions, with a pending badge; also an overview card) next to the question,
its answer/explanation and the teacher's handwritten solution: approve, reject
with an optional reason the student sees, and "Verified against mark scheme".
Approved solutions appear in the question's worked-solution panel as "Teacher
solution" | "Student solution by <name>" side by side (≥1280px; tabs below that),
verified ones first with a badge. Students see their submissions and status in
the workspace and in a new dashboard tab **My Shared Solutions** (`?tab=solutions`),
and can withdraw a pending or approved one at any time (final; gone from every
public view at once).

**Migration** `database/seeds/2026-10-29-shared-solutions.sql` — **APPLIED to
production 2026-10-29** (Supabase MCP `apply_migration`, after a preview showed
"Your workspace isn't available yet"). Verified afterwards: both tables with RLS on,
8 policies, the guard trigger, `users.age_band` + `age_band_declared_at`, the
(`question_id`, `status`) index, no anon/authenticated grants, `ashphys_user` can
UPDATE `status` but not `strokes`. Idempotent and standalone (it repeats the
role/helper functions of the handwriting migration). Without it students' "My
working" panel says "Your workspace isn't available yet" (teacher solutions, admin
pages and the sidebar badge keep working; the admin queue shows a setup message).
- `users.age_band` (`under_18` | `18_plus`, NULL = never asked) + `age_band_declared_at`.
- `student_workspaces` (`user_id`, `question_id` UNIQUE together, `doc` jsonb in the
  question_handwriting format, `steps_text` ≤ 5000, `stroke_count`, `version` = canvas
  version (0 = only steps saved; saving steps never bumps it), timestamps).
- `shared_solutions` (`id, question_id, user_id, display_name, strokes, snapshots,
  stroke_count, steps_text, status shared_solution_status (pending/approved/rejected/
  withdrawn), verified, verified_by/at, consent_version, consent_text, consented_at,
  parent_consent_at, reviewed_by/at, rejection_reason, withdrawn_at, created_at`).
  Index on (`question_id`, `status`) as asked, plus (`user_id`, `created_at`), a
  partial index for the pending queue, and a partial UNIQUE (`user_id`,
  `question_id`) WHERE status IN (pending, approved): one live submission per
  question. Extra columns beyond the brief: `snapshots`/`stroke_count` (server SVG,
  as for teacher solutions), `consent_text` (the exact wording), `verified_by/at`,
  `withdrawn_at`.

**Who may do what** (row-level security as `ashphys_user`, same scheme as the
handwriting migration; the API checks the same things first):
- `student_workspaces`: owner only, every command. Admins and teachers can't read a
  private workspace either — they see what a student chose to share.
- `shared_solutions` SELECT: the author (any status), admins, and anyone else only
  for `approved` rows of a question they answered incorrectly
  (`app_answered_incorrectly`, the teacher solution's rule).
- INSERT: `app_is_student()`, as themselves, `pending` with no review fields, and
  `parent_consent_at IS NOT NULL OR app_declared_adult()` (unknown age = under 18).
- UPDATE: the author may only set `withdrawn` (pending/approved rows); admins may
  only review non-withdrawn rows. Column grants: the app role can UPDATE only
  `status`, `verified`, `rejection_reason`, so the submitted content is immutable.
  BEFORE UPDATE trigger `shared_solutions_guard` (app role only; owner/FK cascades
  pass): withdrawn is final, withdrawing changes nothing else, never back to
  pending, stamps `reviewed_by/at`, `verified_by/at`, `withdrawn_at`, clears the
  reason unless rejected. DELETE: no policy (withdrawn rows stay as the consent
  record; deleting the user deletes them).

**Visibility & tiers.** Approved student solutions travel with the teacher's
solution through the existing gate, unchanged: lesson `required_tier`, only after
a wrong answer, and the same Free 2 / Plus 5 / Pro unlimited solution-view budget —
opening a question's worked solutions spends ONE view and shows the teacher's and
the students' together (target `{ problemId }`). A question with approved student
solutions but no teacher solution now opens too ("Your teacher hasn't written out a
solution to this question yet" in the teacher pane).

**API** (`lib/practice/questionGate.ts` = sign-in + question-in-lesson + lesson tier, shared with the handwriting route):
- `GET/PUT/PATCH /api/practice/[topicId]/workspace/[problemId]` — load; save canvas `{ doc, baseVersion, force? }` (409 stale, 413); save steps `{ stepsText }`.
- `GET/POST /api/practice/[topicId]/workspace/[problemId]/share` — form defaults + own submissions for the question; share (400 `age_required` / `parent_consent_required` / `empty`, 403 non-students, 409 `already_shared` / `consent_changed`).
- `GET /api/shared-solutions` (own, all questions) · `PATCH /api/shared-solutions/[id]` `{ action: 'withdraw' }`.
- `GET /api/admin/shared-solutions?status=pending|approved|rejected|withdrawn|all` · `PATCH /api/admin/shared-solutions/[id]` `{ action: approve | reject (reason?) | verify | unverify }`.
- `GET/POST /api/practice/[topicId]/handwriting/[problemId]` now also return `studentSolutionCount` and (when allowed) `studentSolutions` (`id, displayName, verified, approvedAt, pages, stepsText` — no author id or consent data).

**Files.** `database/seeds/2026-10-29-shared-solutions.sql`; `lib/sharedSolutions/`
(consent, validate, types, store), `lib/workspace/store.ts`, `lib/practice/questionGate.ts`;
`components/workspace/` (StudentWorkspace, ShareSolutionDialog, SharedStatus),
`components/handwriting/SolutionsBoard.tsx`, `components/admin/SharedSolutionReview.tsx`,
`components/dashboard/SharedSolutionsTab.tsx`, `app/admin/shared-solutions/page.tsx`, the
routes above; edited `HandwritingEditor` + `useHandwritingDoc` (endpoint is a prop now:
admin solution or student workspace), `HandwrittenSolution`, `PracticeSession` (student
panel: "My working" ⇄ "Worked solution" after a wrong answer; `?q=<problemId>` opens a
question), practice `page.tsx`, `HelpCta` (hidden on practice pages — see Decisions),
`lib/admin/overview.ts`, `AdminSidebar`/`AdminIcons`/admin overview, dashboard tabs.
The editor chunk (~17 KB gzip) now also loads for students, lazily, when "My working"
is shown; `/practice/[topicId]` first load 145 → 146 kB.

**Tests & checks (2026-10-29).** `lib/sharedSolutions/__tests__/sharedSolutionsDb.test.ts`
(17, `npm run test:db`): submit → pending → withdraw; snapshot not live link; one live per
question, empty workspace, stale consent, bad names, teachers refused; pending/rejected
invisible to other students (API and raw SQL); review queue with question + teacher
solution; reject with reason → student sees it → shares again; approved appears with the
display name beside the teacher solution, verified flag, no author id in the payload;
students can't approve/verify/edit/forge/delete directly (42501); under-18 refused without
parental consent (API, and raw INSERT for under-18 and never-asked), age can't be flipped;
withdrawn disappears and can't be re-approved; student solutions without a teacher solution;
tier gate; 401s; deleting a reviewer keeps the review. A mutation check (insert policy without
the parent clause) makes the under-18 test fail. Unit (12) + component (15: share dialog,
workspace share button/withdraw, side-by-side board). Full suite 2203 passed, 1 failed (the
pre-existing live-DNS test); `tsc`, `next build`, ESLint (`next/core-web-vitals`, ad hoc) clean.
Playwright against `next start` + a local replica of the live schema: 27/27 checks (admin
canvas, student canvas + steps autosave, share disabled until saved, under-18 dialog, pending,
invisible to Bob, admin queue side by side + consent record + badge, approve + verify, Bob sees
"Student solution by Alice A." beside "Teacher solution" with the badge and steps, tabs at
820px, dashboard list + withdraw, gone after withdrawal; no page scroll at 1440×900 and 390×844;
no console errors).

### Answer feedback: confetti, sounds and motion (NEW 2026-10-28)

**What it does.** Practice page (`/practice/[topicId]`): a correct answer fires three
confetti bursts (from the feedback box and from the left and right edges, brand blues /
indigo / chart orange / green / amber, ~1.7 s) and a two-note rising chime; the "✓ Correct!"
line scales and fades in. A wrong answer shakes the chosen option (or the typed answer) for
300 ms with one red ring pulse and plays a soft falling tone (peak gain 0.12 vs 0.2 for the
chime); never confetti. A correct answer that **completes the set** (no question left untried
or skipped) or **newly masters the lesson** gets the milestone instead: three waves of
confetti (~3.5 s) and a C-major arpeggio fanfare (0.8 s). The 🏆 on the "Topic Mastered!"
screen pops in. Options fade between states and show a ✓ / ✕ that pops in; the streak pills
fill with a transform; the progress-map bar transitions its widths; the optional interactive
solution expands (height + opacity, 280 ms ease-out). None of it touches answer checking,
scoring, tier gating or any API call; everything is fire-and-forget, the confetti canvas is
`pointer-events: none`, so Next works mid-burst.

Elsewhere: `.btn` (site-wide) and the new `.fb-press` / `.fb-lift` classes press to 0.97 on
`:active`, primary CTAs lift 1 px on hover (hover-capable devices only); modals (soft paywall,
mailbox `Modal`, What's New video modal + drawer backdrop) fade the backdrop and scale the
dialog 0.96 → 1; the mailbox send toast now slides in at the **top right** and fades out
300 ms before it is removed; `app/template.tsx` fades and rises the main content (200 ms) on
every navigation (fade only on `/practice/…`, whose fixed shell a transform would re-anchor;
`animation-fill-mode: backwards` so no transform stays on the wrapper). `/payments/result` for
a real plan purchase (not a test charge or add-on) shows one gold sparkle burst, once per
order per tab (`sessionStorage`), with the fanfare only if the page already had a user
interaction (a fresh redirect from Shopier has none, so in practice it is silent).

**Sounds are synthesized** (Web Audio, `lib/feedback/sounds.ts`), not files: no request,
nothing to preload or license, instant start. correct = E5 659 Hz → A5 880 Hz sine (+ a quiet
octave), 0.26 s; incorrect = E4 330 Hz → A3 220 Hz triangle through a 1.1 kHz low-pass,
0.34 s; fanfare = C5 E5 G5 C6, 0.8 s. The AudioContext is only created inside a click /
tap / Enter (`primeFeedback()` runs synchronously in the option click and Check handler,
before the submit `await`), with iOS's silent-buffer unlock; a cue that cannot start within
150 ms is dropped, never played late.

**Mute**: speaker button (`components/SoundToggle.tsx`) in the practice top bar, on by
default, saved in `localStorage['ashphys:sound-muted'] = '1'`, synced across toggles by the
`ashphys:sound-muted` window event. Not in the site navbar (crowded on phones; the only
sounds are on the practice page and the rarely-audible payment result).

**Switches for testing**: `localStorage.setItem('ashphys:sound-muted','1')` = no sound;
`localStorage.setItem('ashphys:confetti','off')` = no confetti; emulating
`prefers-reduced-motion: reduce` (DevTools → Rendering) = no confetti and no transform
animation anywhere (shake, pop, lift, press, page rise, dialog scale become fades or nothing),
sounds still play unless muted.

**Code.** `lib/feedback/index.ts` (public API: `celebrateCorrect`, `celebrateMilestone`,
`celebrateUpgrade`, `shakeIncorrect`, `animateReveal`, `playSound`, `primeFeedback`,
`setSoundMuted`, `isSoundMuted`, `prefersReducedMotion`), `lib/feedback/sounds.ts`
(lazy), keyframes and classes at the end of `app/globals.css` (`fb-*`),
`components/SoundToggle.tsx`, `components/feedback/CelebrateOnMount.tsx`, `app/template.tsx`.
New dependency **canvas-confetti 1.9.4** (ISC) + `@types/canvas-confetti`; dynamic import,
one shared full-screen canvas drawn in a worker. Bundle: `/practice/[topicId]` 48.4 → 50.8 kB;
confetti is its own 4.3 kB gz chunk and the sound recipes 0.7 kB gz, both fetched on first use.

**Checks (2026-10-28).** `lib/feedback/__tests__/feedback.test.ts` (10: cue lengths and
loudness budgets, mute persistence + event, nothing plays before a gesture or while muted,
shake/reveal fall back under reduced motion, no throw without Web Audio / WAAPI, no confetti
when off). Full suite 2113 passed, 1 failed (the pre-existing live-DNS messaging test); `tsc`
and `next build` clean; ESLint clean on every changed file except a pre-existing
`react/no-unescaped-entities` in the paywall copy. Playwright against `next dev` with a
temporary harness page (mocked practice API, not committed): correct → 3 bursts + 659/880 Hz,
Next clickable ~0.4 s later mid-confetti; wrong → shake + pulse + 330/220 Hz, no confetti;
last question → fanfare + 8 bursts; mute saves, survives reload, silences; reduced motion →
no canvas, badge only fades, no shake, buttons untransformed, sound still plays; 390×844 touch
→ chime after taps, no horizontal overflow; route transition leaves no transform; no console
errors anywhere. Not checked: real iOS/Android audio (Chromium only), the payment result
celebration (needs a Shopier order row), the paywall and mailbox toast in a live session.

### Share Your Solution video + hero playlist (NEW 2026-10-29/30)

Owner: a ~30 s announcement for student solution sharing, real footage of the
site plus handwriting "written" over it with rough hand-drawn marks; and the
hero's video slot as a list — newest first, a Next button when one ends.

**The video** (`video/updates/share-your-solution/`: `config.json`, `capture.mjs`).
29.8 s, 1920×1080, 30 fps, silent. Storyboard: title card ("NEW · Share your
solution", red rough underline, handwritten "students can now publish their
working") → ① *Solve it your way* (the demo student's workspace on A Level
24.3 Q16, Phobos → mass of Mars: the pen writes "M = 6.41 × 10²³ kg" and boxes
it, the last typed steps go in, "✓ Saved" circled — "saves as you go") → ②
*Add your name* (Share my solution → display name typed as the fictional
**"Sam T."**, under 18, the three consent boxes ticked, Share for review →
"Pending review" circled, "sent for review") → ③ *Your teacher checks it*
(/admin/shared-solutions, Sam's solution beside the teacher's, Approve with a
big green tick, "Verified against mark scheme" ticked, the header badge
circled — "checked against the mark scheme") → ④ *Your name, under your
solution* (a second test student after a wrong answer: "Teacher solution" |
"Student solution by Sam T. ✓ Verified", "Sam T." handwritten under the
sheet with a double underline) → "Change your mind? Withdraw anytime" (arrow
to Withdraw, then "Withdrawn") → end card "Your work. Your name." / "Try a
practice question" / ashphys.org. Wipe/slide transitions between steps, fade
into the end card; spring camera zooms; cursor with click ripples; a stylus
while the pen writes. Captions burned into the 1080p master only (6 cues,
also `.srt`/`.vtt`); the hero version has none.
- **Handwriting**: "Altrament" does not exist on npm (404, 2026-10-29). Used the
  single-stroke **Shadows Into Light** font that ships with **Vara.js**
  (`vara@1.4.1`, font OFL 1.1, Vara MIT) — font JSON only, drawn frame by
  frame by our own code (`video/src/handwriting/strokeFont.ts`,
  `src/components/Handwritten.tsx`), because Vara's runtime animates with
  requestAnimationFrame, which Remotion can't render. Marks: **roughjs 4.6.6**
  (`src/components/RoughMark.tsx`), fixed seed per shape. Placed by a new
  `annotations` list on any scene (`src/components/Annotations.tsx`; kinds
  note, step, underline, double-underline, circle, box, tick, arrow). Also
  new in the template: a transition per scene (adds `wipe`), camera `shift`.
  Documented in `video/README.md` → *Annotations*.
- **Demo data, no real people**: local Postgres with the production schema and
  the 24.3 lesson (read-only export through the Supabase connector; the
  teacher's Q16 handwriting from the committed `strokes/B.json`), TEST
  accounts only ("Test Student", "Demo Teacher", new optional "Test Reader" =
  `TEST_STUDENT2_*`), random credentials, never committed. The student's
  canvas working is real pen input into the real workspace, written with the
  same stroke font (not the teacher's strokes); typed steps are real
  keystrokes. The only email on screen (admin card header) is blurred by the
  capture. The seed now applies the shared-solutions migration and resets the
  test students' workspaces, shared solutions and age answer.
- **Outputs** (`video/out/share-your-solution/`, not committed except the web
  files): `film-1080p.mp4` 10.18 MB (H.264 CRF 20) + `.webm` 5.79 MB (VP9);
  hero version `loop-720p.mp4` 4.55 MB + `.webm` 3.80 MB — the whole 29.8 s
  story at 1280×720, two-pass under `maxBytes` 5 MB, `loop: false`, no
  captions; `poster.webp` 57 KB (1280×720, "Sam T." under the solution) +
  `.jpg` 143 KB; `captions.vtt/.srt`. No vertical cut.
- **Re-render**: `cd video && npm run seed -- --reset-only --student-tier=pro`
  (with the TEST_* variables), then `CAPTURE_BASE_URL=http://localhost:3100
  npm run capture -- --update=share-your-solution`, then (site root)
  `npm run video:build -- --update=share-your-solution`, then `cd video &&
  npm run publish -- --update=share-your-solution --target=static --sql`.

**Published** as static files in `public/video/updates/share-your-solution/`
(24 MB, suffix `mvu6uty4`) and the row
`database/seeds/2026-10-29-site-updates-share-your-solution.sql`: title
"Share Your Solution" (the hero adds its own NEW badge, so no "New:" prefix,
as with the first one), CTA "Try a practice question" → `/curriculum?c=a-level`,
`published_at` fixed at **2026-10-29 23:50 UTC**. **Applied to production
2026-10-29 through the Supabase connector as UNPUBLISHED (`is_active = false`)**:
the files only exist once this branch is deployed, and a live row before that
would put a broken video at the top of the homepage. **After the deploy:**
/admin/updates → Share Your Solution → Publish (keeps the 29 Oct date), or
`UPDATE site_updates SET is_active = true, updated_at = now() WHERE slug = 'share-your-solution';`.
The Handwritten Worked Solutions row is unchanged.

**Hero playlist** (`components/home/WhatsNew.tsx`, `variant="hero"` only — the
row variant, /updates and `HeroVideo` (the fallback film) are unchanged):
the live updates sorted newest first by `published_at` in code
(`newestFirst`, `lib/siteUpdates/types.ts`), so Share Your Solution (29 Oct)
plays first and Handwritten Worked Solutions (28 Oct) second. The current
one's video plays **once** (muted, inline; no loop in the hero). When it ends,
an end card over the player shows the next one's poster (fetched only now),
"Up next" + its title and a large **Next video ›**; on the last one, **Back to
the latest** and **Replay**. No auto-advance. ‹ › and "1 / 2" sit beside the
pause button whenever there are 2+ (› disabled on the last, ‹ on the first).
NEW badge only on the newest; the date chip, title, summary, CTA, Watch the
video (full-film modal) and Previous updates (now: those older than the one
showing) follow the current item. Kept: poster image + fade-in video, pause
when scrolled away (a played-out video no longer restarts when scrolled back),
reduced motion → no video, poster + modal, arrows still switch. Real buttons
with labels ("Next video: Handwritten Worked Solutions"), 44 px targets on
phones (the pause button too), focus rings, an `aria-live="polite"` line
("Video 2 of 2: …"). End card text sits clear of the date chip and the
controls down to 375 px.

**Tests & checks (2026-10-30).** Site: `tsc` clean; vitest 2151 passed, 1 failed
(the pre-existing live-DNS email test); new: 10 hero-playlist tests in
`WhatsNew.test.tsx` (order by date whatever the input order, plays once, end
card → Next loads item 2 with its title/date/sources, NEW only on the newest,
› disabled + Back to the latest + Replay on the last, ‹, no restart after the
end, reduced motion never plays but arrows switch, one update → no controls,
Previous updates follows the current) + `newestFirst` in `siteUpdates.test.ts`;
ESLint (`next/core-web-vitals`) clean on the changed files; `next build`
clean (`/` 14.4 kB, first load 111 kB). Real browser (Playwright, local
production build with both rows): 55/55 checks at 1280 px and 375 px (+
reduced motion) — Share Your Solution first and playing, seek near the end →
end card → Next → Handwritten Worked Solutions plays, 2 / 2, no NEW, 28 Oct,
› disabled, Back to the latest / Replay, ‹ works, Next button inside the 16:9
player and 44 px, no horizontal scroll, no console errors. Video workspace:
`tsc` clean, vitest 18/18 (7 new: path flattening, layout, write-on progress,
rough marks' fixed seeds). The first video was not re-rendered (its captures
aren't in this container); the template changes keep its timing identical
(no per-scene transitions or annotations in its config).

### Hero "What's New" announcement videos + video pipeline (NEW 2026-10-28)

Owner: a reusable "What's New" slot in the hero that plays a short video made
from real footage of the site; the first one announces Handwritten Worked
Solutions, with the owner's own stored handwriting replayed as if being
written; future announcements repeatable (capture → render → publish).

**Placement update (2026-10-28, later):** the owner wanted the announcement seen on first
look, so while an update is live it **takes the old Three.js film's place** in the hero's media
column (`<WhatsNew variant="hero">`: video with a NEW · date badge, then title, summary, CTA,
Watch the video, Previous updates). On phones it sits **above** the headline. The loop and a
real poster `<img>` load straight away there (it is the hero's media now, as the film was); the
big play button hides while the loop plays. With no live update the old film comes back. The
row layout described below is still the component's default (`variant="row"`), now unused.

**On the homepage** (`components/home/WhatsNew.tsx`, wired in `app/page.tsx`
as its own row under the headline/film, above the video-request CTA — the
existing hero is untouched and nothing renders when there is no live update):
NEW badge, date (UTC, same on server and browser), title, one-line summary,
CTA button styled like the hero's primary button, "Watch the video", and
"Previous updates" (a right-hand drawer of older live announcements, each
with Watch + its CTA). The media box is a fixed `aspect-video` from the first
paint (no layout shift). Nothing — not even the poster — loads until the card
is within 200 px of the viewport (IntersectionObserver); then a muted,
`playsInline`, `loop`, `preload="metadata"` 720p loop plays only while ≥25 %
visible, pauses when scrolled away, has its own pause button (WCAG 2.2.2), and
under `prefers-reduced-motion` shows the poster only. Click → modal player
(portal to `<body>`): 1080p film with controls, WebVTT captions (`<track
default>`, CORS-enabled when the file is on Storage), focus on Close, Tab
trapped, Escape/backdrop close, focus returns to the opener, page scroll
locked. WebM first, MP4 fallback.

**Data** — migration `database/seeds/2026-10-28-site-updates.sql`
(**NOT yet applied to production** — the Supabase MCP `apply_migration` call timed out on its confirmation prompt (as it did for the handwriting migration); paste the file into the Supabase SQL editor, then `2026-10-28-site-updates-first-announcement.sql`. Until then the homepage renders exactly as before (the read fails quietly, logged once per server instance) and /admin/updates shows a setup message. Idempotent; it re-creates the role and the two helper functions with the same definitions as the handwriting migration, so it runs on its own): table `site_updates` (`id, slug UNIQUE, title, summary,
video_mp4_url, video_webm_url, poster_url, cta_label, cta_href, published_at,
is_active, created_by` + `loop_mp4_url, loop_webm_url` (the 720p hero loop;
the full film is the fallback), `captions_vtt_url`, `created_at, updated_at`).
CHECKs mirror the form: slug format, lengths, and every URL must be `https://…`
or a site path starting with a single `/` (no `javascript:`, `data:`,
`//host`). Row-level security, the 2026-10-14 pattern (`withRlsContext` as
`ashphys_user`): `site_updates_public_read` = active AND published_at ≤ now()
(a future date = scheduled) OR `app_is_admin()`; insert/update/delete =
`app_is_admin()` only; anon/authenticated grants revoked (no REST exposure).
Public Storage bucket `site-updates` (50 MB/file; mp4, webm, jpeg, webp, png,
vtt); no storage.objects policies, so only the server (service key, after
`requireAdmin`) can write — the admin form uploads straight to Storage with a
signed upload URL (videos are far over Vercel's ~4.5 MB body limit).
`lib/siteUpdates/` (types/status, zod validation, queries; the homepage read
runs as an anonymous visitor and any failure — e.g. migration missing — just
means "no update").

**Admin** — `/admin/updates` (sidebar: Content → "What's New (homepage)";
admin-gated by the admin layout, every API route checks `requireAdmin`, and
RLS refuses non-admin writes): list with Live / Scheduled / Draft /
Unpublished and "In the hero now"; create (slug suggested from the title),
edit, Publish (published_at = now unless set), Unpublish, Delete; one upload
slot per file (full MP4/WebM, loop MP4/WebM, poster, captions) — each upload
gets a fresh path so caches never serve a stale video. API:
`GET/POST /api/admin/site-updates`, `PUT/PATCH/DELETE …/[id]`,
`POST …/upload`.

**The first announcement** (`video/updates/handwritten-worked-solutions/`):
showcase questions found by question text, newest first: **A** "3.7 Circular motion
(extension)" Q50 (A Level bank), conical pendulum, 374 strokes, version 202,
updated 2026-10-28 08:58 UTC; **B** "24.3 Gravitation and orbits (extension)"
Q16, Phobos → mass of Mars, 136 strokes, version 65, updated 08:37 UTC. Both
match the owner's description; neither has timestamps (written before the
timestamp change) → **synthesized pacing** for both (A fitted ×10.3, B
similar). No erased strokes exist to replay (the format stores none). Footage:
local production build against a local replica of the live schema seeded with
those two lessons (149 questions, 3 handwriting rows) and two TEST accounts
("Test Student", "Demo Teacher"; random credentials, env only). Shots:
practice page, typed wrong answer, feedback + Free offer ("uses 1 of your 2
remaining solution views" — the tier moment), viewer reference + ink-hidden
plate at 3×, a 180-frame real zoom → pan → pan → full-screen interaction, the
same for B, tablet-landscape (1366×1024) references/plates/full screen, the
admin canvas + toolbar, and a real writing clip: the admin canvas on a demo
question fed the owner's own "T = 2.26 N" pen points through Chromium pen
input (local demo DB only). Outputs (`video/out/handwritten-worked-solutions/`,
not committed except the four web files): master **43.6 s** 1920×1080 30 fps
`film-1080p.mp4` (H.264 CRF 20 yuv420p faststart, 13.9 MB) + `.webm` (VP9,
7.8 MB); hero loop 1280×720 14.1 s `loop-720p.mp4` 2.73 MB + `.webm` 2.30 MB
(two-pass under 3 MB, Reveal + Navigate, seamless dissolve to its first
frame); vertical 1080×1920 `vertical-1080x1920.mp4` 11.2 MB + `.webm` 5.8 MB;
`poster.webp` (33 KB, 1280×720, pen mid-reveal on Question A's diagram and
geometry sketch) + `.jpg`; `captions.srt/.vtt` (12 cues, the burned-in ones).
Silent. Published as static files in `public/video/updates/handwritten-worked-solutions/`
(26 MB, served by Vercel — this session could not reach Supabase Storage) and
the row in `database/seeds/2026-10-28-site-updates-first-announcement.sql`
(CTA "Try a practice question" → `/curriculum?c=a-level`)

**Video pipeline** — separate npm workspace `video/` (Remotion 4.0.534 +
React 19 there only, Playwright, perfect-freehand, `@remotion/transitions`,
`@remotion/google-fonts` Inter = the site font; `@remotion/lottie` not used —
no animation in this video was better as Lottie than as code). Full workflow,
config reference, policies and the replay's internals: **`video/README.md`**.
In short: `fetch-strokes` (finds the showcase questions in
`question_handwriting` by question text, newest first, shows the match, saves
only with `--confirm`) → `export-demo-data` + `seed` (local DB with the
showcase lessons, TEST accounts from env) → run the site locally → `capture`
→ Studio / `verify` → `npm run video:build -- --update=<slug>` → `publish`
(Storage + row) or /admin/updates.
**Remotion licence: free** — free for individuals and companies with up to 3
employees (LICENSE.md of v4.0.534, read 2026-10-28); AshPhys is one teacher.
Buy a company licence if AshPhys grows to 4+ employees.

**Handwriting replay** (`video/src/handwriting/`): draws the stored strokes
with the site's own geometry (finished strokes = `strokeSvg()` markup,
byte-identical to the student snapshot; the stroke in progress grows point by
point through perfect-freehand with its stored pressure, `last: false` like
the live canvas), in stored order (= writing order), with an Apple
Pencil–style stylus + tip dot, a spring camera that follows the pen region to
region, soft highlight pulses that are gone before the last frame. Pacing:
real timestamps when strokes have them (pauses capped at 0.4 s, then one global
speed-up), else synthesized (duration ∝ length, eased pen, pauses growing with
travel / new line / colour / section). **Pixel check** (`npm run verify`):
the last frame vs the real viewer showing the stored page, at 3× —
mean channel difference 0.002/255 (A) and 0.001/255 (B), 0.001 % of pixels differ by > 24/255 (anti-aliasing), 99.97 % / 99.95 % of the stored ink matched pixel for pixel and **0** ink pixels missing or extra beyond one device pixel. Getting there found a real snag: Chromium snaps the viewer's SVG
to whole CSS px (711.39 → 711) but nothing snaps inside Remotion's
transformed layers, so the ink first landed ⅓ px off; the replay now sits at
the snapped box (`snap.ts`). Debug composition `ReplayCheck` in Studio:
replay / reference / stored snapshot / difference / side-by-side, stroke
indices, HUD.

**Canvas timestamps (schema change, backward compatible, no migration).**
Strokes drawn from now on store per-point time and a start time:
`points: [[x, y, pressure, t]]` (t = ms since the stroke's first point, from
the pointer events' own timestamps, coalesced events included) and `t0` (ms
since the Unix epoch). Shapes get `t0` and `[…, 0]` / `[…, duration]`.
`lib/handwriting/types.ts` (`HwPoint = [x, y, pressure, t?]`, `t0?`),
`schema.ts` (accepts 3- or 4-number points; keeps timing only when every point
of a stroke has it, made non-decreasing, never fails a save over timing; t ≤ 1
h), `geometry.ts` (lasso move and eraser cuts carry t along, interpolated),
`engine.ts` (records it). Old strokes load exactly as before; the student SVG
is identical with or without timing (tested); the snapshot never contains it.
Verified in the real canvas: 10 Chromium pen strokes saved with `t0` and
per-point `t` (e.g. last point 1625 ms). Bodies grow ~15–20 % for new strokes.

**Tests & checks (2026-10-28).** Site: `tsc` clean; vitest 2101 passed, 1 failed (the
pre-existing live-DNS email test); DB tests 55/55 with `TEST_DATABASE_URL`
(30 existing + 17 handwriting + 8 new site_updates: admin-only API, publish /
unpublish / schedule, newest first, unsafe links and duplicate slugs refused,
RLS: anonymous and students read only live rows and can never write, the table
itself refuses unsafe URLs); new unit tests: `WhatsNew.test.tsx` (11),
`siteUpdates.test.ts` (12), `timestamps.test.ts` (8); ESLint
(`next/core-web-vitals`) clean on every new/changed file; `next build` clean.
Bundles: `/` 9.8 → 12.9 kB (first load 106 → 110 kB); `/admin/updates` 4.2 kB
(zod kept server-side). Video workspace: `tsc` clean, vitest 11/11 (pacing,
real-timestamp compression, fit, holds, state, pages, and that A and B replay
every stored stroke exactly once in stored order with untouched points),
`npm run verify` passes. Real browser (Playwright, local build): 47/47 hero
checks on desktop Chrome 1440×900, iPad Pro 11 landscape (Safari UA) and Pixel 7
(Chromium engine for all three — no WebKit or real devices here): muted inline
autoplay when visible, pause when scrolled away and via its button, no video
bytes before the card is near, fixed 16:9 box (CLS 0), LCP never the slot,
modal plays the 1080p film with 12 caption cues, Tab/Shift+Tab trapped,
Escape closes from Close / the video / the CTA and focus returns, existing
hero intact, reduced motion → drawn poster only; 18/18 admin checks
(anonymous → login, student redirected and API 403, create with slug
suggestion, unsafe link refused, upload error shown clearly without Storage,
edit, publish → hero switches, previous updates, unpublish, delete).
**Lighthouse** (12.8, local, `main` vs this branch on the same machine and
data): mobile 7 runs each — median score 95 vs 96, LCP ~2.91 s vs ~2.67 s,
TBT similar, CLS 0 except one run each caused by the existing floating-formula
decoration (pre-existing); desktop 3 runs — 100 vs 100, LCP 635 vs 617 ms.
LCP element is the logo on both. A first version that showed the poster as an
`<img>` did regress desktop LCP (~640 → ~810 ms, the poster became the LCP
element when the card is partly in view), hence the canvas poster.
**Known limitation:** while keyboard focus is on one of Chromium's own
media-control buttons inside the modal's video, Chromium does not deliver
Escape to the page at all (not even to a capture listener); Tab/Shift+Tab
still reach Close, and Escape works from Close, the video element and the
CTA. Not tested here: real iPad Safari / Android devices (worth a quick pass).

**Handwriting inconsistencies noticed (not edited — fix in the admin canvas and re-capture):**
- **A — stored order ≠ the storyboard's order.** Stored (= written) order:
  force diagram → vertical components with "T = __ N" left blank → horizontal
  components → "Rearrange for T (time)" → the "°" of cos 30° and the **2.26**
  filled into "T = 2.26 N" (strokes 226–233) → geometry sketch and r working
  down to r = 0.5 m → the final rearranged lines and T = 1.87 s. The replay
  keeps the stored order (captions say "Diagrams, components and colour-coded
  working" rather than naming a sequence).
- **A — stray red dot** (stroke 234, one point) to the right of the
  "∵ a_c = 4π²r/T²" line; visible on the page.
- **A — stray light-green dot** (stroke 22, one point) inside the "mg" of
  "T cos α = mg"; almost hidden.
- **A — "T²" in the pink "∴ Fc = m·4π²r/T²"**: the T reads like a "+" ("+²").
- **B — "GT²"** in M = 4π²r³/(GT²): the G and T run together (reads like
  "GTT²" / "Gπ²" at a glance).
- **B — "×10²³"**: the exponent is split ("10² ³"); readable.
- **B** — the ³ of (9.38×10⁶)³ and the ² of (2.76×10⁴)² were added after the
  final line was started (strokes 121–122); replayed as written. The two
  crossed-out m's are strokes 39 (right m) then 40 (left m), red, replayed as
  written.
- Not handwriting, but in frame: the typed feedback shows "the answer was
  1.868 s" for A (handwriting ends at 1.87 s) and the raw "6.412e23 kg" for B.

**Files.** `components/home/WhatsNew.tsx` (+ test), `app/page.tsx`,
`lib/siteUpdates/*` (+ unit and DB tests), `app/api/admin/site-updates/**`,
`app/admin/updates/page.tsx`, `components/admin/SiteUpdateManager.tsx`,
`AdminSidebar.tsx`/`AdminIcons.tsx`, `lib/storage/directUpload.ts` (optional
content type), `lib/handwriting/{types,schema,geometry}.ts` +
`components/handwriting/engine.ts` (timestamps) + `__tests__/timestamps.test.ts`,
`database/seeds/2026-10-28-site-updates.sql`, `video/**`, root
`package.json` (`video:build`, `video:studio`, `test:db` incl. the new DB
test), `tsconfig.json` / `vitest.config.ts` (exclude `video/`).

### Handwritten worked solutions & full-screen practice page (NEW 2026-10-28)

**What it is.** Every practice question (`/practice/[topicId]`) has a handwriting
workspace for admins: the owner writes the worked solution by hand (Apple Pencil,
mouse or finger). A student sees that handwriting, read-only, only after answering
that question **incorrectly**, through the same tier gate as interactive solutions.

**Practice page layout** (`components/practice/PracticeShell.tsx`, `PracticeSession.tsx`):
the page is now a full-viewport app (`fixed inset-0`, `100dvh`, page scroll and iOS
bounce locked while it is open; the site navbar/footer sit underneath, unused). Minimal
top bar: back to the lesson, lesson title + syllabus ref + bank, question navigation
(‹ Q3 / 20 ▾ ›, the ▾ opens the existing `QuestionMap` in a popover), mastery streak
and answered count, a "PDF ▾" menu (worksheet / answer key, same links as before),
and for admins a **✎ Write / 👁 Student view** switch. Below it, side by side from the
`split:` variant (≥1024px, or ≥700px in landscape — a Tailwind plugin variant in
`tailwind.config.ts`, NOT a `screens` entry, because an object screen switches off the
`min-[900px]:` variants the curriculum page uses; `courseLayout.test.tsx` caught it):
left ≈37% = question, figure, options/input, feedback and the optional interactive
solution, scrolling inside the column only when long, with Skip/Check/Next pinned at
its bottom; right ≈63% = the canvas (admin) or the solution viewer (student). Stacked
below that (iPad portrait, phones): question on top, the solution panel underneath at
60% height with a Hide/Show toggle; students only get the panel after a wrong answer
on a question that has handwriting. The floating "Need help?" pill stays on the split
layout but is hidden on the stacked one (it covered the answer bar); the wrong-answer
feedback there gets a "🎥 Request a video" link to the same place. Enter now submits a
typed answer. Scoring, mastery, skips, worksheets and the interactive solution are
unchanged (same API calls).

**Admin canvas** (`components/handwriting/`, loaded with `next/dynamic` only when the
viewer is an admin in Write mode: its chunk is ~17 KB gzip incl. perfect-freehand, so
students never download it):
- `engine.ts` — imperative canvas engine (pointer input, rendering, pan/zoom; React is
  not on the hot path). Layers: the stage's CSS background is the paper (grid 32 px /
  lines 40 px, moves with the view), `base` canvas = committed strokes (Path2D cached
  per stroke, culled to the visible area, a new stroke painted incrementally), `live`
  canvas (multiply-blended) = stroke in progress with coalesced + predicted pointer
  events, lasso, selection box, eraser ring. Canvases sized to devicePixelRatio (≤3),
  ResizeObserver redraws on resize; strokes are in fixed logical coordinates (CSS px
  at 100%), so zoom/pan/resize never touch the data.
- Tools: pen (pressure from `PointerEvent.pressure` for pens, simulated from speed for
  mouse/finger), highlighter (multiply), eraser (whole strokes, or pixel = cuts strokes
  and splits them; shapes become polylines first), lasso (select ≥50% inside → drag to
  move, Delete key / bin to delete, palette recolours the selection), shapes (line,
  arrow, rectangle, ellipse; Shift snaps to 15° / square), hand. Colour palette + custom
  colour, size and opacity sliders per tool (remembered in localStorage
  `ashphys:handwriting-tools`). Undo/redo (Ctrl/Cmd+Z, Ctrl+Shift+Z/Ctrl+Y, 200 steps),
  clear page, pages (add / delete / ‹ › / background blank-grid-lined per page).
  Keys: P H E L S, +/−/0, Space+drag pans, Esc deselects.
- Input rules: a pen always uses the tool and, while down, touches are ignored (palm);
  **"Pencil only"** (auto-on the first time a pencil touches the canvas, remembered in
  `ashphys:handwriting-pencil-only`) makes one finger pan; two fingers always pan +
  pinch-zoom; a second finger landing on a <250 ms one-finger stroke cancels it;
  mouse wheel pans, Ctrl/Cmd+wheel (and trackpad pinch) zooms at the cursor, middle
  button / Space / hand tool pans. `touch-action: none`, iOS `gesturestart` and
  `touchmove` default prevented, no callout/selection on the canvas.
- Zoom bar: −, % (click = 100%), +, fit to ink, full screen. **Full screen** uses the
  Fullscreen API (webkit-prefixed too) with a CSS fallback (`fixed inset-0`, Esc exits)
  where only `<video>` may go full screen (iPhone); in full screen the toolbar floats
  as a compact pill with an exit button.
- **Autosave** (`useHandwritingDoc.ts`): debounced 1 s, one request in flight, edits
  during a save are saved right after, failures retry with backoff (2 s → 30 s), leaving
  the question or hiding the tab flushes, `beforeunload` warns while unsaved. Status
  badge: Saved ✓ / Saving… / error text. Each save sends `baseVersion`; a save from a
  stale tab/device gets 409 and a "Keep this version / Load the other version" banner.
- Admin **Student view** shows exactly what students get (server snapshots).

**Student viewer** (`HandwrittenSolution.tsx` + `HandwritingViewer.tsx`, ~3 KB gzip,
lazy): the server-rendered SVG pages stacked, drag/one-finger pan, pinch / Ctrl+wheel /
buttons / double-click zoom, arrow keys, fit, 100%, full screen. Pan/zoom only rewrite
the SVG `viewBox` (crisp at any zoom, no React re-render of the ink). No tools, no write
calls. States: loading → "No handwritten solution for this question yet" (the
explanation stays the fallback) | offer ("Opening it uses 1 of your N remaining solution
views", button) | open | locked (teaser of the top 30% of page 1, fading out, + "You've
used your free solution views" + See plans, which logs `attempted_upgrade`).

**Tier logic — the interactive solutions gate, not a copy.** `lib/solutions/access.ts`
now takes a target: a catalog solution id (as before) or `{ problemId }`. Handwritten
solutions spend from the **same** lifetime budget (`user_solution_views`, Free 2, Plus 5,
Pro unlimited), an unlocked one reopens free, every open/block is logged in
`solution_access_log` (new `problem_id` column). GET (status) never spends; POST (open)
runs `resolveSolutionAccess`; Pro, admins and already-unlocked open straight away. The
lesson's own `required_tier` gate applies first, as for the questions. The admin
student timeline shows "Opened a handwritten solution · <lesson> · Q<n>", and the
analytics "solutions opened" count includes them.

**Schema** — migration `database/seeds/2026-10-28-question-handwriting.sql` (**APPLIED to production 2026-10-28** by pasting it into the Supabase SQL editor — the MCP `apply_migration` tool timed out four times on its confirmation prompt; verified afterwards: table, RLS on, 4 policies, 3 functions, `solution_access_log.problem_id`, no anon/authenticated grants. Before it was applied, preview deployments (which share the production database) showed "Could not load the handwriting"; the routes now degrade gracefully — admin 503 with a setup message, students "no solution" — if it is ever missing; idempotent;
independent of the unapplied 2026-10-14 migrations — it creates the `ashphys_user` role
and `app_current_user_id()` / `app_is_admin()` itself with migration 03's exact
definitions):

| column | |
|---|---|
| `id` uuid PK | |
| `lesson_id` uuid → `topics` (cascade) | "lesson" = topics row, as everywhere |
| `question_id` uuid → `problems` (cascade) | UNIQUE (`lesson_id`, `question_id`) |
| `doc` jsonb | vector strokes: `{ v: 1, pages: [{ id, background, strokes: [{ id, tool: pen/highlighter/shape, shape?: line/arrow/rect/ellipse/polyline, color #rrggbb, width, opacity, pressure: bool, t0?, points: [[x, y, p, t?]] }] }] }` — a stroke's page index is its page's position. **Since 2026-10-28** new strokes also carry `t` (ms since the stroke's first point) on every point and `t0` (ms since the Unix epoch at the stroke's start); older strokes have neither and stay valid (see "Canvas timestamps" in the What's New section) |
| `snapshots` jsonb | server-rendered SVG per non-empty page `[{ x, y, width, height, body }]` |
| `preview` jsonb | teaser of page 1 (strokes wholly inside its top 30% only) |
| `page_count`, `stroke_count` int | 0 strokes = cleared → students see nothing |
| `version` int | +1 per save (optimistic concurrency) |
| `created_at`, `updated_at` timestamptz, `created_by`, `updated_by` → users | |

Plus `solution_access_log.problem_id` uuid → problems (cascade) + index
(`user_id`, `problem_id`).

**Policies** (row-level security as `ashphys_user` via `withRlsContext`, the 2026-10-14
pattern; there is no Supabase Auth so `auth.uid()` is useless here):
- `question_handwriting_read` SELECT: `app_is_admin() OR app_answered_incorrectly(question_id)`;
- `question_handwriting_admin_insert` / `_update` / `_delete`: `app_is_admin()` only;
- `app_answered_incorrectly(uuid)` (SECURITY DEFINER, `search_path = public`) = the
  caller has a `practice_attempts` row for that problem with `is_correct = false`;
- RLS on; grants to `ashphys_user` only; `anon` / `authenticated` grants on the table and
  function revoked (Supabase's default privileges), so the REST API exposes nothing.
- The API checks the same things first (defence in depth): admin-only writes
  (`requireAdmin`), "answer first" 403 that does not reveal whether a solution exists,
  zod validation of every number/colour/enum (`lib/handwriting/schema.ts`; limits 30
  pages, 6000 strokes/page, 10 000 points/stroke, 300 000 points, 4 MB body), and the SVG
  is generated on the server from validated numbers only (never client markup).
- **No storage bucket**: snapshots are a few KB–hundreds of KB of SVG text, stored in the
  same row so the read policy covers them and a save is one transaction. DB was 37 MB on
  2026-10-28; a dense two-page solution is roughly 0.3–0.7 MB (doc + SVG). Revisit
  (move snapshots to a private bucket with signed URLs) if hundreds of solutions push the
  database towards its plan limit.

**API**
- `GET/PUT /api/admin/handwriting/[problemId]` — load / save `{ doc, baseVersion, force? }`
  (403 non-admin, 409 stale, 413 too large).
- `GET /api/practice/[topicId]/handwriting/[problemId]` — status (no ink except the
  teaser when out of views); `POST` — open (tier gate, logs, returns page snapshots);
  `POST …/interest` — upgrade click.

**Files.** `lib/handwriting/` (types, geometry, svg, schema, view, store, dto),
`components/handwriting/` (engine, HandwritingEditor, useHandwritingDoc, useFullscreen,
controls, icons, HandwritingViewer, HandwritingTeaser, HandwrittenSolution),
`components/practice/PracticeShell.tsx`, routes above; edited `PracticeSession.tsx`,
practice `page.tsx`, `HelpCta.tsx`, `lib/solutions/access.ts` + `queries.ts`,
`lib/admin/students.ts` + `studentAnalytics.ts`, `tailwind.config.ts`. New dependency
`perfect-freehand` (MIT, 4.5 KB; the unmerged `claude/student-progress-report` branch uses
it the same way for report ink).

**Tests & checks (2026-10-28).**
- `lib/handwriting/__tests__/model.test.ts` (26): outlines deterministic (reload draws the
  same), dots, shape paths, 15° snap, pixel eraser splits/keeps/erases and cuts shapes,
  stroke-eraser hits, lasso, move, validation rejects markup in colours/ids, NaN,
  pressure > 1, unknown tools, oversize; snapshots cropped to ink, highlighter multiply,
  teaser holds only the top strokes.
- `lib/handwriting/__tests__/handwritingDb.test.ts` (17, `npm run test:db`): the real
  routes against Postgres — admin save/reload exact, version + 409, invalid strokes 400,
  students 403 on the admin API **and** 42501 / 0 rows writing directly as
  `ashphys_user`; the read policy shows a row to admins and to students who answered
  wrong, not to students who were only right, never answered, or anonymous; unanswered
  and correct → 403 `answer_first`; Free wrong → costs a view, opens, reopens free; out of
  views → teaser only + logged block; Pro unlimited; another student's wrong answer
  unlocks nothing; lesson tier gate first; wrong lesson 404; cleared → nothing. Passes on
  a fresh database without the 2026-10-14 migrations and on one with them; idempotent.
- Full suite: 2038 passed, 47 DB tests skipped without `TEST_DATABASE_URL` (47/47 pass
  with it: 30 existing + 17 new), 1 failed (the pre-existing live-DNS messaging test).
  `tsc` clean, `next build` clean, ESLint (`next/core-web-vitals`, ad hoc) clean on every
  new/changed file. Student bundle: `/practice/[topicId]` 42.3 → 48.4 kB (first load
  139 → 145 kB); the editor (~17 KB gzip) and viewer (~3 KB gzip) are separate lazy chunks.
- Playwright against `next start` + a local replica of the live schema (39 admin + 44
  student checks, all pass): mouse strokes autosave; a CDP pen stroke records pressure
  0.2–0.88 and turns Pencil only on; one finger then pans (no ink), two fingers pinch-zoom;
  with Pencil only off a finger draws and a second finger cancels a young stroke; zoom
  buttons, 100%, fit, Ctrl+wheel, Space+drag; highlighter, arrow, undo/redo; lasso select,
  move and Delete; pixel eraser splits a stroke, stroke eraser removes one; second page
  with lined background; reload restores the document byte-for-byte; full screen fills
  1280×800 with the floating toolbar and exits; switching question flushes an unsaved
  stroke and opens that question's own canvas; no console errors. Students: no admin UI,
  the editor chunk never loads, unanswered/correct make no handwriting request and the API
  says 403, wrong → offer → viewer (zoom, pan, Ctrl+wheel, full screen), views counted,
  2-page solution, no-handwriting fallback, out-of-views teaser + lock, Pro opens
  directly; no page scroll at 1280×800, 1024×768, 820×1180 (stacked) and 390×844
  (stacked; panel collapses; no empty panel when there is no handwriting).
- Not testable here: a physical iPad/Apple Pencil and Android device (pen and touch were
  driven through Chromium's CDP pen/touch events). Worth a quick real-device pass.

### Student progress report (NEW 2026-10-27)

Owner: "a report for each single student — weak points, strong points, what to
focus on and revise — visual, concise, understood by anyone, name in bold at the
top, a place for my own comment the student can read and know it's from me, in the
student dashboard, downloadable as PDF."

**Where it lives**
- Student: new dashboard tab **📊 My Progress Report** (`?tab=report`, 2nd tab).
  A red badge counts unread teacher notes; an unread note also makes `report` the
  default tab (it beats the remembered tab, never an explicit `?tab=`). Opening the
  tab POSTs `/api/student/report/seen`; the note keeps its "New" tag until the next visit.
- Admin: `/admin/students/[id]/report` (button "📊 Progress report & note" and
  "Report PDF" on `/admin/students/[id]`). Teacher: `/teacher/analytics/[id]/report`
  (button on their student page; only students in their sections).
  Staff see the exact student view with the note editor in place of the note.
- PDF: `GET /api/reports/me/pdf` (student) or `/api/reports/[studentId]/pdf`
  (admin / the student's teacher). Real A4 PDF from PDFKit (`lib/reports/pdf.ts`,
  bundled DejaVu fonts, traced via `outputFileTracingIncludes`), 1–2 pages. Logged as
  a `download` event with `entity_type = 'student_report'`.

**What the report shows** (`components/report/StudentReportView.tsx`, server render)
- Header: **name in bold** (all-lower-case names are title-cased), class / school /
  curricula, date, Download PDF.
- Snapshot: progress score 0–100 in a ring + level (Excellent ≥85 · On track ≥70 ·
  Developing ≥50 · Needs support; "Getting started" under 10 answers), trend chip (last
  14 days vs the 14 before, ±8 points, ≥5 answers each), 4 KPIs (questions done,
  accuracy + first-try, lessons mastered/practised, active days + time in 30 days with
  streak) and earned badges (milestones, mastered, streak, sharp shooter, first-try pro,
  unit-perfect, challenge climber, steady worker, improving).
  Score = 40% accuracy (latest answer per question) + 25% right first time + 15%
  consistency (12 active days in 30 = full) + 20% lesson progress (½ mastered share,
  ½ questions done in started lessons). Explained in a fold-out on the page and in the PDF.
- Teacher's note (amber card, "A note from your teacher", dated, signed "— <signature>",
  earlier notes folded).
- **What to do next**: the teacher's pinned focus lessons first, then the top 4 rules
  that fire (`lib/reports/insights.ts → actionPlan`): fix still-wrong questions,
  revise the weakest lesson (links its revision sheet if one exists), units (≥3 and
  ≥15% of wrong answers), recent dip, unreadable answers, challenging vs easy gap or
  "step up", retry-dependence (first-try ≥20 points below final), rushing (<25 s and
  <60%), consistency (<6 days in 30), hints (>40%), skipped, unfinished banks, or
  "keep going" for an excellent student with nothing to fix.
- Strong points / Focus areas (`rankByAccuracy`, ≥5 answers, no overlap; a "strength"
  must be ≥60%, a focus <90%), with Practise / Revision sheet / Lesson / Ask for a video.
- Charts (plain SVG): weekly right vs wrong (12 weeks), study calendar heat map (84
  days, Istanbul time), accuracy by lesson (+ by chapter fold-out), accuracy by
  difficulty, why answers were wrong (donut). Questions to go back to (top 5, still
  wrong first, Retry links). Study habits.
- Chapter labels follow the curriculum the lesson was practised in: a shared lesson
  practised from the A Level bank reads "A Level · Chapter 22 · Coulomb's law", not
  IGCSE Chapter 17 (`chapterOf` in `lib/reports/data.ts`).

**Data** (`lib/reports/data.ts → getStudentReport`): reuses `getStudentAnalytics`
(same numbers as the admin analytics block) plus per-lesson stats, daily activity,
the 14/28-day trend and notes. Reads go through the owner connection scoped to one
authorised student id — **it does not need migrations 01–05** (unlike the dashboard's
progress chips). If it fails, the tab shows a short "couldn't load" note.

**Teacher notes**: table `student_report_notes` (migration
`database/seeds/2026-10-27-student-report-notes.sql`, **applied to production
2026-10-27**): `signature` (how the note is signed, remembered per author),
`body` ≤ 4000, `focus_topic_ids` ≤ 5 (kept in the order picked, unknown ids dropped),
`read_at` (editing a note marks it unread again). RLS on, no policies (API roles see
nothing). API `app/api/reports/[studentId]/notes` (GET/POST/PATCH/DELETE): admins for
anyone, teachers for their own sections' students. POST `notify: true` (admins only)
also sends the note to the student's mailbox (and email) via `sendToSubscribers`.
Editor (`components/report/ReportNoteEditor.tsx`): starter phrases, signature,
focus-lesson picker (lessons they practised first, then every chapter), live preview
of what the student sees with read status, edit/delete history.

Tests: `lib/reports/__tests__/insights.test.ts` (16: names, score, bands, trend,
streaks, calendar, strengths/focus, every plan rule and its order, badges, note
validation), `lib/reports/__tests__/pdf.test.ts` (3: read back with pdfjs — name
before note, sections present, ≤ 2 pages; empty report 1 page; emoji stripping),
dashboard tab tests updated (6 tabs, note badge, unread note → report, seen POST).
`lib/reports/__tests__/fixture.ts` is a realistic report built through the real
insight functions. Every new SQL statement was run against production for a real
student. Full suite: only the known live-DNS test fails. `tsc`, ESLint and
`next build` clean. Checked in Chromium at 375 / 1000 / 1280 px (no horizontal
scroll) including the staff editor.

#### Handwritten notes & signatures (pen / stylus, 2026-10-27)

Owner: "a place where I can write with my pen (tablet) as a signature and as a
handwritten note, uploaded to the progress report and given to the student in the PDF."

- Note editor has **⌨️ Type / ✍️ Handwrite** tabs (both can be used; typed text shows
  first, handwriting under it). Handwrite = a lined-paper pen pad
  (`components/report/InkPad.tsx`): pressure-sensitive stylus, finger or mouse; 4 ink
  colours (blue, black, red, green), 3 pen sizes, Undo / Redo / Clear, **Full screen**
  (Escape or Done closes). `touch-action: none` so writing never scrolls the page.
  **Palm rejection:** once a stylus touches the pad, finger touches are ignored
  ("Let fingers write too" turns them back on). Coalesced pointer events for smooth lines.
- **Handwritten signature**: "✍️ Add my handwritten signature" opens a signature strip;
  it is remembered per teacher (`staff_signatures`) and pre-filled on the next note.
  The typed "Signed as" name stays as the label under it (and in emails / alt text).
- Stored as **stroke data, not images** (`lib/reports/ink.ts`): `{ v, w, h, strokes:
  [{ c: colour key, s: size, pen, p: [x, y, pressure, …] }] }`, re-validated on the
  server (pad size must match, colours from a whitelist, numbers only, clamped and
  rounded, ≤ 1500 strokes / 30 000 points). Drawn as SVG generated by our code
  (perfect-freehand pen outlines, so stylus pressure gives real thick/thin lines),
  cropped to what was written and kept at the size it was written on the pad.
  Report: `components/report/InkImage.tsx` in the note card. PDF: the same SVG via
  svg-to-pdfkit, vector (sharp at any zoom), capped at 360 pt high.
- A note needs typed text **or** handwriting. Mailbox notification for a
  handwriting-only note says "It's handwritten — open your report to read it".
- Migration `database/seeds/2026-10-27-02-report-note-handwriting.sql` (**applied to
  production**): `student_report_notes.ink`, `.signature_ink` (jsonb), body check
  relaxed to "body or ink", table `staff_signatures (user_id, ink, updated_at)`, RLS on.
- New dependency `perfect-freehand` (MIT).
- Tests: `lib/reports/__tests__/ink.test.ts` (validation incl. injected colours and
  non-numbers, outlines, cropped SVG, handwriting-only notes, PDF with handwriting and
  signature). Checked in Chromium with simulated stylus input (CDP pen events with
  varying force): pressure recorded 0.3–0.9, a finger touch after the pen ignored,
  signature saved, payload posted; full-screen opens/closes.

### Revision cheat sheets (NEW 2026-10-17: IGCSE + A Level Circular motion; 2026-10-19: A Level Gravitational fields, Coulomb's law, AS Chapter 1 one-page lesson sheets)

**2026-10-19 — AS Chapter 1 Kinematics: one ONE-PAGE sheet per lesson** (owner: "a cheat
sheet for each lesson in each chapter, MAX 1 page per lesson, do not overcomplicate it,
starting with the kinematics chapter"). Slugs `as-1-1-speed` … `as-1-8-scalars-and-vectors`
(files `lib/cheatsheets/sheets/as-1-*.ts`), one per coursebook lesson 1.1–1.8, each on its
own `topicId`. Same six-section format, slimmed: no derivations (empty sections are left
out and the numbering closes up — `sectionIsEmpty`), 1–3 boxed equations, ONE worked
sample, four practice problems, 1–2 mistakes, one tip. A sheet without `pages` is a
one-page lesson sheet and gets the compact `.cs-root--single` layout (key terms beside the
figure, step text and working side by side, text-only steps full width, unit check beside
the answer, links on one "Explore:" line). Tests: every AS sheet has exactly 1 printed
page; numbers and figures (1.4 s–t graph gradients, 1.5 components, 1.6 river triangle,
1.7 Δv triangle) are recomputed. Printed heights on US Letter: 900–965/980 px — the
budget is tight, so trim text rather than add when editing these. NEXT: Chapter 2
Accelerated motion (lessons 2.1–2.14), then the rest of AS, one sheet per lesson.

**2026-10-19 — AS Chapter 2 Accelerated motion: 14 one-page sheets** (`as-2-1-…` to
`as-2-14-…`), same one-page pattern. Figures: v–t graphs (2.4 gradients, 2.5 shaded area,
2.10 curve + tangent, 2.11 ball thrown up), light gates (2.6), tape chart (2.7), the suvat
trapezium (2.9, the only lesson sheet with a derivation; its RESULT box holds all four
equations, so it has no separate key-equations section — lesson sheets may skip that
section when a derivation boxes the result), s against t² (2.12), cliff and angled
projectiles (2.13, 2.14). g = 9.81 m s⁻² throughout; every number and figure geometry
(gradients, areas, tangent slope, parabolas) is recomputed in the tests. Template
changes (one-page sheets only): derivation steps put words and maths on one line when
they fit; four key-equation boxes share one row. All sheets: `keepUnitsTogether`
(components/cheatsheet/Math.tsx) puts non-breaking spaces inside units and between a
number and its unit, so "14 m s⁻¹" never breaks across lines. Printed heights on US
Letter: 866–968/980 px. NEXT: AS Chapter 3 Dynamics, one sheet per lesson.

**2026-10-26 — AS Chapter 6 Momentum: 7 one-page sheets** (owner: "a cheat sheet for the
momentum lessons, like the ones before"). `as-6-1-idea-of-momentum`,
`as-6-2-conservation-of-momentum` (lesson title "Conservation of momentum and
collisions"), `as-6-3-understanding-collisions`, `as-6-4-explosions-and-crash-landings`,
`as-6-5-collisions-in-two-dimensions`, `as-6-6-momentum-and-newtons-laws`,
`as-6-7-understanding-motion`; topic ids from the `topics` table (as_topic_code 6.1–6.7).
Figures: rebound from a wall, trolleys sticking, equal-mass elastic exchange, recoil from
rest, a 3-4-5 glancing collision, a third-law pair. Tests recompute every number, check
momentum and kinetic energy balance, and check the figures (arrow lengths to scale, after
arrows sum to before in 6.5, third-law pair equal and opposite). Printed heights on US
Letter 895–966/980 px.
**Fix found on the way:** a shape with `fill: 'soft'` has no outline and the print
"saver" ink mode fills it white, so a body drawn only that way disappears on paper. Bodies
(trolleys, balls, tape strips — incl. 2.6 and 2.7) are now drawn twice: soft fill + plain
outline. Use that pattern for any solid object; soft fill alone is only for shading an
area under a line. `keepUnitsTogether` also keeps "kg m s⁻¹" on one line.

**2026-10-19 — A Level Chapter 22 Coulomb's law** at `/cheat-sheets/a-level-coulombs-law`
(6 pages). Covers all five Chapter 22 lessons (22.1 its own; 22.2–22.5 via `alsoCovers`,
incl. the shared IGCSE 17.4 Coulomb lesson in its A Level role). Derivations: E = Q/4πε₀r²;
V = Q/4πε₀r, Ep = Qq/4πε₀r, ΔEp = qΔV, E = −ΔV/Δr; combining two charges (vector E,
scalar V, neutral point); electric vs gravitational fields (F_E/F_G ≈ 2.3 × 10³⁹ for p–e).
Samples: force between spheres, neutral point of +2.0/+8.0 μC (x = d/3, V ≠ 0 there),
α-particle closest approach (the r ↔ E_k swap), two hanging charged spheres (F = mg tan θ,
then Coulomb). 10 practice problems. Constants 1/4πε₀ = 8.99 × 10⁹, e = 1.60 × 10⁻¹⁹ C. Links
the Coulomb's Law Lab simulation and the 98-question bank. Charges and potential curves
are drawn in neutral ink (red/teal stay reserved for force/velocity). Template change: a
sample whose figure is not shown earlier on the sheet now shows it full size (with its
Fig. number and caption) instead of a thumbnail. Max printed height on US Letter 952/980.

**2026-10-19 — A Level Chapter 17 Gravitational fields** at
`/cheat-sheets/a-level-gravitational-fields` (6 pages), same format as Chapter 16. Covers
all seven Chapter 17 lessons (17.1 field lines is its own; `alsoCovers` 17.2–17.7, including
the shared IGCSE 24.3 lesson in its A Level role). Derivations: g = GM/r² from Newton's law;
φ = −GM/r, Ep = −GMm/r, ΔEp = mΔφ and g as the φ–r gradient; orbits (v = √(GM/r),
T² = 4π²r³/GM); geostationary radius 4.22 × 10⁷ m. Samples: g at the ISS, ΔEp from R to 2R
(and why mgh doubles it), satellite speed/period, mass of the Earth from the Moon (the
M ↔ T² swap). 10 practice problems. Constants G = 6.67 × 10⁻¹¹, M_E = 5.97 × 10²⁴ kg,
R_E = 6.37 × 10⁶ m (they give g = 9.81 at the surface); every number is recomputed in the
tests, and the figures are checked (radial lines and F point at the centre, the uniform
field is parallel and evenly spaced, the φ–r curve is ∝ −1/r with the tangent at its true
slope, v ⟂ F in the orbit). New diagram shape `curve` (open polyline) for plotted graphs.
Printed heights on US Letter: max 909/980 px. To check against the official syllabus:
whether "g = −Δφ/Δr" is examined for gravity (it is stated as the gradient of the φ–r graph).


**What it is.** A printable revision sheet per lesson *per curriculum* (simulations
are shared; sheets, like question banks, are curriculum-specific). Live sheets:
`/cheat-sheets/igcse-circular-motion` (0625 Ch.3, 4 pages) and
`/cheat-sheets/a-level-circular-motion` (9702 A Level Ch.16, 6 pages: horizontal
circles incl. banked track, vertical circles, conical pendulum).

**Format (owner's spec, 2026-10-17 revision), six sections in this order:**
01 The big picture (summarised explanation + key terms, each flagged `[syllabus wording]`
or `[paraphrase]`) → 02 Deriving the equations (one block per case, figure beside the
numbered steps, boxed RESULT) → 03 Key equations (each in its own box) + a "Symbols and
units" list → 04 Sample problems with solutions (steps, answer box; the **unit check is
NOT a step**: it sits under the answer in small muted type) → 05 Practice problems
(final answer only: "Final answer" toggle on screen, printed when "Print answers" is on,
which is the default) → 06 Other useful information (common mistakes ✗/✓, exam tips,
what the syllabus asks, links). Content that not every reader is examined on carries a
dashed violet tag (`supplement`, `a-level-only`, `beyond`, `hl-only`); A Level chapters
16+ get an "A Level only (not AS)" chip in the header automatically.

**Diagrams are precise vector SVG, not hand-drawn.** The owner rejected the Rough.js
sketch look; roughjs is removed. Diagram shapes are data (circle, ellipse, line, arrow,
dot, polygon, angle arc, right-angle mark, ✗, hatched surface, labels) with a *role*
(`force` red / `velocity` teal / `acceleration` brass / `ink` / `muted`), turned into exact
SVG paths on the server by `lib/cheatsheets/diagram.ts` (filled arrowheads, fixed stroke
widths). Math labels use the KaTeX fonts: `F_T` = F with upright subscript T, `|cos|` =
upright text. Geometry helpers for data files: `lib/cheatsheets/draw.ts` (`onCircle`,
`tangent`, `inward`, `along`, `dir`…; screen y down, angles anticlockwise on screen).

**Routes & links.** `/cheat-sheets/[slug]` (static, free, no DB), `/cheat-sheets?c=<id>`
(index with the same `CurriculumSelector` as /curriculum). Linked from the lesson page
("Revision cheat sheet" section), the curriculum page ("n printable revision cheat
sheets →") and a document icon in each covered lesson's row (row is still ONE link). A
sheet can cover more lessons than its own via `alsoCovers` (the A Level sheet covers all
seven Chapter 16 lessons, A Level only).

**Files.** Content: `lib/cheatsheets/sheets/<slug>.ts` (typed by `lib/cheatsheets/types.ts`;
**file name = slug**), registered in `CHEAT_SHEETS` (`lib/cheatsheets/index.ts`). Pages:
`pages` in the data lists each printed page as sections or item ranges
(`{ section: 'samples', from: 2 }`); a section continuing from an earlier page is headed
"(continued)". Rendering: `components/cheatsheet/` (`CheatSheetView`, `Diagram`, `Math`
(KaTeX on the server), `SheetToolbar`, `cheatsheet.css`). All component font sizes are in
`em` so the 9pt print size scales everything (a `rem` size would ignore it).

**Print & PDF.** Print CSS hides site chrome, forces the light palette, 9pt/1.4, `@page`
from the toolbar (A4 / Letter). **Download PDF** serves prebuilt vector PDFs
(`public/cheat-sheets/pdf/<slug>-<a4|letter>.pdf`, answers included) made by
`node scripts/cheatsheet-pdfs.mjs http://localhost:3100` against a local `next start`
(Chromium print engine = exactly Print → Save as PDF). The script fails if any sheet
prints to more pages than its `pages` list; the unit test fails if a data file changed
without rebuilding the PDFs (layout/CSS changes don't trip it: rebuild by hand). Every
page was measured against US Letter (the shorter paper, 259 mm printable): A Level max
951/980 px, IGCSE max 969/980 px, so a big content addition to a page will spill: re-plan
`pages`. jsPDF + html2canvas was tried and rejected (misplaced KaTeX fraction bars,
borders through text, hidden `<details>` painted; Safari taints foreignObject canvases).
~300–370 KB per PDF; move to a Storage bucket once there are hundreds.

**Physics checks** (`lib/cheatsheets/__tests__/cheatsheets.test.ts`, 45 tests): every sample
and practice number recomputed (g = 9.81 at A Level), the vertical-circle 6mg tension
difference, both conical-pendulum period formulas agree, every LaTeX string compiles,
every symbol has an SI unit, diagrams stay inside their viewBox, and diagram geometry is
physically right (v ⟂ F, F/a towards the centre, Δv parallel to the radius, N ⟂ banked
road with components N cos θ / N sin θ, both forces down at the top of a vertical circle,
conical tension at θ to the vertical pointing at the pivot). Pages cover every item once.

**Syllabus notes.** IGCSE: 1.5.1 Supplement (qualitative (a)–(c), "F = mv²/r is not
required", so F = mv²/r appears only tagged "Not examined in 0625") and 6.1.1 Supplement
(v = 2πr/T). The brief said "IGCSE Chapter 2"; the lesson is 3.7 in Chapter 3. A Level:
9702 topic 12 / coursebook 16.1–16.7; banked tracks, vertical circles and conical
pendulums are not separate syllabus items (exam applications of F = mv²/r), stated on the
sheet. The quoted syllabus wording came from secondary copies (cambridgeinternational.org
was unreachable from the sandbox): re-check against the official PDFs. IB (A.2) has no
sheet yet.

### Admin student history & activity (NEW 2026-10-16)

**`/admin/students`** (sidebar: People → Students) lists every `role = 'student'`
account: name, email, current tier (Free/Plus/Pro), subscription status and
expiry, join date, last active, questions attempted and accuracy. Search
(name/email), sort (any column) and paging (50 per page) all run in SQL
(`listStudents` in `lib/admin/students.ts`). Below `md` the table becomes cards
with a sort strip. `/admin/users` now links student names here too.

**`/admin/students/[id]`** shows:
- Profile & subscription: tier badge, status (active until / expired / revoked /
  Free plan), plan and billing cycle, start, joined, last active, last login,
  account status and device count. Links to Subscriber access, Messages and the
  existing practice drill-down (`/teacher/analytics/[id]`, which admins can open).
- Summary: questions + accuracy, topics practised / lessons opened / mastered,
  strongest and weakest chapter (by `practice_attempts` accuracy, only chapters
  with ≥ 5 answers; no "weakest" unless two qualify), estimated active time per
  week for 12 weeks (bar chart + "Show as a table"), and accuracy per chapter.
- Payment history: every `payment_requests` row (plan/course, amount claimed,
  amount read + currency, detected plan/months + confidence, status,
  `auto_approved`, reviewer, notes) and every `shopier_orders` checkout.
- Activity timeline, newest first, 50 per page (Newer/Older), filtered by date
  range and activity type (GET form, so filtered views are linkable). Page views
  are off by default because they are the noisiest source.

Times render in the viewer's timezone (`components/admin/LocalTime.tsx`; the
server pass prints UTC).

Data sources (all existing tables except where noted; `lib/admin/students.ts`
builds one `UNION ALL` from only the selected types, so unselected sources are
never scanned):

| Timeline type | Source |
|---|---|
| Account & logins | `users.created_at` (sign-up), `analytics_events` login/logout, admin account events (new, below) |
| Tier changes | `access_grants` (manual and automatic grants; `granted_by IS NULL` = receipt auto-match), revoke events (new), `subscriptions.end_date` once passed ("Paid access ran out") |
| Payments | `payment_requests` (upload + review/auto-approval), `shopier_orders` (checkout started; `status='success'` = paid), `addon_purchases`, `subscribe_click` / `paywall_shown` events |
| Lessons & sims | `analytics_events` lesson_view, simulation_start/complete, download, curriculum_select; `course_enrollments`; `activity_events` video_view **only if migration 02 is applied** (checked with `to_regclass`, cached 60 s) |
| Questions | `practice_attempts` (correct/incorrect, Q number, topic, the answer — MCQ option ids resolved to "chose B: …" — hint, try number), practice_start events, `paper_scores` |
| Solutions | `solution_access_log` (view_full / view_preview / blocked / attempted_upgrade) |
| Requests & messages | `video_requests`, `messages` sent/received (subject only) |
| Page views | `analytics_events` page_view |

Active time per week is an estimate: the gaps between consecutive recorded
actions (events, answers, solution opens) are summed when ≤ 15 minutes; longer
gaps count as breaks. The table also shows "Answering" time from
`practice_attempts.time_spent_ms` (capped at 30 min per answer). The two differ —
students often think longer than 15 minutes on one question — so both are shown.

Not found in the schema: no OMR/exam-result table, `quiz_submissions` /
`student_progress` / `simulation_interactions` are empty and unused by the app,
and `payment_requests` currently has 0 rows. Last active = the latest of
`sessions.last_seen_at`, any `analytics_events` row and any answer.

**New logging (starts 2026-10-16; there is no history before that):**
- `PATCH /api/admin/access` (revoke) → `admin_subscription_revoke` with
  `{ previous_plan }`. Grants were already in `access_grants`; revocations left
  no trace before.
- `PATCH /api/admin/users/[userId]` (role/status change of a student) →
  `admin_account_update` with `{ role?, status? }`.
- `POST /api/admin/users/[userId]/revoke-sessions` → `admin_sessions_revoke`
  with `{ revoked }` (logged for any role, shown on student timelines).

All three go to `analytics_events` with `user_id` = the admin (so daily-active
counts don't credit the student), `entity_type = 'student'`, `entity_id` = the
student (`lib/admin/studentEvents.ts`). They use `logEvent`, which swallows its
own errors, so a logging failure never fails the admin action. These event types
are not in `EVENT_TYPES`, so the public `/api/analytics/track` sink can't forge
them (a unit test pins this). No migration was needed.

Access: the pages sit under `app/admin/layout.tsx` (admin only) and read through
the server-side owner connection like every other admin page; nothing is exposed
to the browser or the Supabase API roles.

Tests: `lib/admin/__tests__/studentHistory.test.ts` (filter/sort parsing,
pagination URLs, strongest/weakest, formatting, event-type isolation),
`app/api/admin/access/__tests__/route.test.ts` (revoke logs with the right
actor/entity and still succeeds if logging fails; non-admin refused),
`app/admin/students/__tests__/pages.test.tsx` (both pages render with mocked data;
filters and pager links). Every SQL query was also run read-only against the
production database for a real student. Full suite: only the known live-DNS test
fails. `tsc` and `next build` are clean.

#### Student analytics (2026-10-17)

Clicking anywhere on a row in `/admin/students` now opens the student (the name
link stretches over the row). The list's "Questions" column counts **distinct
questions answered** (it used to count every submission, retries included);
"Accuracy" is still right answers ÷ answers submitted.

`/admin/students/[id]` opens with an analytics block
(`lib/admin/studentAnalytics.ts` → `components/admin/StudentAnalyticsPanel.tsx`),
with jump links to Questions · Time & activity · Strengths & weak points ·
Profile · Payments · Timeline:
- **Questions:** one stacked bar plus tiles. Right and wrong go by the
  latest answer to each question. Skipped means skipped and not answered
  since. Not reached means questions in the lesson banks they opened in
  practice (topic × curriculum, from their answers and `practice_start`
  events) that they neither answered nor skipped. Also: first-try right,
  answer accuracy (with retries), median time per answer, hints used,
  lessons mastered and best streak.
- **Time & activity:** last login, last active, time on site (all time, 7 and
  30 days; same gap-based estimate as before), active days, logins in 30
  days, practice sessions, lessons opened, simulations, solutions,
  downloads, video requests. Two charts: weekly time on site, and weekly
  right vs wrong answers. Both have a table view.
- **Strengths & weak points:** up to 3 strongest and 3 weakest lessons
  (`rankByAccuracy`: at least 5 answers, no overlap, ties go to the one with
  more answers). Accuracy by chapter, by difficulty (1–5) and for every
  lesson practised (★ = mastered). Also why answers were marked wrong
  (`grade_reason`: wrong value / wrong unit / unreadable / other).
- **Questions they keep missing:** the 10 with the most wrong tries, still-wrong
  ones first, with the question text and their last answer (multiple-choice
  options resolved to the option text).

Chart colours are `--viz-1`/`--viz-2` in `app/globals.css` (dataviz
palette slots 1–2, with a separately validated step for dark mode). This is the
same blue/orange as the admin overview.

**New logging: practice skips.** "Skip for now" in `PracticeSession` now
sends `practice_skip` (entity = topic, `metadata.problemId`,
`metadata.curriculum`) through `/api/analytics/track` (added to
`EVENT_TYPES`). Before this, skips lived only in the student's localStorage,
so **skip counts start on 2026-10-17**. Skips also appear on the timeline
under Questions.

### Video request submission: "Network error" (FIXED 2026-10-14)

**Root cause.** The screenshot upload was not what failed; the request insert
was. Production is running this branch's code without the 2026-10-14
migrations (see the admin section below), so `POST /api/video-requests`
(`createVideoRequest` → `withRlsContext` → `SET LOCAL ROLE ashphys_user`) threw
`role "ashphys_user" does not exist`. Vercel recorded it 11 times on
`/api/video-requests`, the last at 22:13 UTC; nothing for `/api/video-requests/upload`.
The route had no try/catch, so Next answered with an HTML 500. Both forms did
`await res.json()` on it, which threw, and the form's catch-all printed
"Network error — please try again". The upload code itself only ever returned
explicit messages. Storage was healthy: the `video-request-screenshots` bucket
exists and is private, but had no size or type limit (`file_size_limit` and
`allowed_mime_types` both null); its last object is from 10 Oct.

What changed:
- **One submit path for both forms** (`lib/videoRequests/submit.ts`, used by the
  dashboard's `VideoRequestForm` and the homepage `VideoRequestCta`), in explicit
  steps: validate (fields, jpg/png/webp) → compress only if over 4 MB (canvas,
  ≤1600px wide, JPEG 0.8, `lib/videoRequests/screenshot.ts`) → upload → save.
  Every failure names its step ("Image upload failed: …", "Could not save your
  request: …", "Image is too large (max 4 MB)") and is logged in full with
  `console.error('[video request] …')`. Raw storage or server details (keys,
  paths, SQL) are never shown. A non-JSON response is a readable failure, not a
  throw. If the upload fails but the request is still valid without the image
  (the dashboard form, or the homepage form with a question number), the request
  is saved and the student is told the image was skipped. The forms show errors
  with `role="alert"`. After success the dashboard form calls `onSubmitted` →
  `reload()`; the homepage form redirects to `/dashboard?tab=videos&request=sent`.
- **`POST /api/video-requests/upload`** now takes `{ contentType, size }`, checks
  type and size, mints the request id and returns `{ ok, requestId, path,
  signedUrl }`. The path is `{student_id}/{request_id}-{timestamp}.{ext}`, with
  the folder taken from the session. Bytes still go straight to Storage (Vercel's
  ~4.5 MB body limit never applies).
- **`POST /api/video-requests`** returns `{ ok: true, id }` or `{ ok: false, error }`
  (`success` mirrors `ok` for old callers) and has try/catch around everything.
  `student_id` comes from the session only (a body `student_id` is ignored). A
  screenshot path must be one minted for this student (otherwise 400, and it is
  never deleted), and its request id becomes the row id. If anything fails after
  the upload (validation, the open-request cap, the insert), the uploaded file is
  deleted (`lib/storage/deleteObject.ts`, service key, best effort). A double
  submit returns the same row. `GET` also returns JSON errors.
- **Student request reads and writes work on either schema.**
  `lib/videoRequests/student.ts` uses the RLS transaction once migration 03's
  `video_requests_insert_own` policy exists. Before that it runs the same queries
  as the owner, always scoped by the session's student id (what production did
  before 2026-10-14). It only selects `question_number`, `youtube_id` and the
  opens join when those exist (`lib/db/schemaFeatures.ts` gained
  `videoRequestRls` and `requestOpens`). The admin PATCH full path now also
  requires the policies.
- **Migration `2026-10-14-06-video-request-screenshots-bucket.sql`** (independent
  of 01–05): ensures the bucket exists, private, `file_size_limit` 4 MB,
  `allowed_mime_types` jpeg/png/webp. **Not applied to production.**

Tests & checks:
- `lib/videoRequests/__tests__/submit.test.ts` (15). No screenshot → no upload,
  saves. Valid screenshot → upload, PUT, save with path and id. Oversized and
  incompressible → "Image is too large (max 4 MB)" with no request sent.
  Compression uploads the smaller JPEG. Wrong type. Storage rejection hides raw
  details. 413 → size message. An optional image is skipped on upload failure; a
  required one isn't. Non-JSON 500 → "Could not save your request: …" (the
  original bug). Server reason passed through. Offline. Required fields. Plus the
  path/size rules.
- `app/api/video-requests/__tests__/route.test.ts` (7). Saves as the session
  user even with a body `student_id`; a screenshot path is stored under its
  minted id; another student's path is refused and not deleted; an insert failure
  deletes the upload and returns a readable error without "ashphys_user";
  validation-after-upload cleans up; Free tier and signed-out get JSON; homepage
  rules.
- `app/api/video-requests/upload/__tests__/route.test.ts` (5). The path format is
  in the student's own folder, a client `path` is ignored, oversized and wrong
  types are rejected, signing failures hide details, and the tier/login gate holds.
- DB (`npm run test:db`, now 30). `lib/videoRequests/__tests__/studentDb.test.ts`
  runs the real `createVideoRequest`/`getMyVideoRequests` in both RLS and
  pre-migration modes: saves without/with a screenshot (path and minted id
  stored, double submit idempotent), can't take over another student's id, and
  lists only the student's own rows. RLS refuses an insert for another
  `student_id` (42501). The dashboard DB test now also checks the bucket migration
  (it creates a minimal `storage.buckets` when the database isn't Supabase).
- Full suite 1508 passed, 30 DB tests skipped without `TEST_DATABASE_URL` (30/30
  pass with it), 1 failed (the same pre-existing live-DNS test). `tsc`, ESLint
  (16 changed files) and `next build` are clean.
- Local run as the Plus student, against both the **production-like schema** (no
  migrations) and the migrated replica, with a local stand-in for the Storage API
  (there are no Supabase keys in the sandbox; it enforces the same 4 MB /
  jpg-png-webp limits).
  - A request without an image and one with a 1170×2532 phone screenshot both
    saved and appeared under "Your requests" with no reload. The screenshot is at
    `{student}/{request_id}-{ts}.png` with `request_id` = the row id.
  - A 14.8 MB phone photo was compressed in Chromium to a 568 KB JPEG and saved.
  - An incompressible 43 MB image got "Image is too large (max 4 MB)" and nothing
    was uploaded.
  - With the open-request cap reached, the uploaded file was deleted and the
    student saw "Could not save your request: you already have 3 open video
    requests…".
  - "Network error" never appeared. One dev-mode run on a freshly started server
    saw one extra page navigation; it didn't reproduce on rerun and there were no
    page loads.

Decisions (video request submission, 2026-10-14):
- **No storage.objects policies.** The brief asks for "authenticated users insert
  into their own folder", but there is no Supabase Auth here: students never talk
  to Storage as `authenticated` (`auth.uid()` is null). Own-folder writes are
  enforced by the server minting a signed upload URL for one exact path in the
  session's folder, and own-file reads by signed read URLs minted only for the
  requester's rows. With RLS on and no policies, anon/authenticated can't touch
  the bucket. Migration 06 adds the size/type limits on the bucket instead.
- **The student fallback reverses an earlier decision.** "Student RLS paths don't
  fall back" left production unable to take requests at all. The fallback only
  applies while migration 03's policies are absent, is exactly the pre-2026-10-14
  behaviour, and still never takes the student id from the client.
- **The request id is minted at upload time** so the storage path can carry it
  (`{student}/{request_id}-{ts}.{ext}`) and the API can prove the file belongs to
  the request being saved.
- **The rollback (deleting an orphaned upload) happens on the server.** Students
  have no delete rights on Storage, and the server holds the service key.
- **"Save without the image"** only when the request still identifies the question
  (any dashboard request; homepage requests that have a question number).
- **Compression only above the limit.** Images ≤ 4 MB upload untouched (PNG
  screenshots stay sharp).
- **Old cached pages** that call the upload route with the former `{ path }` body
  get "Image upload failed: use a JPG, PNG or WebP image" until they reload.

Manual steps:
1. Apply migrations 01–05 (still the main blocker for everything else on the
   student side). Request submission no longer depends on them once this commit is
   deployed.
2. Apply `2026-10-14-06-video-request-screenshots-bucket.sql` to production
   (Supabase SQL editor or psql). It is independent and idempotent.
3. Deploy this commit.

### Admin video requests: stuck on "Loading…" (FIXED 2026-10-14)

**⚠️ Production needs action now.** On 2026-10-14 ~21:50 UTC the branch
`claude/pensive-turing-v6nkea` (e6e76c7) was promoted to production
(`dpl_GuziAqfwtXeR7RwbtZsrB8dbdreB`), but migrations
`database/seeds/2026-10-14-01..05-*.sql` were never applied to the live database
(checked: 0 RLS policies, no `lesson_videos`, no `video_requests.question_number`,
no role `ashphys_user`). Besides this page, Vercel runtime errors show the
student side failing on `role "ashphys_user" does not exist`: dashboard progress
and request list, `/api/video-requests` (students cannot submit or list requests),
and lesson-page videos. Fix: apply migrations 01–05 in order (psql loop in the
sections below), or roll production back to `main` until they are. (A
`claude/friendly-allen-1mudd4` production deploy two minutes earlier was
superseded by this one, so its curriculum redesign is not live either.)

**Root cause** (case 2 of the brief: the query throws and the error is
swallowed, so loading never ends):
- `GET /api/admin/video-requests` selected `r.question_number` and a
  `lesson_videos` subquery, both added by migration 01, which production doesn't
  have. Postgres raised `42703 column r.question_number does not exist` (Vercel
  runtime errors, 2 occurrences, 21:50–21:51 UTC). The route had no try/catch,
  so Next answered with a non-JSON 500.
- `VideoRequestManager`'s loader was `fetch` → `await res.json()` →
  `setLoading(false)` with no try/catch/finally. `res.json()` threw on the HTML
  body, the promise rejected unhandled, and `setLoading(false)` never ran, so
  "Loading…" stayed forever with no error and no list.
- Ruled out: the admin check (server-side in `app/admin/layout.tsx` and again in
  the route, never a client flag that stays null); RLS recursion (production has
  no policies at all; in the migrations the only policy helper,
  `app_is_admin()`, is SECURITY DEFINER with `search_path = public`, reads only
  `users`, which has no policies, so nothing calls back); 42501 (the admin read
  runs as the table owner). There is no `profiles` or `video_solve_requests`
  table in this project: the tables are `users` and `video_requests`.
- The admin save (`PATCH`) would also have failed in production, since it runs
  under the `ashphys_user` role that doesn't exist yet.

What changed:
- `components/admin/useAdminVideoRequests.ts` (new): `loadAdminVideoRequests()`
  never throws: network errors, non-JSON bodies and JSON errors become
  `{kind:'error', message}`, and 401/403 become `{kind:'unauthorized'}`.
  `useAdminVideoRequests()` uses try/catch/finally with a cancelled flag (unmount
  or a newer load), and `setLoading(false)` is in `finally`. The fetch
  implementation is kept in a ref so a changing prop can't restart the load (the
  first version of this hook looped forever on an inline `fetchImpl`; the tests
  caught it).
- `components/admin/VideoRequestManager.tsx`: explicit states. Loading
  (`role=status`); error (`role=alert`, the server's message, "Try again"); "Not
  authorized" (`role=alert`, no rows); "No requests yet."; and the list. Each row
  shows the student's name, email and short ID (`#22222222`, full ID on hover).
  Saving reloads the list, so the row updates.
- `app/api/admin/video-requests/route.ts`: works on both schemas via
  `lib/db/schemaFeatures.ts` (cached 60 s, so applying the migrations takes effect
  without a redeploy). Explicit columns, `ORDER BY r.created_at DESC` (was "open
  first"), `studentId` in each row, 401 for no user and 403 for non-admins.
  Every failure is a JSON `{success:false, error}`, and a failing screenshot link
  no longer fails the whole list. `PATCH` before the migrations updates
  status/link/note as the owner (`youtube_id` too once that column exists), and
  "add to a lesson" returns 409 with an explanation. After the migrations it uses
  the same RLS transaction as before.

Tests & checks:
- `components/admin/__tests__/VideoRequestManager.test.tsx` (12, jsdom). The loader
  maps JSON errors, a non-JSON 500 (the original hang), network failures, and
  401/403. The hook ends loading on error, a missing user, success and a non-JSON
  body. The component shows the alert instead of "Loading…", "Not authorized" with
  no rows, "No requests yet.", and a row with the student name and ID.
- `app/api/admin/video-requests/__tests__/route.test.ts` (10). Non-admin → 403
  "Not authorized" with no rows and no query; missing user → 401. The
  pre-migration SQL doesn't mention `question_number` or `lesson_videos`, isn't
  `SELECT *`, and orders by `created_at DESC`; the migrated SQL does include the
  new columns. A query failure returns a JSON error. On PATCH: pre-migration
  save, `youtube_id` once available, 409 for lesson attach, non-admin, bad link.
- Full suite: 1481 passed, 20 DB tests skipped without `TEST_DATABASE_URL` (20/20
  pass with it), 1 failed (the same pre-existing live-DNS messaging test). `tsc`
  clean, `next build` clean, ESLint clean on the changed files.
- Local run, twice: against a copy of the **current production schema**
  (`ashphys_prodlike`, built from the live DDL snapshot) and against the migrated
  replica. As admin, the list loads with no error; I opened a student's request,
  set it fulfilled, pasted `https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=…`, added
  a note and saved. The PATCH returned 200, the row badge changed to fulfilled,
  and after a reload it was still fulfilled with the link stored as
  `https://youtu.be/dQw4w9WgXcQ` (plus `youtube_id` on the migrated DB). A student
  calling the admin API gets 403 "Not authorized" and no rows.

Decisions (admin video requests fix, 2026-10-14):
- **No RLS change and no migration.** The cause was schema drift plus an
  unguarded loader, not recursion or a denial. `is_admin()` from the brief was not
  added: `app_is_admin()` already exists (migration 03) and is
  non-recursive, and it reads `users.role` because there is no Supabase Auth
  `app_metadata`.
- **The admin API degrades instead of requiring the migrations.** The admin is
  verified server-side, so the pre-migration fallback (owner query, original
  columns) is safe. Student-facing row-level-security paths deliberately do not
  fall back, because that would silently skip RLS. They need the migrations.
- **Order is newest first only** (the old "open first" ordering was dropped, per
  the brief); the status chips still filter.
- **Migrations were not run against production by this session.** They
  create a role and RLS policies on the live database, the documented MCP
  `execute_sql` hang on any `;` makes the multi-statement files impractical to
  send that way, and this sandbox has no `DATABASE_URL`. This is the manual step
  above.

### Student dashboard: two-column tabs (NEW 2026-10-14, not yet deployed)

Replaces the single-column dashboard from the section below. **Needs migration
`database/seeds/2026-10-14-05-video-request-ids-and-opens.sql`, applied after 01–04**
(none of 01–05 are in production yet; checked 2026-10-14: 0 policies, no
`lesson_videos`). Same psql loop as below, now `0{1,2,3,4,5}`.

What changed:
- **Layout** (`app/dashboard/page.tsx` → `components/dashboard/DashboardTabs.tsx`):
  the page header (welcome, progress chips, My Devices / Log out) above a
  two-column card filling the viewport (`h-[calc(100dvh-9.5rem)]`, min 34rem).
  Left: a 280px vertical tab list. Right: the panel, scrolling on its own. Below
  `lg` the list becomes one horizontal scrolling tab bar (the selected tab is
  scrolled into view) and the panel fills the rest. Tab buttons are ≥ 44px; works
  at 360px (checked).
- **Tabs, in order**: Messages ✉️, Browse the Curriculum 📖, Join a Class 🏫,
  Video Solve Requests 🎥, 1-on-1 Tutoring 🧑‍🏫, each with icon, title,
  description, active state. Badges: unread messages (existing `useUnreadCount`),
  ready videos (fulfilled, with a video, not opened). Each panel mounts the
  existing feature component: `StudentInbox`; `LessonCard` (via
  `CurriculumTab`); `JoinClassForm`; `VideoRequestForm`; the tutoring booking
  flow (`TutoringPanel` → `TutoringBooking`). Only the active panel is mounted.
- **Routing/state** (`lib/dashboard/tabs.ts`, pure): `?tab=messages|curriculum|
  classes|videos|tutoring`. A valid param wins; an invalid one falls back to the
  default; no param → last tab from localStorage (`ashphys:dashboard-tab`); else
  `videos` if an unopened ready video exists, otherwise `messages`. Changing tabs
  uses `history.replaceState` (no history entries; refresh keeps the tab).
- **Old routes redirect** to the matching tab: `/dashboard/messages` (sent emails
  link here; the `#m-<id>` fragment survives), `/dashboard/join-class`,
  `/video-requests` (keeps `?lesson=`), `/tutoring`. In-app links (navbar mail
  icon, help button, pricing teasers, unsubscribe pages, homepage CTA) now point at
  `/dashboard?tab=…` directly.
- **Video Solve Requests tab** (`VideosTab`, `VideoRequestsGrid`): the existing
  request form (Free tier still gets the same upsell instead), then "Your requests"
  newest first in a 1/2/3-column grid with All / Ready / In progress / Declined chips
  (with counts). Cards: chapter + lesson, question (number + text), status badge,
  date; declined cards show the admin note. Fulfilled cards show
  `https://i.ytimg.com/vi/{id}/hqdefault.jpg` with a play icon, alt "Video for
  <lesson>: <question>". Clicking swaps in the player (the form is hidden, not
  unmounted; panel scrolls to top; focus on "← Back to requests"); the iframe is
  created only then, `…youtube-nocookie.com/embed/{id}?rel=0&modestbranding=1&playsinline=1&autoplay=1`,
  with the "Open on YouTube" fallback under it and the teacher's note.
- **`useMyVideoRequests`** (`components/video-requests/useMyVideoRequests.ts`,
  new — it did not exist before): GET `/api/video-requests`; a 401 inside the
  loader → `signed-out`; loads on mount, again on window focus / tab visible;
  `reload()` (called after a successful submit); server-rendered initial data.
  Lives in the tab shell so the badge and the tab share it.
- **Opened tracking**: table `video_request_opens (student_id, request_id,
  youtube_id, opened_at)`, PK (student, request); `POST /api/video-requests/:id/opened`
  on play. It remembers which video was opened, so if an admin swaps the video
  the request counts as ready again.
- **YouTube id on admin save**: new column `video_requests.youtube_id` (CHECK 11
  chars), written by `PATCH /api/admin/video-requests` from the existing parser;
  migration 05 backfills it from `youtube_url` (the 3 live rows are youtu.be
  links). `youtube_url` is kept.
- **Curriculum tab** (`CurriculumTab`): the student's curriculum (account →
  cookie → IGCSE, with a switcher that saves the preference like /curriculum does),
  chapters/units as a list with the student's accuracy; choosing one lists its
  lessons (existing `LessonCard`) in the panel with "← All chapters". Strengths /
  "Needs work" (revise + request-a-video links) and the "Start with a lesson" note
  sit at the top.
- **Tutoring tab** (`TutoringPanel`, moved from `/tutoring` unchanged plus "Your
  bookings", `GET /api/tutoring/bookings`, refreshed on focus). "Book & Pay" opens
  Shopier's payment page in a **new tab** (opened on the click so popup blockers
  allow it; falls back to the same tab if blocked), so the dashboard stays open and
  the booking shows up when the student comes back.

Tests & checks (2026-10-14):
- `lib/dashboard/__tests__/tabs.test.ts` (11): order, valid param, invalid → default
  (not storage), storage when no param, corrupt storage, ready-video default.
- `components/dashboard/__tests__/DashboardTabs.test.tsx` (8, jsdom): URL param →
  active tab + URL/storage, invalid → default, storage, replaceState (no new history
  entry), tablist/tab/tabpanel ARIA + arrow/Home/End keys, unread badge, ready badge
  rising after a focus refetch.
- `components/dashboard/__tests__/VideoRequestsGrid.test.tsx` (5, jsdom): fulfilled →
  thumbnail with alt and no iframe; click → autoplay nocookie iframe, fallback link
  only, back; nothing YouTube for unfulfilled; filters + decline note; card fields.
- DB tests (+3, now 20, `npm run test:db`): another student's requests are invisible
  even when asked for by id; a student can mark only their own video opened; id
  CHECK + backfill.
- New dev deps: `jsdom@25.0.1`, `@testing-library/react@16.1.0`,
  `@testing-library/dom@10.4.0` (component tests opt in with `// @vitest-environment jsdom`).
- Full suite: 1459 passed, 20 DB tests skipped without `TEST_DATABASE_URL`, 1 failed
  = the same pre-existing live-DNS messaging test. `tsc` clean, `next build` clean
  (font stub, restored), ESLint (`next/core-web-vitals`, ad hoc) clean on all 39
  changed files.
- Local walkthrough (Playwright, 37 checks, all pass): default tab = Videos with a
  ready video; every tab by click, ArrowUp/Home; chapter → lessons → back; refresh,
  storage and invalid-param fallbacks; the four old routes redirect; submit from
  the tab appears under In progress; **admin fulfils it while the student's page
  stays open; on focus the badge goes 1 → 2 and the new thumbnail is under Ready**;
  click → iframe with autoplay, only the fallback link, teacher note; badge back to
  1 and still 1 after reload; Book & Pay opens a new tab and the dashboard stays;
  360px: 44px tabs in one scrolling row, panel inside the width.

Decisions (dashboard tabs, 2026-10-14):
- **Table/hook names in the brief vs this codebase**: there is no
  `video_solve_requests` table (it is `video_requests`) and there was no
  `useMyVideoRequests` hook (created). The brief's "select policy restricts reads to
  `student_id = auth.uid()`" cannot hold here: there is no Supabase Auth, so
  `auth.uid()` is always null. The equivalent, confirmed, is migration 03's
  `video_requests_read`: `USING (student_id = app_current_user_id() OR app_is_admin())`
  for the `ashphys_user` role, and every student read of requests goes through
  `withRlsContext`. **No existing RLS policy was changed**; migration 05 only adds
  policies on the new `video_request_opens` table (own read/insert/update; admin read).
- **"Opened" in a table, not localStorage**, so the badge is right on every device.
- **"In progress" chip = open + in_progress** (both still waiting); "Ready" =
  fulfilled with a video (opened or not; unopened ones carry a "New" tag).
- **`/curriculum` is NOT redirected**: it is the public, logged-out curriculum page
  (navbar, search, SEO). Only the dashboard's own "View Curriculum" became a tab.
- **Where the previous dashboard's progress went**: streak / answered / accuracy /
  lessons chips in the header; strengths, needs-work and per-chapter accuracy in the
  Curriculum tab. The per-lesson accuracy table was dropped (per-chapter accuracy is
  shown when browsing). The SQL functions are unchanged.
- **Free tier on the Videos tab** sees the same upsell as the old page, plus their
  own earlier requests (the old page hid them; the previous dashboard showed them).
- **Tutoring "without leaving the page"**: Shopier's payment page cannot be embedded
  (it is a full-page form POST to Shopier), so it opens in a new tab and the
  dashboard stays; `TutoringBooking` gained a `checkoutInNewTab` prop (default off).
  The known 509 / OSB caveats above still apply to the payment itself.
- **Moves, not rewrites**: `JoinClassForm` (from the join-class page; `onDone`
  replaces "Go to Dashboard" when embedded; `autoFocus` dropped so opening the tab
  doesn't steal focus from the tab list), `TutoringPanel` (from `/tutoring`),
  `getVideoRequestFormOptions` (from `/video-requests`). `VideoRequestForm` lost its
  built-in list (now the grid) and gained `onSubmitted`.
- **Client-safe modules** (found while running it: `LessonCard` pulled `pg` into the
  browser): tier constants/`tierName` → `lib/subscriptions/tiers.ts` (re-exported
  from `getUserTier.ts`), request types/`readyVideoCount` →
  `lib/videoRequests/types.ts`, `formatPercent`/`isNewStudent` → `lib/dashboard/format.ts`.
- **Help button hidden on `/dashboard`** (both of its links are tabs there).
- Removed `components/video-requests/VideoRequestList.tsx` (replaced by the grid).

Unfinished / follow-ups (dashboard tabs):
- Apply migrations 01–05 in order, then deploy (manual).
- Tiers for existing students are unchanged; Plus/Pro is needed for the request form.
- The tab height uses a fixed allowance for the navbar and page padding
  (`100dvh - 9.5rem`); a much taller navbar would need that number adjusted.
- Thumbnails/videos render black in this sandbox (no YouTube access); real
  browsers load them.
- Locally "Book & Pay" reports "Shopier is not configured" (no keys here); the
  new-tab flow itself was verified.
- Still pre-existing: navbar can show "Sign In / Sign Up" right after login until a
  reload; the homepage is ~411px wide at 375px.

### Lesson videos, student dashboard & hero request CTA (NEW 2026-10-14, not yet deployed)

**Migrations are written but NOT applied to the live Supabase project.** Apply them
(in order) before deploying this code — see "How to apply" below. Without them,
lesson pages just show no videos and the dashboard shows a "couldn't load" note, but
submitting a video request (which now runs under row-level security) fails, so the
migrations are a hard prerequisite for the deploy.

What shipped:
- **Lesson videos.** Table `lesson_videos` (id, lesson_id → `topics`, youtube_id
  CHECK `^[A-Za-z0-9_-]{11}$`, title, description, sort_order, is_published,
  source_request_id → `video_requests`, created_at, updated_at; unique
  (lesson_id, youtube_id)). `lib/youtube/videoId.ts` → `parseYouTubeId()` /
  `extractYouTubeId()` accept youtu.be, watch?v=, embed/ (incl. youtube-nocookie),
  shorts/, live/, /v/, m./music./www., with or without https and `si=`/`t=`/`list=`
  params; everything else (other hosts, look-alikes, channels, playlists, bare ids,
  wrong-length ids) is rejected with a readable error. `components/video/YouTubeEmbed.tsx`:
  `https://www.youtube-nocookie.com/embed/{id}?rel=0&modestbranding=1&playsinline=1`,
  16:9 (`aspect-video`), `loading="lazy"`, small "Open on YouTube" fallback link.
  `/lessons/[topicId]` has a **Video lessons** section (published, sort_order);
  Free tier/visitors see titles + a lock and upgrade link — the ids are never
  rendered for them. Admin: `/admin/lesson-videos` (sidebar → Content): paste link
  (validated live, embed preview before saving), lesson picker grouped by chapter,
  title, description, order, published; list with rename/reorder/publish/remove.
  API `app/api/admin/lesson-videos/route.ts`.
- **Fulfilled requests → lessons.** `/admin/video-requests` editor validates the
  link with the same parser (stored normalised as `https://youtu.be/{id}`), shows a
  preview, and offers an optional "Also add this video to a lesson" picker (empty by
  default; a one-click "Use the requested lesson" helper) plus "Publish on the lesson
  page now" (off by default → draft). Creates or links the `lesson_videos` row
  (`upsertLessonVideo(..., 'link')`): an existing row for the same lesson+video keeps
  its title/order and only gains `source_request_id`.
- **Student dashboard** `/dashboard` (server component now; login required by
  middleware + page): progress overview (questions attempted, accuracy, lessons
  visited, study days), current/longest streak, strengths & weaknesses (each weakness
  links to its weakest lesson and to `/video-requests?lesson=<id>` prefilled), chapter
  breakdown with per-lesson table (`<details>`), My video requests (newest first,
  fulfilled ones play inline with the teacher's note), shortcuts. New students get a
  "Start with a lesson" card instead of zeros. Success banner on `?request=sent`.
  The stale placeholder tiles ("0 / 25", "Course Coming Soon … August 24, 2026") were removed.
- **Data/aggregation in SQL**: `get_student_progress(student_id)` and
  `get_student_streaks(student_id, now, tz)` return plain jsonb; `student_study_days()`
  is the shared day set. `activity_events` (student_id, type lesson_view|video_view,
  lesson_id, created_at) is fed by `POST /api/activity` (cookie-derived student,
  30-min de-dupe per student/type/lesson): lesson page mount, and the first click
  into an embed (window-blur trick, since iframe clicks are invisible).
- **Hero CTA** (`components/home/VideoRequestCta.tsx`): "Stuck on a question? Tell
  us, and we'll record the walkthrough." + subline + button. Opens a dialog
  (portalled to `<body>`): visitors → log in / sign up; Free → Plus/Pro upgrade
  prompt; Plus/Pro → form (lesson picker grouped by chapter, loaded from
  `GET /api/video-requests/lessons` only when opened; question number OR screenshot
  via the existing signed-upload flow; description ≤ 500 chars) → POST
  `/api/video-requests` → redirect `/dashboard?request=sent`. On phones the CTA sits
  directly under the headline (flex `order`), from `sm` up after the main buttons.
  Verified above the fold at 375×667, 360×740, 390×844.
- **No YouTube links for students** except the fallback: `GET /api/video-requests`
  now returns `youtubeId` (fulfilled only), never the URL; `/video-requests` and the
  dashboard share `components/video-requests/VideoRequestList.tsx` (embeds). Past
  paper "Video Solution" and course-module videos now play inline when the URL is
  YouTube (non-YouTube URLs keep their link). Admin pages still show raw links.
- **Real row-level security** (`lib/db/rls.ts` → `withRlsContext(user, fn)`): see Decisions.

Files: migrations `database/seeds/2026-10-14-0{1..4}-*.sql`; `lib/youtube/`,
`lib/db/rls.ts`, `lib/videos/`, `lib/videoRequests/student.ts`, `lib/activity/`,
`lib/dashboard/data.ts`; `components/video/`, `components/home/VideoRequestCta.tsx`,
`components/admin/LessonVideoManager.tsx`, `components/analytics/ActivityTracker.tsx`,
`components/video-requests/VideoRequestList.tsx`; `app/admin/lesson-videos/`,
`app/api/activity/`, `app/api/admin/lesson-videos/`, `app/api/video-requests/lessons/`;
edited: lesson page, dashboard, homepage, `/video-requests` (+ `?lesson=` prefill and
a question-number field), admin video requests (API + manager), AdminSidebar,
PastPaperCard, `courses/[slug]`.

How to apply the migrations (in order; each is idempotent):
```
for f in database/seeds/2026-10-14-0{1,2,3,4,5}-*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```
(or paste each file into the Supabase SQL editor / `apply_migration`, in order). Run
as the same role the app connects as (`postgres`): migration 03 creates the NOLOGIN
role `ashphys_user` and grants the connecting role `SET` on it. Note the "bare `;`
hangs the MCP tool" gotcha above — these files contain semicolons, so prefer psql or
the SQL editor over `execute_sql`. Then deploy.

Tests & verification (2026-10-14):
- `lib/youtube/__tests__/videoId.test.ts` — 61 tests (all formats, invalid input, URL builders).
- `lib/dashboard/__tests__/dashboardDb.test.ts` — 17 DB tests, skipped unless
  `TEST_DATABASE_URL` points at a throwaway Postgres 15+ (`npm run test:db`; loads
  `database/tests/base-schema.sql` — a trimmed snapshot of the live tables — if the
  DB is empty, then the migrations): Istanbul-midnight streak boundary (23:30 vs
  00:30, alive at 23:59 "yesterday", dead at 00:01), current vs longest, the 5-attempt
  threshold (5 counts, 4 doesn't, <2 qualifying → no labels, never both labels,
  weakest lesson), and RLS isolation (each student sees only own rows in
  practice_attempts / question_attempts / activity_events / video_requests; cannot
  aggregate, insert for, or fulfil others; `users` unreadable; admins see all and
  write lesson_videos; students/visitors see published videos only and cannot write).
  Ran green against a local PG16 replica built from the live schema DDL (non-superuser
  `postgres` owner, like Supabase).
- Full suite: 1435 passed, 17 DB tests skipped, 1 failed — the pre-existing live-DNS
  messaging test (`student@gmail.com` MX lookup), which fails in this sandbox without
  any change. `tsc --noEmit` clean. `next build` clean (font-stub workaround, restored).
- ESLint: the repo has no ESLint config, and adding `next/core-web-vitals` makes
  `next build` fail on many pre-existing `react/no-unescaped-entities` errors in the
  simulations, so no config was committed. All 31 new/changed TS files lint clean
  (zero warnings) with `next/core-web-vitals` applied ad hoc.
- Local walkthrough (Next dev + Playwright against the replica, all passed): admin
  rejects a Vimeo link, previews and attaches a video to 3.7 Circular motion; Plus
  student sees the nocookie lazy embed and only the fallback link; Free student sees
  the lock and the video id is absent from the HTML; Free hero CTA → upgrade prompt;
  Plus hero CTA → form validation → `/dashboard?request=sent`; admin fulfils with a
  link + note and links it to the lesson as a draft (not shown on the lesson page);
  dashboard plays it inline with the note. (YouTube itself is unreachable from the
  sandbox, so the players render black there.)

Decisions (2026-10-14):
- **"Lesson" = `topics` row**, so `lesson_videos.lesson_id` → `topics(id)` (the
  `lessons` table is still empty, unused schema).
- **No new `question_attempts` table.** `practice_attempts` already records every
  answer (append-only, source of truth since 2026-09-22). A `question_attempts`
  *view* (`security_invoker`) exposes it in the requested shape (question_id,
  lesson_id, attempted_at…). Chapter grouping uses the lesson's chapter, falling back
  to the attempt's.
- **`activity_events` instead of reusing `analytics_events`**: the latter has
  anonymous rows, fires lesson_view for every topic *listed* on a chapter page, and is
  due a 12-month prune.
- **RLS that actually applies.** The app connects as the owner (bypasses RLS) with its
  own JWT (no `auth.uid()`), so policies are written for a NOLOGIN role
  `ashphys_user` and `current_setting('app.user_id')`; `withRlsContext` does
  `BEGIN; SET LOCAL ROLE ashphys_user; set_config('app.user_id', …, true)` per
  request. Admin = `users.role` looked up by a SECURITY DEFINER `app_is_admin()`, never
  a client value. Policies are scoped `TO ashphys_user`, so Supabase's anon /
  authenticated roles still see nothing. Read-only policies were added on topics,
  chapters, courses (for joins) and student-own policies on the existing
  practice_attempts and video_requests (plus admin UPDATE on video_requests). Owner
  queries elsewhere are unchanged. The RPCs also refuse (42501) to aggregate anyone
  but the caller unless admin.
- **Video tier gate = the solve-request gate**: Plus/Pro (`getUserTier() >= TIER_PLUS`)
  watch; Free and visitors get the lock; admins always see videos. Fulfilled request
  videos on the dashboard are shown to whoever made the request (they were Plus when
  they asked).
- **Strengths/weaknesses**: chapters need ≥ 5 attempts; nothing is labelled until 2
  chapters qualify; strengths = top min(2, ceil(n/2)), weaknesses = bottom
  min(2, n − strengths) — exactly top 2 / bottom 2 from n ≥ 4, never both labels on one
  chapter. Ties: accuracy, then more attempts, then chapter number. A weakness links to
  its lowest-accuracy lesson.
- **Streak**: a day counts if it has an attempt, lesson view or video view, in
  Europe/Istanbul local date; alive if the last such day is today or yesterday.
  "Lessons visited" = distinct lessons viewed or practised. "Study days" = distinct
  such days.
- **Request form**: the homepage form requires a lesson and a question number or a
  screenshot (`requireQuestion`); the older `/video-requests` form stays optional-field.
  New nullable column `video_requests.question_number`. Screenshot paths must sit
  under the student's own folder.
- **Fulfilment never auto-publishes**: attaching to a lesson is opt-in per save and
  defaults to a draft.
- **Migrations live in `database/seeds/` with a date prefix**, like every earlier
  schema change (there is no separate migrations folder); numbered 01–04 for order.
- **Not applied to production by this session**: they need to ship together with the
  code; applying is listed as a manual step.
- **Hero**: on phones the h1 is `text-3xl` (was 4xl) and the top padding `pt-8` (was
  16) so the CTA fits above the fold; desktop unchanged apart from the CTA card.
- **ashphyss (stale mirror) not touched** — per "Live site", Vercel builds `ashphys`.

Unfinished / follow-ups:
- Apply the four migrations, then deploy (manual).
- Tiers for existing students are unchanged: video lessons and requests need an active
  Plus/Pro `subscriptions` row (grant via `/admin/access`). Students without one see
  the locks.
- No lesson videos exist yet — attach them at `/admin/lesson-videos`.
- Streak history starts now: lesson/video views before 2026-10-14 were not logged in
  `activity_events` (practice attempts do count retroactively). Old `analytics_events`
  lesson_view rows were deliberately not backfilled (see the coarse-event note above).
- `video_view` is recorded on the first click into the player, not on actual playback
  (no YouTube IFrame API).
- Pre-existing, noticed while testing, not fixed: at 375px the homepage/dashboard
  document is ~411px wide (navbar "Sign Up" button clipped) — same on the untouched
  homepage; and after logging in, the navbar can still show "Sign In / Sign Up" until a
  full reload (login uses `router.push` without `router.refresh()`).

### Curriculum view redesign (NEW 2026-10-14, not yet deployed)
- `/curriculum?c=` now looks like a Khan Academy course page. Presentation only: same
  queries, same routes, no table or column dropped or renamed. Data loading
  (`getLessonsByCurriculum` + `groupLessons`) and the curriculum selector are unchanged.
- `components/curriculum/ChapterCard.tsx` (client): one card per chapter/unit — `<section>`
  with an `<h2>` holding a `<button aria-expanded aria-controls>` ("Chapter n" label + title,
  chevron), the AS/A Level/IB level badge on the right. Starts expanded; collapsed chapters
  are remembered in localStorage `ashphys-curriculum-collapsed:<userId|guest>` (a JSON list of
  `<curriculum>:<unit key>`, read after mount so SSR markup matches, all access try/catch'd).
  IGCSE cards keep a "Chapter overview →" link to `/curriculum/[chapterId]` (the old title link).
- "Chapter mastery: X%" + info tooltip (role=tooltip, opens on hover/focus) only when the
  student has a `topic_mastery` row for a lesson in that chapter; hidden otherwise (never 0%).
  X = mastered lessons ÷ lessons in the chapter with practice questions in this curriculum
  (plus any already mastered through another bank). New query `getLessonProgress()` in
  `lib/curricula/queries.ts` (read-only, `topic_mastery`); the page passes each card only its
  own lessons' rows.
- Lessons: two columns from 900px (`min-[900px]:grid-cols-2`), one column below. On mobile
  the two column wrappers are `display: contents` and each piece carries CSS `order`, so the
  single column reads in the original lesson order. Layout logic is pure and tested:
  `lib/curricula/courseLayout.ts` (`lessonKind`, `lessonNumber`, `subTopicGroups`,
  `balanceColumns`, `chapterMastery`).
- `components/curriculum/LessonRow.tsx`: one line per lesson — type icon, number, title
  (truncated), muted right meta ("20 questions", plus a check when mastered or a progress
  ring for best run ÷ 5 otherwise). The whole row is ONE link to the same route as before,
  `/lessons/<id>?c=<curriculum>` (`lessonHref`, moved here from the deleted `LessonCard.tsx`),
  with a focus ring. The per-row "Practice", simulation and "Open lesson →" buttons are
  gone; the lesson page already links to that curriculum's practice bank, the other banks
  and the shared simulations. The row's description moved into the link's `title` tooltip
  (`topics.description`, else the syllabus reference) and `topics.description` is now shown
  on `/lessons/[topicId]` too (newly selected in `LESSON_COLUMNS`). Rows are 40px tall
  from 900px and at least 44px below. Icons are `role="img"` with aria-labels
  (`components/curriculum/LessonIcons.tsx`).
- Locked lessons (tier < `required_tier`, admins never locked) keep the same rule and the
  same link; the right-hand meta is replaced by a lock icon labelled "Locked: requires Plus".
  `tierName`/tier constants moved to DB-free `lib/subscriptions/tierNames.ts` (re-exported
  from `getUserTier.ts`, so every existing import still works) because the row now renders
  inside a client component.
- No search/filter existed on the curriculum page (only the navbar site search, untouched),
  so there was nothing to carry across the columns.
- Tests: `lib/curricula/__tests__/courseLayout.test.tsx` (14): column balance property test
  (500 random chapters: column row counts differ by at most one unsplit group, nothing lost or
  reordered, only groups larger than half a chapter are split), sub-topic grouping, type and
  number mapping, mastery hidden without data, the row links to `/lessons/<id>?c=as` and is
  the only link, locked rows keep the link, and a Tailwind compile of the rendered card proving
  one flex column below 900px and a two-column grid from `@media (min-width: 900px)`.
- Verified 2026-10-14 against a local Postgres replica of the live AS chapters 1–3 + Maths
  (exported read-only; one lesson locked and two practice records added locally only):
  Chapter 1 Kinematics at 1280px = two columns of 4 rows, 40px rows; at 390px = one column,
  44px rows, original order. Before/after HTML of the old and new page for the same student:
  all 36 lessons keep the identical lesson link and lock state. Collapse survives a reload.
  `next build`, `tsc --noEmit` clean; the repo-wide eslint count (32 pre-existing, none in
  these files) is unchanged. NOTICED, not touched: the site navbar is ~411px wide at a
  390px viewport (horizontal scroll on every page, e.g. /about), pre-existing.

### Dark mode (NEW 2026-10-14, not yet deployed)
- Theme = light / dark / system. `data-theme` on `<html>` (set before first paint by the
  inline script in `app/layout.tsx`; choice stored in localStorage `ashphys-theme`, all
  access try/catch'd). No attribute = follow the OS (`prefers-color-scheme`). Toggle:
  `components/ThemeToggle.tsx` in the navbar.
- Colours are CSS variables: `app/theme.css` (neutral + accent palettes, RGB triplets) and
  `app/theme-hex.css` (one `--h-rrggbb` per hard-coded hex that used to be written
  `bg-[#rrggbb]`; GENERATED by `python3 scripts/theme-hex-vars.py`, also writes
  `app/theme-hex.json` for Tailwind). `tailwind.config.ts` points `gray-*`, `black`,
  `bg-white`, pale accent shades and `bg-h-*/text-h-*` at those variables, so existing
  classes flip with the theme. `text-on-ink` = text on a `bg-black/gray-900` fill.
  New hard-coded hex: write `bg-h-xxxxxx` / `rgb(var(--h-xxxxxx))` and re-run the script.
- `.theme-light` pins the light palette inside regions that are dark by design (home
  curriculum band, hero video, pricing "pro" card, Equation Rearranger player).
- Canvas sims draw through `themedContext()` (`lib/theme/canvas.ts`), which resolves
  `rgb(var(--h-..))` colours; they repaint on `THEME_CHANGE_EVENT`. WebGL scenes
  (`three/stage.ts`) recolour materials via `lib/theme/darkVariant.ts` (kept in step with
  the CSS variables by `lib/theme/__tests__/darkVariant.test.ts`).
- Not themed: pixel colour ramps (Spring heat ramp, Gas Laws temperature ramp), the
  self-contained interactive-solution HTML in iframes, PDFs/emails, Next's built-in error page.

### 17.4 Coulomb's law now visible in A Level and IB (2026-10-13)
- The 17.4 lesson is ONE shared topic (`c6c1d1f5-…`) listed in IGCSE, A Level
  (22.2) and IB (D.2), but every question was filed under `curriculum_id =
  'igcse'`, so the A Level and IB lesson pages said "There are no practice
  questions for this lesson yet" (the practice bank is per curriculum).
- `database/seeds/2026-10-13-coulomb-17-4-shared-banks.sql` copies the IGCSE
  bank into an A Level bank and an IB bank inside the database (INSERT …
  SELECT, md5-derived ids, idempotent): 98 questions each, numbered 1–98 —
  Q1–58 plus the whole CHALLENGING tier incl. the 23 suspended-charge
  problems and their figures (IGCSE Q60–99 = A Level/IB Q59–98). The Q59 stub
  (no answer) was not copied. topic_code 22.2 / D.2, syllabus_cite
  "9702 coursebook 22.2 · Coulomb's law" / "IB D.2 Electric and magnetic
  fields". Applied 2026-10-13, verified: 196 copies identical to their
  sources (text, answer, tolerance, explanation, figure, marks, options,
  solution link). Live lesson pages now show 98 A Level / 98 IB questions.
- The banks are copies: a future edit to an IGCSE 17.4 row must be repeated
  on its A Level and IB copies (find them via the md5 id in the seed).

### 17.4 Coulomb CHALLENGING tier, Q60–Q99 (NEW 2026-10-13)
- 40 new questions appended to the IGCSE bank of "17.4 Coulomb's law
  (extension)" (topic `c6c1d1f5-…`), all difficulty 4–5, which the worksheet
  PDF tags CHALLENGING (the practice page shows 4+ as "Stretch", exactly like
  the existing Q44/46/47/58). The bank is now 99 rows. **Numbering starts at
  Q60, not Q59**: the bank already had a Q59 — an unanswered "(a)/(b) four
  charges on a square, side d" stub (answer_correct NULL, created 2026-09-27,
  linked to the "Four Charges on a Square" interactive solution). It was left
  untouched; it cannot be graded as it stands (see TODO below).
- By type: 23 suspended-charge (Q60–Q82: Q38-style fixed ball ×3 incl.
  unequal charges and attraction, two balls from one point ×3, unequal
  charges/equal masses ×2 incl. a Newton's-third-law MCQ, unequal masses ×1
  plus extended, inverse small-angle x³ = 2kq²L/mg ×1, approximation-validity
  MCQ ×1, charge sharing ×2, doubling-trap MCQs ×2, vertical tension and
  levitation ×2, uniform horizontal field ×1 plus extended, data analysis
  F vs 1/r² ×1, common-slip MCQ ×1, 4 extended 8–10-mark (a)–(d) questions);
  17 other (collinear net force and zero-force quadratic with a rejected root,
  equilibrium between like charges, three-charge equilibrium (sign-sensitive),
  stability MCQ, square and rectangle with mixed signs, charge at a square's
  centre, e–p force ratio from constants + "explain in words" MCQ, oil drop
  + 8-mark oil-drop extended, three graph questions, unit-slip and
  centre-to-centre MCQs). 30 numeric, 10 MCQ, 6 multi-part 8–10 marks.
- Format is the bank's own: one graded answer per question (multi-part
  questions grade one named part, the rest is worked in the explanation),
  step-by-step explanation ending "Common mistake:", every suspended-charge
  solution starts with the free-body diagram (T, mg, Fe). k = 9.0 × 10⁹,
  g = 9.8 N/kg stated in every question that uses them. `points` holds the
  real marks (3–10).
- Data: `database/seeds/2026-10-13-coulomb-challenge.py` (edit this) →
  `.sql` beside it and `components/practice/coulombChallengeDiagramData.ts`
  (both generated). Inverse angle problems solved exactly with
  `scipy.optimize.brentq`. Applied to Supabase 2026-10-13 via `execute_sql`
  in 6 batches, then every row + option checksummed (md5) against the file:
  40/40 match.
- Figures: `components/practice/CoulombChallengeDiagrams.tsx` — parametric
  SVG in Q38's style (hatched support, dashed vertical, angle arc, brass
  insulating rod, dimension arrows, no force arrows): `SuspendedAndFixed`,
  `SharedPivotPair` (incl. "level" unequal-length threads), `VerticalPair`,
  `FieldPendulum`, `ReadingsTable`, `ChargesOnLine`, `CornerCharges`,
  `OilDropPlates`, `ForceGraph`, `SpheresWithGap`; merged into `getDiagram()`.
  37 figures (Q91/92 have none, Q98 reuses `coulomb-two-charges`).
- **Fixes to the old bank (verified, both already inside grading tolerance,
  so no past attempt changes):** Q40 0.974 → 0.973 N (√(0.54² + 0.81²) =
  0.9735) and Q58 0.275 → 0.276 N (0.144√2 + 0.072 = 0.2757). Everything
  else in Q1–58 recomputes to its stored value at its stated s.f.
- Tests: `database/seeds/tests/test_coulomb_17_4_answers.py` (13 tests, run
  `python3 -m pytest database/seeds/tests -q`, needs scipy): independently
  recomputes every numeric answer of Q1–58 (snapshot of the live values) and
  Q60–99 and compares at the stored s.f., checks geometry (θ < 90°, r < 2L,
  taut threads, 3-4-5 diagonal, rejected quadratic root), units/signs,
  constants stated, FBD + common-mistake present, no near-clones
  (difflib < 0.8), harder than STANDARD (marks). Vitest
  `lib/practice/__tests__/coulombChallengeSeed.test.ts` (120 tests): real
  grader on every answer (bare, with unit, 3 s.f., 10% off, prefixed units,
  sign-sensitive Q86, small-angle shortcut rejected on Q79), MCQs 4 options
  1 correct, every figure renders finite SVG, full-tier worksheet PDF
  paginates (17 A4 pages for the 40, every page starts on a question, header
  count, footers) and the answer key marks every answer. worksheetPdf.test's
  React-parity check covers the new figures. Full suite 1372/1373 (the 1 is
  the known live-DNS test), `tsc` clean, `next build` clean (font stub +
  a dummy JWT_SECRET locally).
- Deployed: `ashphys` `main` `91739d2` → Vercel production
  `dpl_EiVbYspjQqzWQBcXBvq6xhY5R7WJ`, READY, aliased to www.ashphys.org.
  Live check (anonymous, via the Vercel fetch tool — the sandbox proxy
  blocks ashphys.org): the lesson page reports 99 IGCSE questions, and the
  worksheet endpoint still redirects logged-out users to /auth/login. The
  logged-in practice page and PDF download were NOT checked live (no login
  possible from the sandbox), only locally against the same code.
- Not done / needs a decision:
  - Randomised/parameterised variants: the platform has none (one stored
    answer per row, graded server-side), so none were made — it would need a
    seeded-variant schema + grader change.
  - Free preview: gating is per lesson (`topics.required_tier`, 0 for 17.4),
    there is no per-question preview, so nothing changed.
  - TODO: the Q59 stub needs an answer (or splitting into gradable parts)
    — today every submission to it is marked wrong.
  - No sitemap or hard-coded counts exist; header/page counts and the
    question map are computed from the DB.

### Landing page refresh: real updates pill, hero layout, mobile menu (NEW 2026-10-09)
- **Updates pill was showing stale, hardcoded content.** The pill (badge +
  title + date + arrow + dots, top of the homepage hero) read from
  `lib/announcements/sampleAnnouncements.ts`, a hand-written array that
  hadn't been touched since 2026-09-25 — by today it was advertising a
  "Circular Motion Lab in 3D" simulation that doesn't exist as a real
  shipped page. Replaced with a single source of truth,
  `lib/announcements/updates.ts` (`UPDATES: Announcement[]`), typed in
  `lib/announcements/types.ts`: `id`, `title`, `description`, `date`,
  `href`, `category` (lesson/video/simulation/quiz/platform — drives the
  icon/colour and the `/updates` filter chips, pre-existing and still
  load-bearing there) and two NEW fields, `type` (`'new' | 'improved' |
  'fix'` — what the task asked for by this name; kept separate from
  `category` rather than overloading one field, since the filter chips
  already mean "type" as content-category sitewide) and `published:
  boolean`. `getVisibleUpdates()` (`lib/announcements/format.ts`) is the
  one gate every surface filters through: hides anything `published:
  false` or dated after "now", sorts newest-first. The pill, the homepage
  "What's New" feed and `/updates` all call it on the same `UPDATES`
  array — nothing is pill-specific.
  - Pill now caps at the latest 5 (`AnnouncementTicker`'s `count` prop,
    was 3); dots reflect the real item count/active index; pauses on
    hover/focus/keyboard focus and respects `prefers-reduced-motion`
    (both were already correctly implemented, just untested — the bug was
    purely the data); the small "New" badge is now dynamic per the active
    item's `type` (New/Improved/Fix, colour-coded) instead of hardcoded
    text; renders nothing when the filtered list is empty.
  - **Seeded 8 real entries** from `git log` + this file + the routes that
    actually exist (checked each `app/` path before linking to it — no
    guessed lesson/topic UUIDs): the AS Kinematics banks, the site-wide
    "Need help?" CTA, the receipt-upload-page crash fix (a genuine `fix`
    entry), the circular-motion/gravitation challenge set, the Equation
    Rearranger cross-multiplication shortcut, the A Level circular-motion
    practice bank, the AS/A Level/IB curriculum launch, and embedded
    interactive solutions — each with its real ship date and a link to a
    real top-level route (`/curriculum?c=as`, `/simulations/equation-
    rearranger`, `/video-requests`, `/subscribe/verify`, etc).
  - **How to add a new update** (so this doesn't go stale again): add one
    object to the `UPDATES` array in `lib/announcements/updates.ts` with
    the real date it ships and a link to the real page. Leave `published:
    false` if it's not live yet — flip it to `true` the day it ships.
    `getVisibleUpdates()` handles hiding/showing and ordering everywhere
    automatically; nothing else needs editing, and nothing needs deleting
    later. Tests: `lib/announcements/__tests__/format.test.ts` now also
    covers `isVisibleNow`/`getVisibleUpdates` (unpublished hidden,
    future-dated hidden, sorted newest-first) and asserts every shipped
    `UPDATES` entry is itself published and not future-dated.
- **Hero restructured** (`app/page.tsx`): a top strip holds the pill at
  top-right with a compact "Start Free" CTA beside it (visible `sm:` and
  up, so something actionable sits above the fold on every screen with
  room for it; omitted below `sm` to avoid a second, redundant Sign Up
  button crammed next to the hamburger on the smallest phones — the one
  full CTA block right after the video is enough there). Below that, a
  12-column grid (~5/7 split) holds the headline/value-prop/CTA/trust-line
  on the left and `HeroVideo` on the right, `items-center` on `lg:`+.
  `HeroVideo` itself (`components/home/HeroVideo.tsx`) already met the
  brief — muted/looped/`playsInline`, fixed `aspect-video` (no layout
  shift), poster image, `preload="metadata"`, plays only when scrolled
  into view — so it was left alone, just moved into the new layout.
  Mobile/tablet (below `lg`, 1024px — chose to stack rather than attempt
  a cramped 2-column at tablet widths) reads pill → headline → video →
  CTA via a small, deliberately duplicated `HeroCtas()` block (`hidden
  lg:block` under the headline vs. `lg:hidden` after the video) rather
  than CSS grid row-spanning, which turned out far more fragile for
  getting "CTA after video on mobile, CTA under headline on desktop" right
  without guessing at row-height math.
- **Mobile menu was clipping off the left edge of the viewport and
  overlapping the header**, and the Teacher Applications/admin page showed
  two different controls both labelled "Menu". Root cause of the first:
  the hamburger reused `NavDropdown`, a dropdown that's `absolute
  right-0`-anchored to its own trigger button — fine for a desktop
  dropdown, wrong for an exhaustive mobile nav list, and on a crowded
  header the anchor point itself could land anywhere. Fixed by giving
  mobile its own component, `components/MobileMenu.tsx`: a hamburger that
  opens a `fixed inset-0` full-viewport sheet (backdrop + full-width
  panel), not anchored to the button at all, so it structurally cannot be
  clipped regardless of where the button sits. Closes on route change,
  Escape and backdrop click; locks body scroll while open; simple Tab
  focus trap inside the panel; returns focus to the trigger on close;
  `aria-expanded`/`aria-controls`/`aria-modal`; every tap target ≥44px.
  Second bug: `components/admin/AdminSidebar.tsx`'s own phone-bar toggle
  was also labelled "Menu" — it's a real, different control (expands the
  admin section nav: Dashboard/People/Content/Requests/Billing — not the
  site nav), so relabelled to "Browse" (`aria-label="Browse admin
  sections"`) rather than removed. Didn't reuse the `sections` admin icon
  for it, since that's already the icon for the actual "/admin/sections"
  nav item one line below it in the same list — would have been a second,
  new collision.
  - **Desktop dropdowns made viewport-aware** in the shared primitive
    rather than per page: `components/useDropdownEdgeAlign.ts` is a small
    hook (`useLayoutEffect` measures the rendered panel before paint, no
    flicker) that flips a panel's anchor edge if it would overflow either
    side of the viewport, `max-w-[calc(100vw-1rem)]` as a last-resort
    clamp. Wired into `NavDropdown.tsx`, `CurriculumDropdown.tsx` and
    `SearchBar.tsx`'s results panel — the three nav-area popovers. (Other,
    unrelated `absolute`-positioned menus elsewhere, e.g.
    `components/admin/UserRoleActions.tsx`'s row action menu, were left
    as they were — out of scope for "the project's existing popover/
    dropdown primitive" used by the header this bug was reported on.)
  - **Search collapses to an icon below `lg`** (`components/SearchBar.tsx`)
    instead of a permanent text input, and expands in place (with a close
    button) on tap — there wasn't room for a 224px input next to the
    hamburger, messages icon and Admin button on a phone.
- **Real overflow found and fixed**, not just the menu: a Playwright sweep
  (`document.documentElement.scrollWidth` vs `clientWidth` at 320, 360,
  390, 768, 1024, 1280, 1536px, across the homepage, `/updates`,
  `/pricing`, `/curriculum`, `/about`, `/contact`, and a throwaway local
  mirror of the admin shell for the DB-less sandbox — see below) found
  **zero overflow at 360/390/1280/1536, but 7px/68px/141px of real
  horizontal overflow at 320/768/1024 respectively**, on every page using
  the shared `Navbar`. Root cause: `Navbar.tsx`'s breakpoints put too much
  on at once at the standard `sm`(640)/`lg`(1024) steps — the search input
  jumping from an icon to a 224px field and "Sign In" appearing both at
  `sm`, and the full desktop link cluster (Curriculum/Study
  Materials/Courses/More) all appearing at `lg` right as the hamburger
  disappeared, together exceeded the available header width. Restaggered:
  logo now steps `108px → 130px(xs,400px) → 160px(sm) → 210px(md) →
  270px(xl)`; the desktop-only link cluster and "Sign In" moved to
  `xl`(1280)/`lg`(1024) respectively; the hamburger (`MobileMenu`) and
  search's icon form now persist through `xl` instead of `lg`. Re-swept
  after the fix: 0px overflow at all 7 widths, on every page tested,
  including with the mobile sheet open and with desktop dropdowns open.
  Verified with the globally-installed `playwright` npm package (this
  repo has no Playwright devDependency; used
  `/opt/node22/lib/node_modules/playwright` directly, chromium at
  `/opt/pw-browsers/chromium` per this sandbox's setup) — screenshots at
  all 7 widths, menu-open states, and the admin shell aren't committed
  (ephemeral verification only).
  - To screenshot the admin shell without a live DB/session in this
    sandbox (no `DATABASE_URL`, so `getCurrentUser()` always resolves to
    `null` and `/admin/*` just redirects to `/auth/login`), used a
    temporary route rendering the real `AdminSidebar` component with fake
    props outside of auth — **deleted before committing**, not shipped.
    Gotcha hit while building it, worth knowing for next time: a Next.js
    App Router folder prefixed with `_` (e.g. `app/_dev-preview/`) is a
    "private folder" and is excluded from routing entirely (404s) — use a
    plain folder name for any throwaway local-only route.
- **Judgement calls made without asking**: kept the richer `category`
  taxonomy (content type, for icons/filter chips) alongside the new
  `type` (new/improved/fix) field rather than replacing one with the
  other; pushed the desktop nav cluster to `xl` instead of trying to
  squeeze it into `lg` (would have needed shrinking several dropdown
  labels and still been fragile); relabelled rather than removed the
  admin phone-bar toggle since it does serve a real, distinct purpose.
- **Not done / out of scope**: did not re-point this sandbox's dev server
  at the real Supabase project to screenshot the actual authenticated
  `/admin/teacher-applications` page with live data — the throwaway
  component mirror above is structurally identical (same `Navbar` +
  `AdminSidebar`, same breakpoints) and was judged sufficient without
  touching production data for a UI-only check. Did not audit every page
  in the app pixel-by-pixel; swept the pages above plus the shared
  `Navbar`/`Footer`/dropdown primitives that every page inherits, which is
  where the real bugs were. **Pushed to this session's required branch
  (`claude/relaxed-pasteur-623hnp`) on both `ashphys` and `ashphyss`, not
  to `main`/`master`** — the "Two GitHub repos" deploy step below
  (`git push origin main && git push ashphyss main:master --force`) is a
  separate, deliberate production-promotion step for whoever reviews this
  branch to take next, not something this session's harness permits it to
  do unprompted.

### AS Chapter 6 Momentum practice banks (NEW 2026-10-26)
- Owner's request: momentum practice "starting with normal momentum, with creative
  ideas, then jump into collisions", pushed to the respective lessons. Built for the
  AS curriculum (the owner's Grade 11 class): a fresh 20-question tier-ordered bank
  (same tiers as the Kinematics banks: Q1-6 Foundation 1 mark, Q7-13 Intermediate
  2, Q14-18 Challenging 3-5, Q19-20 Stretch 5-6) for each of
  **6.1 The idea of momentum** (`196ffab0-…`), **6.2 Conservation of momentum and
  collisions** (`42c67aa7-…`) and **6.3 Understanding collisions** (`ac47b348-…`).
  60 questions: 46 numeric, 14 MCQ (correct letter rotated C/A/D/B — the practice
  page shows options in stored order), 41 with a figure.
- Content: 6.1 = p = mv, vector sign, Δp on rebound, total momentum, p = √(2mEk),
  creative contexts (cheetah, honeybee, curling stone, hailstone, Earth's orbital
  momentum, "hardest to stop" ranking, equal-p car vs truck stopping distance/time,
  deducing m and v from p and Ek). 6.2 = conservation principle, sticking/bouncing/
  recoil, unknown mass, astronaut + wrench, rifle recoil, dart-into-trolley speed
  measurement, sand-sack trapdoor trap, relay push, brick-throwing cart, crash
  reconstruction from skid marks. 6.3 = elastic vs (perfectly) inelastic, KE lost,
  relative speed of approach = separation, Newton's-cradle exchange, spring release,
  "impossible collision" (KE increases), bounce-height KE loss, ballistic pendulum,
  neutron moderation (28.4% to C-12), stacked basketball/tennis-ball drop (9h).
- Rows: the lessons' 20 old AS rows (no attempts/submissions/Q&A/quiz links) were
  UPDATEd in place, each reused by a new question of the SAME answer_type so MCQ
  option rows are reused and no numeric row keeps stray options; 40 rows INSERTed
  with uuid5 ids. Applied 2026-10-26 via `execute_sql` (one call per lesson, no
  BEGIN/COMMIT) and verified: all 60 rows and every option set md5-match the
  generator.
- Files: `database/seeds/2026-10-26-as-momentum-collisions.py` (edit this) →
  `.sql` beside it + `components/practice/momentumBankDiagramData.ts` (both
  generated). Figures: `components/practice/MomentumBankDiagrams.tsx` —
  parametric SVG `CollisionPanels` (BEFORE/AFTER or single panel; trolley, ball,
  block, puck, person, car; wall; ice), `Lineup` cards, `DropBounce` (incl.
  stacked balls), `BallisticPendulum`, plus `MotionGraph` reused for the p–t graph;
  merged into `getDiagram()` in MomentumDiagrams.tsx. All SVG (no HTML tables), so
  every figure prints in the worksheet PDF.
- Tests: `lib/practice/__tests__/asMomentumCollisionsSeed.test.ts` (122): every
  numeric answer recomputed independently, real grader bare/with unit/2-3 s.f./±20%/
  wrong sign, 23 "common mistake" answers graded wrong, MCQ 4 options 1 correct,
  correct letters spread, old rows reused by type, figures render finite SVG.
  Full suite: only the known live-DNS test fails. `tsc` + `next build` clean.

### AS Level Kinematics & Accelerated motion practice banks (NEW 2026-10-09)
- A fresh, tier-ordered 20-question (Q1-Q20) AS-curriculum bank for every
  one of the 22 lessons in Cambridge coursebook Chapter 1 "Kinematics"
  (1.1-1.8) and Chapter 2 "Accelerated motion" (2.1-2.14) — 440 questions
  total, replacing whatever smaller (6-9 question) AS banks those lessons
  had before. Tiers within each lesson: Q1-6 Foundation (1 mark,
  difficulty_level 1), Q7-13 Intermediate (2 marks, level 2), Q14-18
  Challenging (multi-part a/b/c, 3-5 marks, level 3), Q19-20 Stretch (9702
  Paper 2/4 style, unfamiliar contexts/derivations, 5-6 marks, level 4).
  Every numeric answer is computed in Python from the question's own
  inputs (never hand-typed); every explanation ends in a "Common mistake:"
  sentence. `g = 9.81 m/s²`, up/right positive unless a question states
  otherwise.
- 230/440 questions (52%) have a figure, well short of the 80% aspiration
  — by design: unit-conversion and uncertainty-arithmetic lessons (2.3,
  2.7, 2.12, parts of 1.1/1.2/2.6) have little that's genuinely visual to
  draw, while graph/vector/projectile-heavy lessons (1.4, 1.5, 2.13, 2.14)
  are close to 100%. Chose real physical meaningfulness over forcing a
  diagram onto every slot to hit a number.
- Figures are REUSABLE parametric React components, not per-question
  images: `components/practice/KinematicsDiagrams.tsx` defines `MotionGraph`
  (with shaded areas/tangent lines), `VectorDiagram`, `ProjectileTrajectory`,
  `TickerTape`, `DisplacementPath`, `RulerReading`, `MicrometerReading`,
  `StopwatchReading`, `DataTable`, `ScatterErrorBars` (best/worst-fit
  lines), `LightGateRamp`, `BallDropSetup` — each takes typed numeric/array
  props and renders inline SVG (or an HTML `<table>` for `DataTable`) in the
  house "lab notebook" palette. `components/practice/kinematicsDiagramData.ts`
  (generated) holds the exact per-question props; `MomentumDiagrams.tsx`'s
  `getDiagram()` dispatch merges them in alongside every other bank, so both
  the live practice page and the worksheet PDF exporter render them for
  free. Verified on desktop + mobile widths via Playwright screenshots
  during development (now removed, was a throwaway `/diagram-preview-temp`
  page).
- UI: question cards now show a tier badge (Foundation/Intermediate/
  Challenging/Stretch — a difficulty-level label, NOT the Free/Plus/Pro
  subscription tier that gates the separate interactive-solutions feature)
  and the question's mark value, next to the question number in
  `PracticeSession.tsx`. `problems.points` is now selected and returned by
  `lib/practice/questions.ts` and `GET /api/practice/[topicId]`.
- Data lives in `database/seeds/2026-10-09-as-kinematics-accelerated-motion.py`
  (edit this, never the generated `.sql` or `kinematicsDiagramData.ts`
  directly) plus `database/seeds/_existing_as_rows.py` (inventory of the
  pre-existing row/option ids these 22 lessons had, used to UPDATE them in
  place instead of DELETE+INSERT — see the DELETE/semicolon gotchas above
  for why). **APPLIED to the live Supabase project on 2026-10-09**, in
  ~150KB batches via `execute_sql` (no `BEGIN`/`COMMIT` wrapper needed once
  the semicolon issue was worked around).
- Tests: `lib/practice/__tests__/asKinematicsAcceleratedMotionSeed.test.ts`
  (351 tests — parses the generated SQL's `INSERT` AND `UPDATE` statement
  forms, since this bank's 132 reused rows are UPDATEs while the other 308
  are fresh INSERTs; every numeric answer re-graded through the real
  grader bare/with-unit/at 2-3 s.f./wrong/wrong-sign, every MCQ has exactly
  4 options with 1 correct matching the stored answer, every figure
  resolves, no duplicate question text per lesson) and
  `_kinematicsDiagramRenderCheck.test.ts` (434 tests — every registered
  diagram renders to finite SVG/table markup with no NaN/Infinity/
  undefined and a sane viewBox). Full suite otherwise unchanged (1
  pre-existing, unrelated, network-dependent DNS test still fails the same
  way it always has). `tsc --noEmit` and `next build` both clean.
- Pushed to `ashphys` `main` (`a5463a5`) and cherry-picked onto `ashphyss`
  `master` (`b0658dc`, clean — no `tsconfig.tsbuildinfo` conflict this
  time); Vercel auto-built and auto-promoted it to production
  (`dpl_9ocqYdE2h8z9SQznnVyaZfrRHr3X`), already aliased to
  `www.ashphys.org` by the time this was checked — no manual promote step
  was needed.
- Judgement calls made without asking: fully replaced each lesson's
  existing AS bank with a new 20-question tier-ordered one rather than
  appending to it (the task asked for exactly 20 per lesson); accepted
  52% visual coverage instead of forcing contrived diagrams for
  unit-conversion/uncertainty lessons; for 2 g-force-multiplier questions
  (unrelated to grams) left `answer_unit` unset rather than attaching the
  real SI-resolvable `'g'` (grams) unit, since the question text/
  explanation already states the unit in prose.

### UI cleanup 2026-09-30 (navbar, mastered screen, embedded solutions)
- Navbar Curriculum dropdown now shows only "View Full Curriculum" + the four curriculum choices (the old IGCSE chapter list is gone).
- Practice: the "Topic Mastered" screen only appears once no question is untried/skipped; a streak earned part-way no longer hides unfinished questions.
- Interactive solutions are embedded in practice: any question with `problems.solution_id` shows an optional, collapsed "Interactive solution" button that loads the solution inline (tier/view-cap gating unchanged, views only spent on open). The standalone Solutions catalog, its navbar links and `GET /api/solutions` are removed; `/solutions` redirects to `/curriculum`. The duplicate card was the catalog joining `chapters` by number only (ch. 17 exists in IGCSE and 9702).
- TODO (content): author an interactive solution for every question and link it via `problems.solution_id` (admin: /admin/solutions). Only "Four Charges on a Square" exists, linked to 2 questions.

### Cross-multiplication in the Equation Rearranger (2026-10-01)
- User's teaching trick, now built in and shown to students: when the variable being solved for is in a denominator and the other side is a single product, it and that product just SWAP across the equals sign (F = GMm/r² → r² = GMm/F) instead of "× r²" then "÷ F". Applies to every such equation in the bank (density, power, capacitance, V²/R, plate capacitance, gravitation/Coulomb/field strength) and mirrored orientations; pendulum g gets it too after ÷2π and squaring (4 moves → 3). Transformer (a proportion, other side has its own denominator) still uses the plain moves.
- Engine: new move kind `cross` in `isolateSteps` (`rearranger/algebra.ts`), tried before the old "lift". `crossKeyMap(move)` maps before→after tokens so the stage glides the two pieces across along an arc (`playCross` in `RearrangerScene.ts`). Captions: "Cross-multiply: r² and F swap places", then "Same as multiplying by r², then dividing by F: one step".
- Page: `/simulations/equation-rearranger` has a "Shortcut: cross-multiplication" card above the simulator with the F = GMm/r² example.
- Tests: `rearranger/__tests__/cross.test.ts` (8 tests: when it applies / doesn't, every equation × variable × orientation and every chained pair put back into the ORIGINAL equation balances, token maps exist on screen). Full suite 372/372, tsc clean.
- NOT done: proportions like the transformer equation (a/b = c/d) still use the plain moves; the Prep Physics practice questions' written explanations and the Proportionality sim's "solve for X" panel don't mention the shortcut yet.
- Noticed, not touched: the `emc2` sample in the equation bank has E = 8.988e10 for m = 0.001 kg (m·c² is 8.988e13).


- **Homepage / positioning**: platform-first, not tutoring-first. Markets
  AshPhys as the only place needed to study physics, across IGCSE, AS Level,
  A Level and IB (all "Available Now" since 2026-09-29, each card links to
  /curriculum?c=<id>) and HMH (still "Coming Soon"). Live stats and pricing tiers
  pulled from the DB, not hardcoded. Private tutoring is now a Pro-tier
  subscription perk, not a standalone headline CTA — `/book` still works,
  just isn't featured in the navbar anymore.
- **Curriculum**: 25 chapters, 89 lessons, matching the real Cambridge IGCSE
  Physics (0625) textbook table of contents. Since 2026-09-29 also AS Level,
  A Level (Cambridge 9702) and IB Physics — see "Multi-curriculum" below. Browsable at `/curriculum`,
  navbar has a dropdown too. Full-text site search in the navbar
  (`/api/search`) covers chapters, lessons, and simulations.
- **13 interactive simulations**

### Multi-curriculum: IGCSE, AS Level, A Level, IB (NEW 2026-09-29)
- Four curricula live side by side: `igcse` (Cambridge 0625), `as` and
  `a-level` (Cambridge 9702 — NOT 0625; the original brief said "0625 AS",
  which is the IGCSE code), `ib` (IB DP Physics, first assessment 2025).
  Constants + helpers: `lib/curricula/index.ts`; the syllabus structure
  (unit/section codes and titles for all four) is `lib/curricula/syllabi.ts`.
  Question-bank build priority: AS > A Level > IGCSE > IB (`priority` field).
- DATA MODEL. A "lesson" is still a `topics` row (the `lessons` table is
  empty and unused). New columns on `topics`: `curriculum_ids text[]`
  (GIN-indexed, CHECK-constrained to the four ids), `topic_code` (IGCSE 0625
  syllabus section, e.g. 1.5.2), `as_topic_code`, `a_level_topic_code`,
  `ib_topic_code`, `syllabus_reference`. A lesson in several curricula has a
  code in each. `problems` gained `curriculum_id` (default 'igcse' — every
  pre-existing question is IGCSE), `topic_code`, `syllabus_cite`: each
  curriculum has ITS OWN question bank on a shared lesson. Simulations are
  untouched and shared (they hang off the lesson). New table
  `user_preferences (user_id PK, selected_curriculum)`, RLS on, server-only.
  Migration: `database/seeds/2026-09-29-multi-curriculum-schema.sql`
  (additive; applied to Supabase as `multi_curriculum_schema`).
- CONTENT. `database/seeds/2026-09-29-multi-curriculum-content.py` generates
  `...-content.sql` (edit the .py, re-run it; never hand-edit the .sql). It:
  tags all 101 existing lessons with curricula + codes; adds course
  `9702` (25 chapters = syllabus units) and course `IB` (chapters 1/2/5 =
  themes A/B/E) holding 76 new lessons, one per syllabus section no existing
  lesson covered; shares existing lessons that have a simulation (e.g. 3.4
  F=ma -> AS 3.1, 17.4 Coulomb -> A Level 18.3, 14.3 ripple tank -> AS 8.3)
  and the Prep Physics maths lessons (-> 9702 "Mathematical requirements",
  IB "Tool 3"); and seeds 87 questions: AS 42, A Level 25, IGCSE 10, IB 10.
  Every answer is computed from the question's own numbers and all 71
  numeric ones were run through the real grader (bare number, with unit, and
  a wrong value rejected). The SQL ends with a validation block (every lesson
  has a code for each curriculum it serves; every question belongs to a
  curriculum its lesson serves). Idempotent — verified by running it twice
  on a local replica. A Level = all AS lessons (same codes) + units 12–25.
  **APPLIED to the live Supabase project on 2026-09-29** (via the SQL tool,
  in 5 chunks; every table's row hash was checked against a local replica
  that ran the file itself). Because it went in BEFORE the code reached
  `master`, until that merge the deployed (old) code shows the new 9702/IB
  chapters in the navbar and /curriculum (it doesn't filter by course) and
  mixes the AS/A Level questions into lessons 3.4 and 23.3 (its practice
  query doesn't filter by curriculum). Merging the branch fixes all of it.
  Re-running the file is safe. (ed308ec had already been promoted to
  production by hand on 2026-09-29; the branch reached `main`/`master` on
  2026-09-30 together with the unit 12–13 banks below.)
- PAGES. `/curriculum?c=<id>`: gradient curriculum selector (URL is the
  source of truth; choice also saved to localStorage `selectedCurriculum`,
  cookie `ashphys_curriculum` and, logged in, `user_preferences`; no ?c ->
  account, then cookie, then IGCSE; if only localStorage survives, the
  selector restores it). IGCSE groups by coursebook chapter as before;
  AS/A Level/IB group by syllabus unit in syllabus order (shared IGCSE
  lessons sit in the unit they support, IGCSE book number stripped from the
  title). `components/curriculum/LessonCard.tsx`: code chip, "9702 AS –
  Topic 2.1 · Equations of motion", syllabus reference, per-curriculum
  practice count, shared sim buttons. NEW `/lessons/[topicId]?c=`: the
  lesson through one curriculum — code/section/reference, "Also in" chips,
  shared simulations, that curriculum's practice bank + links to other
  banks, notice if the lesson isn't in the requested curriculum.
  `/curriculum/[chapterId]` now course-aware (Unit 12 / Theme B labels,
  prev/next within the same course, practice links carry ?c).
  `/practice/[topicId]?c=` and the worksheet PDF use that curriculum's bank;
  with no ?c the student's saved curriculum is used if the lesson is in it,
  else IGCSE — so every pre-existing link still opens the IGCSE bank
  (`curriculumForTopic`). Mastery (5 in a row) stays per LESSON, not per
  curriculum/bank. Navbar dropdown: four curriculum links + IGCSE chapters
  only (scoped to course code 0625). Search: lesson hits go to /lessons.
  Admin curriculum/booklets and the video-request form list IGCSE chapters
  first and label 9702/IB ones with their course code.
- API. `GET /api/lessons?curriculum=as` (public; 400 missing, 404 unknown),
  `GET /api/questions?curriculumId=as&lessonId=<topic>` (login + tier, no
  answers), `GET|POST /api/user/preferences`. Practice APIs accept
  `?curriculum=`. Analytics: new `curriculum_select` event.
- TESTS: `lib/curricula/__tests__/curricula.test.ts` (parsing, fallback
  rules, code ordering, grouping, syllabus integrity, and every topic code
  in the generated seed must exist in syllabi.ts).
- KNOWN GAPS / NEXT: most new lessons are titles + syllabus references with
  no simulation or questions yet (same as most IGCSE lessons); question
  banks are starters (AS: 8 lessons, A Level: 11 since 2026-09-30, IB: 2). The `courses`
  table is overloaded: curriculum courses (0625/9702/IB) live in it, while
  `lib/courses` + `/courses` expect paid-course columns (slug, price_try)
  that the live table does not have — pre-existing, but if that feature is
  ever migrated, filter the curriculum courses out of it.

### Circular Motion & Gravitation Challenge Set (NEW 2026-10-06)
- From the owner's PDF (IGCSE 0625 ch. 16-17, Physics 10, with teacher answer key): the 10 challenge questions plus 5 harder extension questions per lesson (difficulty 3, 3, 4, 4, 5). Each question has ONE numeric answer (its key quantity); the other parts of a PDF question are worked in the explanation.
- Both curriculum banks of the two shared lessons got the same 10: 3.7 / 12.2 Circular motion IGCSE 35 -> 45, A Level 45 -> 55; 24.3 / 13.2 Gravitation IGCSE 7 -> 17, A Level 22 -> 32. Numbers continue after the existing ones (circular 36-45 / 46-55, gravitation 8-17 / 23-32).
- `database/seeds/2026-10-06-circular-gravitation-challenge.py` generates the `.sql` (edit the .py, never the .sql). Answers computed in code; g = 9.8, G = 6.67e-11, Earth 5.97e24 kg / 6.37e6 m (the PDF's constants). uuid5 ids, idempotent. APPLIED to live Supabase 2026-10-06 (compact equivalent insert using extensions.uuid_generate_v5; row digest matches the file's ids/text/answers).
- 14 new figures `circ-ch-*` / `grav-ch-*` in `components/practice/CircularGravityDiagrams.tsx` (givens only, never an answer). Test: `lib/practice/__tests__/circularGravitationChallengeSeed.test.ts`.

### A Level circular motion & gravitation practice (NEW 2026-09-30)
- 99 questions in the A Level (`curriculum_id='a-level'`) banks of the six
  unit 12–13 lessons, from the owner's two worksheets ("Circular Motion and
  Gravitation Notes" 1–5 with their worked examples and fill-ins, and the
  exam-style sheet: spaceship, theme-park car, TV satellite, ball on a cord,
  conical pendulum, London Eye, Discovery/Hubble, Phobos, skaters, hammer
  throw, baggage belt, merry-go-round, whistle, Earth–Moon, ISS, orbit
  change). Per lesson: 12.1 Radians and angular speed 9, 12.2 Circular
  motion (the SHARED IGCSE 3.7 lesson — its IGCSE bank of 35 is untouched)
  45, 13.1 Gravitational fields 5, 13.2 Gravitation and orbits (shared IGCSE
  24.3) 22, 13.3 Field strength of a point mass 5, 13.4 Gravitational
  potential 13. 49 numeric, 50 multiple choice, 82 with a figure ("explain"/"draw an arrow"
  parts became MCQs whose wrong options are the usual misconceptions —
  centrifugal force, velocity towards the centre, etc.).
- `database/seeds/2026-09-30-a-level-circular-gravitation.py` generates the
  `.sql` (edit the .py, never the .sql). Every answer and every number in
  every explanation is computed from the question's own values; uuid5 ids;
  idempotent; starts with a guard that all six lessons serve 'a-level'.
  Tolerance 5% where a 2-s.f. answer would miss the default 2%, so the
  worksheet keys' own 2-s.f. answers are accepted. g = 9.81 throughout (the
  notes use 9.8). MCQ options are stored in a text-derived order so the right
  answer isn't always A (the practice page doesn't shuffle; the older seeds
  always put it first — worth fixing there some day).
- SOURCE-KEY ISSUES handled: the 1450 kg satellite's key gives ΔEp =
  +5.72 × 10⁹ J for a move to a LOWER orbit — stored as −5.72 × 10⁹ J,
  sign-sensitive (a student typing the key's value gets "the sign is wrong").
  The skater question omits Ana's mass; 55 kg is from the original exam's
  opening ("Jon (mass 75 kg) … Ana (mass 55 kg)"). "Show that" parts ask for
  the value instead so the answer isn't printed in the question.
- FIGURES: 46 original SVGs in `components/practice/CircularGravityDiagrams.tsx`
  (keys `circ-*` / `grav-*`, merged into `getDiagram`), lab-notebook palette;
  the worksheets' photos (wheel, skaters, satellite, Phobos) are redrawn as
  diagrams. They never show an answer arrow. They render in the practice page
  and the worksheet PDF (serialiser identical to React — checked by
  worksheetPdf.test.ts, which now covers these keys).
- TEST: `lib/practice/__tests__/aLevelCircularGravitationSeed.test.ts` parses
  the generated SQL and runs every numeric answer through the real grader
  (bare, with unit, 3 s.f., 2 s.f. accepted; ±10% rejected; sign flips
  rejected where sign-sensitive), checks the worksheet keys' printed answers
  are accepted, every MCQ has 4 options with one right and the right slot
  varies, and every figure key resolves.

### Shopier payment integration (NEW - awaiting API keys from user)
- Shopier is NOT REST/JSON - it's a classic form-post gateway. Browser
  is redirected with a signed HTML form to
  https://www.shopier.com/ShowProduct/api_pay4.php; Shopier POSTs the
  result back to ONE callback URL configured inside the Shopier panel
  itself (Ozellestirmeler > API Bilgileri > Geri Donus URL) - NOT a
  per-request field, NOT an env var. That URL must be set to
  https://ashphys.org/api/payments/shopier/callback inside Shopier's
  own dashboard by the user - Claude cannot do this part.
- Signature (both directions): base64(HMAC-SHA256(random_nr +
  platform_order_id + total_order_value + currency_code, api_secret)).
  Reverse-engineered from Shopier's own PHP examples (no official
  public spec exists) - self-verified round-trip in node (44-char b64,
  32-byte digest) before shipping.
- lib/shopier/client.ts: buildShopierFormFields, verifyShopierCallback
  (timingSafeEqual), generatePlatformOrderId/generateRandomNr.
  currency codes are Shopier's own (TRY=0, USD=1, EUR=2), NOT ISO 4217.
- DB table shopier_orders: platform_order_id (unique), student_id,
  plan_id, billing_cycle, is_test, amount, currency, random_nr,
  status (pending/success/failed/cancelled), shopier_payment_id,
  installment, raw_callback jsonb.
- POST /api/payments/shopier/checkout (admin-only for now): creates a
  pending order, returns signed form fields for the client to
  auto-submit (real form POST, not fetch - Shopier's gateway requires
  an actual browser form submission).
- POST /api/payments/shopier/callback (PUBLIC - Shopier calls this
  directly, no session): verifies HMAC before touching anything,
  updates the order, logs to payment_logs, and on a REAL (non-test)
  success upserts the subscriptions row (ON CONFLICT student_id,
  extends end_date by 1 or 12 months per billing_cycle). This URL is
  BOTH the server notification AND the page the shopper's browser
  lands on, so it redirects to /payments/result?status=...&orderId=...
  rather than returning JSON.
- /payments/result: public results page, reads the order from DB,
  shows success/failure with order details.
- /admin/test-payment + components/admin/TestPaymentPortal.tsx:
  amount input (default 1.00 TRY), hidden auto-submit form pattern.
  Explicitly warns there is no Shopier sandbox - any test is a REAL
  charge.
- CREDENTIAL LOCATION RESOLVED (2026-07-27): NOT under
  Ozellestirmeler > API Bilgileri (that menu doesn't exist in current
  Shopier UI) and NOT the "Kisisel Erisim Anahtari" / PAT under Hesap
  Yonetimi (that's a SEPARATE newer developer/app-store platform,
  issues a single token, unrelated to the payment gateway - confirmed
  by screenshot, user had already generated one for something else).
  The actual pair lives under Ek Ozellikler > Siparis Bildirimi
  (Otomatik Siparis Bildirimi / OSB) screen: "OSB Kullanici Adi" =
  SHOPIER_API_KEY, "OSB Sifresi" = SHOPIER_API_SECRET. Same screen has
  the Bildirim URL field (protocol dropdown + URL) where
  ashphys.org/api/payments/shopier/callback must be pasted and saved -
  this IS the panel-side callback config, just relocated from where
  older guides describe it. Screen shows a banner that OSB is a
  legacy feature vs newer Webhooks - fine for now, revisit if Shopier
  actually deprecates it. User has now located + saved both.
- BUG FOUND AND FIXED (2026-07-27): TestPaymentPortal's auto-submit
  used setTimeout(fn, 0) after setFields/setPaymentUrl to submit the
  hidden form - a real race against React's render commit. If the
  timeout fired before the form existed in the DOM,
  formRef.current?.submit() was a silent no-op (optional chaining
  swallows the null case) - button stuck forever on "Redirecting to
  Shopier..." with zero error, exactly what the user hit. Also that
  button text was misleadingly shown the INSTANT the button was
  clicked (loading=true), before the checkout API call had even
  returned, so it didn't distinguish "waiting on our server" from
  "actually navigating." Fixed: submit only inside a useEffect keyed
  on [fields, paymentUrl], which React guarantees runs after DOM
  commit; separated `loading` (server call in flight -> "Starting
  checkout...") from `redirecting` (form found + submit fired ->
  "Redirecting to Shopier...") so a stuck state is now diagnosable.
- BUG FOUND AND FIXED #2 (2026-07-27): callback route was responding
  to Shopier with an HTTP redirect (3xx) to /payments/result, which
  works fine for a real browser but almost certainly fails Shopier's
  OSB test tool / any server-to-server notification check, since those
  virtually never follow redirects and just check the immediate status
  code. Rewrote to ALWAYS return 200 OK (a resultPage() helper: 200 +
  a tiny HTML body with a meta-refresh, so a real shopper's browser
  still lands on /payments/result, but Shopier's automated check sees
  200 immediately). Also added a GET handler returning plain 200 OK,
  in case their test pings with GET before/instead of POST - genuinely
  unknown which method OSB uses, no public spec exists. Unknown-order
  callbacks (e.g. for purchases made through Shopier's own storefront
  rather than our API) now also return 200 rather than erroring, since
  there's nothing wrong with not recognizing an order we didn't create.
- UNRESOLVED: 509 "Dukkanda siparis olusturulamamaktadir" still blocks
  checkout via api_pay4.php entirely - confirmed NOT a signature/code
  problem (Shopier's own branded error page renders, meaning the
  request reached their server and was parsed; a bad signature shows a
  different, more specific error per other users' reports). Dashboard
  diagnostics so far: Hesap Ozeti shows "null adet" for Toplam Siparis
  (a raw placeholder leaking through - suggests incomplete account
  setup) and 0.00 across all sales figures. Checked Dukkan Yonetimi
  submenu, no obvious "register my own website for API payments" entry
  found. Working theory: either (a) account still mid-activation
  (Shopier docs mention up to 24h approval after signup, and mention a
  step during onboarding to declare "Kendi Internet Sitem" as the
  payment channel - unclear if this user's account completed that
  step), or (b) some other account-level gate. User has emailed
  hello@shopier.com with the error code; awaiting their reply is
  probably the fastest path now rather than more menu-guessing.
  IMPORTANT: user also completed a real 10 TL purchase of the
  "ashphys kurs" product via Shopier's own native storefront (NOT via
  our API) specifically to generate a real order number (307538405)
  for the OSB test tool - that product/order exists in their Shopier
  account, unrelated to our shopier_orders table.
- MAJOR CORRECTION (2026-07-27): user pasted Shopier's own "OSB ornek
  kodunu goruntule" PHP example code (first-party, from inside their
  panel - NOT reverse-engineered like everything else researched this
  session). It revealed the callback contract was completely wrong:
    * incoming fields are just `res` (base64 JSON) + `hash` - NOT the
      7-field classic-gateway shape (status/platform_order_id/
      payment_id/random_nr/total_order_value/currency/signature) that
      was built from reverse-engineered gists/PHP SDKs
    * hash = HEX hmac_sha256(res + OSB_USERNAME, key=OSB_SECRET) - hex
      output (raw_output=false in PHP), NOT base64, and signs
      `res+username` not a field concatenation
    * only fires on SUCCESS - no status field to branch on at all
    * the ONLY valid acknowledgement is the literal plain-text string
      "success" - not JSON, not HTML, not "OK". This explains why the
      earlier 200-with-meta-refresh-HTML fix likely still failed the
      OSB test even though the status-code part was right.
  Rewrote lib/shopier/client.ts (verifyOsbHash, decodeOsbPayload
  replacing the old verifyShopierCallback/ShopierCallbackFields
  entirely - confirmed unused elsewhere before deleting) and the whole
  callback route to match exactly: reads res+hash, hex HMAC verify,
  decodes base64 JSON payload {email,orderid,currency,price,
  buyername,buyersurname,productcount,productid,productlist,
  chartdetails,customernote,istest}, responds with EXACTLY "success"
  (plain text, 200) on valid signature, "missing parameter"/""/"bad
  payload" otherwise (mirroring the PHP example's own responses).
  Self-verified the hex HMAC translation in node (64-char valid hex,
  matches hash_hmac(...,false) semantics exactly).
  IMPORTANT ARCHITECTURE CORRECTION: this URL is NOT also the page a
  shopper's browser lands on after paying (that was a wrong assumption
  carried from older classic-gateway docs) - OSB is a pure
  server-to-server notification. The /payments/result page built
  earlier is now unreferenced/orphaned - harmless, left in place, not
  cleaned up.
  ORDER CORRELATION CAVEAT: whether Shopier's `orderid` in the OSB
  payload equals the `platform_order_id` WE supply when creating an
  order via api_pay4.php is UNCONFIRMED - no successful api_pay4.php
  order has occurred yet (509 still blocks it). Callback tries to
  match by platform_order_id and gracefully logs+acknowledges
  regardless if no match is found (e.g. native-storefront purchases
  like the manual "ashphys kurs" test buy). Revisit this mapping once
  a real order actually completes.
  STILL SEPARATE AND UNRESOLVED: the 509 "Dukkanda siparis
  olusturulamamaktadir" checkout-creation error. This OSB fix only
  addresses the notification/acknowledgement contract - it does NOT
  fix order creation via api_pay4.php. Leading theory remains the
  Entegrasyonlar > Modul Yonetimi > Kayitli Alan Adlari domain
  registration step (user has not yet confirmed checking this).
- STILL TODO once confirmed working: wire a real (non-admin) student
  checkout flow using subscription_plans pricing instead of the
  admin-only test amount; payment_logs currently writes NULL for
  subscription_id on test charges (intentional, no subscription to
  attach) and the iyzico_payment_id column is reused to store the
  shopier payment_id (no schema rename attempted - it's a generic
  external-payment-id column despite the name).

### Momentum practice questions with diagrams (NEW)
- `question_image_url` column existed in schema but was never wired to
  the frontend before this session - now is, end to end.
- Diagrams are ORIGINAL SVG, drawn as React components (not external
  image files) - components/practice/MomentumDiagrams.tsx. Referenced
  from question_image_url as an internal key like
  "diagram:momentum-stick-1" rather than a URL; PracticeSession.tsx
  checks the "diagram:" prefix and renders <MomentumDiagram> for those,
  falls back to a plain <img> for any real external URL (so the column
  stays generically useful later). No file hosting needed for these.
  Diagram style: trolley rectangles on wheels, BEFORE/AFTER panels
  split by a dashed divider, teal arrows for given velocities, brass
  for the unknown-being-solved-for in the after panel (red-tinted).
  8 diagram keys built: momentum-stick-1/2, momentum-explosion-1,
  momentum-separate-1, momentum-headon-1, momentum-recoil-1,
  momentum-wall-1, momentum-oblique-1.
- 8 questions seeded across topic 3.5 Momentum (problems 6,7,8,9,11:
  sticking collision both directions solved-for, explosion/recoil,
  non-sticking separate velocities, gun recoil) and topic 3.6 Vectors
  (problems 10,12,13: head-on opposite-direction collision, wall
  bounce momentum-CHANGE with the subtract-speeds-not-momenta trap,
  oblique collision with sign-handling on both sides). All 8 verified
  independently via node arithmetic before shipping. Chapter 3
  previously had problems 1-5 (Newton's second law sim); now 1-13
  (skipped nothing, just picked next available numbers 6-13).

### Past Papers section (NEW - infrastructure only)
- COPYRIGHT NOTE: Cambridge explicitly does not permit hosting past
  exam papers on third-party websites (confirmed via their own help
  centre). User made an informed decision to proceed as a "mirror"
  (like Save My Exams etc) at their own risk. Claude built ONLY the
  infrastructure - schema, admin CRUD, public browsing page - and
  declined to personally source/reproduce any real exam content.
  User uploads their own PDFs (paste URL after hosting elsewhere -
  no file-upload pipeline built, no Supabase Storage wired up yet).
- DB table `past_papers`: syllabus_code (default '0625'), year
  (>=2020), session (Feb/Mar | May/Jun | Oct/Nov), paper_number (1-6),
  variant (1-3), question_paper_url, mark_scheme_url,
  explanation_status (coming_soon|published), explanation_video_url
  (YouTube link - YOUTUBE_API_KEY already in .env.example),
  explanation_notes. Unique on (syllabus_code, year, session,
  paper_number, variant).
- Public page `/past-papers`: year+paper-number filter pills, grouped
  by year/session, lab-notebook styling. "Explanation: Coming Soon"
  badge when no video; QP/MS show as greyed-out labels (not links)
  when url is null - never a broken link.
- Admin `/admin/past-papers`: form to add/update by
  year/session/paper/variant (upsert on the unique key), list with
  edit/delete. API routes: POST+GET /api/admin/past-papers, DELETE
  /api/admin/past-papers/[id]. Same admin-only auth pattern as
  teacher-applications.
- UPLOAD PIPELINE (added this session): Supabase Storage bucket
  `past-papers` created directly via SQL against storage.buckets
  (public=true, 20MB limit, application/pdf only — no supabase-js
  dependency added, matches the project's raw-pg-only style). New
  route POST /api/admin/past-papers/upload (multipart file + path) ->
  Storage REST API (POST .../storage/v1/object/past-papers/<path>)
  using SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server-side only,
  bypasses RLS) -> returns the public URL
  (.../storage/v1/object/public/past-papers/<path>). Admin form's URL
  text inputs replaced with file pickers that upload on selection and
  auto-fill the URL field; path is auto-slugged from
  year/session/paper/variant (e.g. 2020-oct-nov/paper-4-v2-qp.pdf).
  BLOCKED ON USER: SUPABASE_SERVICE_ROLE_KEY is a secret Claude has no
  MCP access to (by design) — user must copy it from Supabase
  dashboard (Project Settings > API > service_role) into Vercel env
  vars alongside SUPABASE_URL (already known:
  https://uolwvcszclviqrtyxwgl.supabase.co), then redeploy, before
  upload buttons will work in production. .env.example updated with
  both vars and the exact project URL.
  COPYRIGHT NOTE STILL APPLIES: Claude built the pipeline but does
  not upload any real exam content itself — user uploads their own
  legitimately-downloaded PDFs through this form.
- ONE TEST ROW seeded: 2020 Oct/Nov Paper 4 Variant 2, metadata only
  (no QP/MS urls, explanation_status='coming_soon'). Waiting on user
  to paste in their own real PDF links via the admin form to complete
  the test, then confirm before bulk-importing sessions since 2020.
- STILL TODO if user confirms: bulk-import UI/script for many papers
  at once (currently one-at-a-time only), file-upload-to-storage
  pipeline (currently URL-paste only, no Supabase Storage bucket
  wired up), YouTube embed player on the public page (currently just
  a link out) instead of iframe embed., each a real physics engine (not a canned
  animation), registered in the `simulations` table with a `topic_id` linking
  it to its exact lesson:
  - `/simulations/pendulum` — damped oscillation, force vectors, technical overlay
  - `/simulations/distance-time-graph` — kinematics, live graph tracing
  - `/simulations/spring` — Hooke's law, permanent deformation, hot-color stress
  - `/simulations/newtons-second-law` — F=ma, velocity-time graph
  - `/simulations/ohms-law` — circuit with animated current flow, V-I graph
  - `/simulations/circuit-builder` — real nodal-analysis solver (Gaussian
    elimination), grid-based drag-and-place circuit sandbox
  - `/simulations/refraction` — optics bench for 13.2/13.3: live Snell's law,
    draggable ray box on a protractor, Fresnel intensity split (reflected ray
    brightens toward the critical angle), animated wavefronts that slow and
    compress in the denser medium, and a record-your-own sin i vs sin r plot
    that fits n from the gradient. Registered under topic 13.2; enum
    `sim_type` gained an 'optics' value (migration add_optics_sim_type).
  - `/simulations/balance-beam` — moments practical for 4.1/4.2: metre rule
    on a draggable pivot, drag-and-stack weights at 5 cm notches, real
    rotational dynamics (I·alpha = net torque, lever arms shorten with tilt,
    end stops), live CW/ACW moments ledger, adjustable beam mass at its
    centre of gravity ("find the mass of the ruler"), and a mystery-mass
    challenge. Registered under topic 4.2, sim_type 'force_diagram'.
  - `/simulations/ripple-tank` — the 2D wave equation (FDTD, 176x104 grid,
    120 steps/s) for 14.1-14.3: seven scenes (plane waves, angled reflector,
    narrow/wide gap diffraction, Young double slit, refracting shelf,
    two-point interference),
    stroboscope, absorbing beach edges, 10 cm measuring grid. Scaled to a
    real tank: v = 30 cm/s deep / 18 cm/s shelf. Reflection/diffraction/
    refraction all EMERGE from the solver, nothing scripted. Registered
    under topic 14.3. Numerics verified against numpy (lambda within ~3%
    of v/f; grid dispersion). Engine details that matter: beaches use
    VELOCITY damping (-gamma*u_t) - a naive multiplicative decay on
    displacement reflects badly (~50%+); measured wall echo now ~1% via
    detrended standing-wave-ratio test. Source is a SOFT (additive)
    full-height dipper line at x=10 with a strong absorber housing behind
    it: launches one-way left-to-right, transparent to returning waves
    (a hard source line makes the tank a resonant cavity). Playback speed
    control (1/4x, 1/2x, 1x) via a substep accumulator.
  - `/simulations/double-slit` — Young companion (14.3 extension),
    REBUILT per user feedback to be the same wave engine as the ripple
    tank (the first light-based version auto-scaled the view so the a/D
    sliders visibly did nothing). Now: the a slider physically moves the
    slits, the D slider physically moves a detector line, f is the
    wavelength dial. A detector integrates the wave field along the
    screen and MEASURES fringe spacing, displayed as a three-way
    comparison: formula x = lambda*D/a vs exact path-difference theory
    (bisection, no small-angle) vs measured. Node-verified: in the
    strained regime (a=20, D=15) formula says 3.8 cm, exact says 5.0,
    field measures 5.0 - the sim validates wave theory and exposes the
    formula's far-field small print. Second sim under topic 14.3; the
    chapter page was upgraded to group sims per topic (was a Map that
    silently overwrote; now one labelled button per sim).
  - `/simulations/gas-laws` — Gas in a Box (9.3 & 9.5, registered under
    topic 9.5 aedaea73): hard-disc molecular dynamics, N up to 280 with
    pairwise elastic collisions. Pressure is MEASURED from wall-impulse
    accounting (nothing scripted); node-verified pV constancy 97.7%
    across full compression and pressure law ratio 3.09 vs 3.00. Physics
    radius R=2 chosen deliberately: R=3 gave 90% constancy from excluded
    volume (real-gas effect). Draggable piston with moving-wall
    reflection (2u_p - v) -> honest adiabatic heating on fast
    compression, soft bath thermostat (rate 0.02/substep) relaxes back.
    Dial gauge, thermometer (bath setpoint vs measured T_kin), live p-V
    chart with theory isotherm + measured trail, speed-coloured
    particles, technical overlay = emergent Maxwell-Boltzmann histogram
    vs Rayleigh curve. sim_type enum has no 'particle' - used
    'collision'. THREE MODES: Boyle (kinematic piston, p-V chart vs
    isotherm), Pressure Law (fixed V, p-T chart, line through absolute
    zero), Charles (overdamped free piston v = 0.025*(p_gas-p_ext)*H
    clamped +-60, node-verified V/T constant +-3% and settle within
    2-8% of V=NkT/p_ext; p_ext slider 10-26; V-T chart through origin).
    Trail is mode-aware {x,y}; formula card/hints/Try This switch per
    mode. 15 questions seeded (ch9 problems 1-15: 5x topic 9.3, 10x
    topic 9.5 incl pressure law, Charles, kelvin, absolute zero).
  - `/simulations/half-life` — Half-Life Lab (23.2 & 23.3, registered
    under topic 23.3 97e38b4a): stochastic decay, each nucleus rolls
    P = 1 - e^(-lambda*dt) per frame (exact), nothing exponential
    programmed. Grid of 100/400/900 brass nuclei with decay flashes,
    one ringed 'watched' nucleus (unpredictability), measured N-t curve
    vs dashed theory N0*2^(-t/T-half), red dots + printed intervals at
    each measured halving, live activity counter (1s sliding window),
    technical overlay compares measured activity vs lambda*N. sim_type
    'graph_builder'. Chapter 23 questions seeded (problems 1-10: 5x
    topic 23.2, 5x topic 23.3).
  - `/simulations/pressure-in-liquids` — p = rho*g*h bench (5.4 & 5.5,
    registered under topic 5.5 5c5e1c9b): 2 m tank, draggable probe
    whose measurements land as colour-tagged dots on a live p-h chart
    (persist across liquid switches for slope comparison), 5 liquids,
    3 gravities (Moon/Earth/Jupiter), gauge-vs-absolute toggle
    (+101.3 kPa), Torricelli wall spouts at 0.5/1.0/1.5 m with
    v = sqrt(2gh) droplet jets (analytic kinematics, no engine).
    Technical panel notes the rho-independence of jet speed. sim_type
    'force_diagram'. Ch5 questions extended: problems 6-15 (5x topic
    5.4 conceptual, 5x topic 5.5 calculations); ch5 problems 1-5 were
    the spring sim's.
  - Layout: ripple-tank, double-slit, gas-laws, half-life, and pressure-in-liquids pages use a full-width layout
    (max-w-[1600px], canvas card full width, notebook cards in a
    lg:grid-cols-3 row below). Older sims keep the two-column layout.
- **Practice engine** (IXL/Khan-style): `/practice/[topicId]`. Question-by-
  question, streak-based mastery (5 correct in a row), wrong answers surface
  a "revise this" link back to the lesson + its simulation. 65 original
  practice questions seeded across 13 lessons — 5 each for the 6 original
  sim lessons, 13.2/13.3 (refraction/TIR), 4.1/4.2 (moments), and all of
  chapter 14 (14.1/14.2/14.3, waves).
  Green "🎯 Practice" button appears on chapter pages for lessons that have
  questions.
- **Teacher accounts**: signup requires school name + message, starts
  `status='inactive'` pending approval. `/teacher/pending`, `/teacher/dashboard`
  (sections, join codes), `/teacher/sections/[id]` (roster).
- **Admin portal**: `/admin` (overview stats), `/admin/users` (search, role/
  status editing), `/admin/sections` (all sections, any teacher),
  `/admin/curriculum`, `/admin/teacher-applications` (approve/reject).
- **Student class join**: `/dashboard/join-class`, enter a teacher's code.
- **Auth**: httpOnly cookie (not just localStorage) + `lib/auth/session.ts
  getCurrentUser()` for Server Components — this is what every protected page
  and the Navbar's login-aware state runs on. Self-service password reset at
  `/auth/forgot-password` (token-based, 1hr expiry) — SMTP isn't configured
  yet, so it falls back to showing the reset link directly on-screen instead
  of pretending to email it.
- **Subscription tiers** (data model + pricing decided, no UI or payment
  wiring yet): `subscription_plans` table seeded with Free / Plus (99 TRY/mo,
  999/yr) / Pro (179 TRY/mo, 1799/yr) — see that table for exact features.
  All hypothetical, easy to change before real money is involved.

## Decisions

Judgement calls that shape later work. Newest first.

- **2026-10-29 — Approved student solutions use the teacher solution's gate, not a new one.**
  "Respect the existing tier gating if it applies" — it does: same lesson tier, same
  "after a wrong answer" rule, same view budget; one view opens a question's teacher and
  student solutions together. (Not "visible to all logged-in students".)
- **2026-10-29 — Age is a self-declared band, asked once.** `users.age_band` (no date of
  birth stored). Unknown = under 18 (parental consent required). The first answer is kept;
  students can't change it (an admin can, in SQL), so they can't flip it to skip the parent
  box. A student who turns 18 keeps ticking the parent box until an admin updates it.
- **2026-10-29 — Parental consent is a checkbox the student ticks**, recorded as
  `parent_consent_at` with the exact wording in `consent_text`. Nothing contacts or
  verifies the parent.
- **2026-10-29 — Only students share** (`role = 'student'`); teachers get the workspace
  without the share button; admins write the teacher solution instead.
- **2026-10-29 — Withdrawn rows are kept** (status + `withdrawn_at`, content and consent
  record intact, shown to nobody but the author and admins). Withdrawn is final; the student
  can share a new copy. Rejected rows can be re-approved by an admin; approved can be
  "unpublished" by rejecting.
- **2026-10-29 — "Need help?" pill hidden on practice pages.** The right panel now has
  controls along its whole bottom edge on every layout (it covered "Share my solution");
  the wrong-answer "🎥 Request a video" link now shows on every layout instead.

- **2026-10-28 — Feedback sounds are synthesized, not audio files.** The brief allowed either;
  Web Audio costs no request or preload, starts instantly and needs no licence. Milestone =
  a correct answer that completes the set or newly masters the lesson (never on a wrong one).
  The tick sound on option select and a toast "pop" (both optional) were left out: in a
  classroom they would be noise.
- **2026-10-28 — What's New lives in `site_updates`, separate from `lib/announcements/updates.ts`.**
  The hand-kept feed (pill, homepage feed, /updates) is untouched; the new table only drives the
  video card in the hero. Extra columns beyond the brief: `loop_mp4_url`/`loop_webm_url` (the
  720p hero loop; the 1080p film plays in the modal), `captions_vtt_url`, `created_at`/`updated_at`.
- **2026-10-28 — Hero card placement**: its own full-width row under the headline + film, above
  the video-request CTA, so the existing hero does not move and the card is never above the fold
  on phones. Its poster is drawn into a `<canvas>` so it can never become the page's LCP element.
- **2026-10-28 — Replay order = stored order**, even where the storyboard listed another order:
  the canvas appends strokes in the order they are written, and the brief says not to alter the
  handwriting. Pacing is synthesized for strokes without timestamps (all strokes before today).
- **2026-10-28 — First announcement served from `public/video/updates/` (static, 26 MB in git)**
  because this session could not reach Supabase Storage; the bucket + admin upload path is built
  and tested for the next ones. Move these into the bucket whenever convenient.
- **2026-10-28 — Video tooling is its own workspace** (`video/`, React 19 + Remotion 4.0.534
  there only); the site's tsconfig/vitest exclude it and Vercel never installs it.

- **2026-10-28 — Handwritten solutions share the interactive solutions' view budget.**
  "Respect the existing tier logic" was read as one gate and one budget: opening a new
  handwritten solution spends a Free/Plus solution view exactly like an interactive one
  (Pro unlimited), and the out-of-views state shows a teaser like `static_preview`. The
  view is only spent when the student presses "Show the worked solution" (never on the
  automatic status check), so a wrong answer alone costs nothing.
- **2026-10-28 — "Answered incorrectly" = any wrong attempt on that question, ever.** Once
  a student has got it wrong they may reopen the solution (it also stays unlocked under
  the view budget). The page itself only shows it right after a wrong answer, never
  after a correct one or before answering.
- **2026-10-28 — Practice page is a full-viewport app**, covering the site navbar/footer
  with its own minimal top bar, so it can fit one screen on every device without
  touching the root layout. Back arrow → lesson.
- **2026-10-28 — Snapshots in the database, not Storage** (see the section above for the
  size estimate and when to revisit).

- **2026-10-14 — Curriculum view: lesson type is derived, not stored.** Lessons are
  `topics` rows, which have no type column; the `lessons` table (the one with
  `lesson_type`) is still empty. Row icon mapping: has a simulation → flask ("Simulation");
  else has practice questions in this curriculum → pencil ("Practice set"); else → document
  ("Reading"). Video → play icon ("Video lesson") is implemented but no lesson produces it:
  **no video data exists on topics, so no current lesson maps to "video"**. Activity has no
  data either and would use the document icon. Any future/unknown kind falls back to the
  neutral document icon. A lesson with both a simulation and questions shows the flask and
  still shows "{n} questions".
- **2026-10-14 — Sub-topic headings** come from syllabus sections that two or more of a
  chapter's lessons share (IB A.2 has 8, 9702 3.7 has 3). Lessons alone in their section
  form one unnamed group (their section title is usually their own title), placed where its
  first lesson was. A chapter that is all one section gets no headings. IGCSE gets no
  sub-topic headings: its chapters are coursebook chapters whose lessons cite syllabus
  sections out of order, so grouping would reorder the book. Effect today: 9702 Chapters
  1–2 show no headings (every lesson its own section).
- **2026-10-14 — Column balancing** counts lesson rows only (headings not counted). Groups go
  in original order to the column with fewer rows (left on a tie). A group bigger than half
  the chapter is split: its head fills the shorter column to half, the rest continues at the
  top of the other column under the same heading marked "(continued)" (an unnamed group just
  continues, with no heading). 9702 Chapter 1 (8 lessons, one unnamed group) therefore splits 4/4.
- **2026-10-14 — Chapter mastery** = mastered lessons ÷ lessons that can be mastered in this
  chapter (practice questions in this curriculum, or already mastered via another bank);
  the 5-in-a-row rule is unchanged. Row ring = best run ÷ 5. Shown only to logged-in
  students with at least one practice record in that chapter.
- **2026-10-14 — Lesson number** = the curriculum's topic code (AS/A Level/IB); for IGCSE the
  coursebook number is split off the title ("2.2 Distance-time graphs" → 2.2). Skills lessons
  ("Maths", IB "Tool 3") show no number.
- **2026-10-14 — Breakpoint 900px** via Tailwind's `min-[900px]:` variant rather than a new
  named screen in `tailwind.config.ts`, so no other page's breakpoints move. The page
  container widened from `max-w-4xl` to `max-w-5xl` to give the two columns room.

## Explicitly NOT built yet

- **`/pricing` page** — tiers exist in the DB, no frontend for them yet.
- **Iyzico payment integration** — blocked on the user's merchant application
  being approved (was in review as of 2026-07-21) and them providing API
  key + secret (sandbox is fine to start). Do not attempt to fabricate
  credentials or "test" this without real ones.
- **Quizzes / timed exams with lockdown mode** — discussed and scoped
  (fullscreen-required, tab-switch detection, auto-submit on violation,
  violation log for teachers) but not started. Honest technical ceiling:
  browser-based lockdown can detect and log violations, it cannot make
  leaving the tab physically impossible — that needs a native app, which is
  out of scope.
- **Real past-exam content** — explicitly will never "import" actual
  Cambridge past papers (copyright). Only original questions, written fresh.

## Known gotchas worth knowing before touching this repo

- **Escape sequence bug**: typing `\uXXXX` unicode escapes (e.g. `\u2019` for
  a curly apostrophe) into `file_text`/`new_str` params has repeatedly landed
  as a literal double-backslash in the actual file, breaking the character
  instead of rendering it. Always type the literal Unicode character directly
  (´ ’ Ω Δ · —, etc.), never `\u` escapes. Scan for `u2019|u0394|u00B2|u2014|
  u2212|u03A9` etc. before every deploy — this has bitten nearly every
  simulation file at least once.
- **Two GitHub repos** (corrected 2026-10-13): Vercel now builds production
  from `ashphys` `main`. `ashphyss` (double s) is a stale mirror and pushing
  there deploys nothing. (Older notes in this file say the opposite.)
- **`tsc --noEmit` isn't enough** for anything nontrivial — it's passed clean
  while real Next.js builds still failed on things like the Google Fonts
  network call this sandbox can't reach. Standard workaround: temporarily
  stub the Inter font import in `app/layout.tsx`, run `npm run build`, then
  restore the file before committing (never commit the stub).
- **information_schema queries need `table_schema='public'`** — Supabase's
  `auth.users` table has the same name as the app's `public.users` and will
  silently pollute results otherwise.
- Local `bash_tool`/`view`/etc. have had at least one real outage during
  development (tools returning "not found" for an extended period, unrelated
  to Vercel/GitHub/Supabase all being healthy). If that happens: the actual
  infrastructure (GitHub/Vercel/Supabase) is a separate concern from sandbox
  tool availability — check them independently rather than assuming one
  implies the other.
- **Supabase `execute_sql`/`apply_migration` hang on a bare `DELETE`, AND on
  any literal `;` character in the submitted text (2026-10-09)**: a `DELETE`
  against a live table with existing rows reliably times out after 60s with
  nothing applied, while `SELECT`/`INSERT`/`UPDATE` all work instantly — this
  looks like a destructive-statement confirmation gate with no way to
  confirm in an unattended session. Workaround: never DELETE-then-INSERT to
  replace a bank; instead `UPDATE` existing rows in place (reusing their real
  ids) and only `INSERT` the surplus — see
  `database/seeds/_existing_as_rows.py` and the AS Kinematics seed below for
  the pattern. Separately, and much easier to trip over by accident: **a
  bare `;` ANYWHERE in the submitted SQL text hangs the same way, even
  safely inside a single-quoted string literal** (e.g. an explanation like
  `'Speed is a scalar; direction doesn't matter.'`) — this is unrelated to
  statement type, count, or payload size (20-30+ statement, 20KB+ batches of
  plain INSERT/UPDATE apply instantly with zero bare semicolons in them).
  The fix used here: any text value containing `;` is built as
  `('part1' || chr(59) || 'part2')` string concatenation instead of a plain
  quoted literal, so the character never appears literally in the
  transmitted SQL while the stored value is unaffected (see the `q()`
  helper in `database/seeds/2026-10-09-as-kinematics-accelerated-motion.py`).
  Any future seed script with free-text content (explanations, question
  text) should route its string-escaping helper through this same trick.

## Design language

Two distinct visual systems, intentionally:
- **Main site** (dashboards, auth, curriculum, admin): clean minimalist
  black/white/serif, Tailwind grays + blue-600 accent, matches the original
  AshPhys brand.
- **Simulations**: a separate "lab notebook" palette — warm paper background
  (#faf7f0), graph-paper grid, ink navy (#1b2a41), brass (#b8823d), teal
  (#2e7d6b), danger red (#b34a3c), plus violet/blue/magenta accents per-sim.
  Consistent across all 6 sims on purpose so the simulations section reads
  as one product.

## Booklets section (2026-08-28)
- School banned foreign books — user/teacher now writing original booklets
  per chapter/lesson themselves. No copyright concern (own content).
- Same architecture as past-papers, cloned directly: Storage bucket
  `booklets` (public, PDF-only, 50MB cap — larger than past-papers'
  20MB since teacher booklets may be more image-heavy), table `booklets`
  (chapter_id required, topic_id nullable — null means whole-chapter
  booklet, set means lesson-specific booklet, so both granularities
  the user asked about are supported from one table).
- Admin `/admin/booklets`: chapter dropdown -> topic dropdown (filtered
  to that chapter, "Whole chapter" option) -> title/description -> file
  picker that uploads on selection and auto-fills file_url + tracks
  file_size_bytes. Storage path auto-slugged:
  chapter-<N>/<lesson-slug>/<title-slug>.pdf (or chapter-<N>/<title-slug>.pdf
  for whole-chapter booklets).
- Public `/booklets`: grouped by chapter number, lab-notebook styling
  matching past-papers/simulations. Only shows booklets with a real
  file_url (no placeholder/dead links). Direct download links,
  target=_blank.
- Capacity check done this session: DB usage 12MB/500MB free tier
  (2.4%, booklets add negligible metadata). Storage usage 0 bytes
  (nothing uploaded yet through any pipeline, past-papers included).
  Recommended Pro tier ($25/mo, 100GB storage) once booklets + past
  papers are both actively used — free tier's ~500MB-1GB could get
  tight with 89 lesson-level booklets at realistic sizes, Pro tier
  removes the question entirely.
- Nav links added (Navbar + AdminNav).
- SESSION NOTE: this session's sandbox container had NO prior state
  (fresh container, not a lost-work situation) - re-cloned from GitHub
  successfully with the existing token; full git history intact
  through commit 9e4bfe6. Token still active as of this session -
  standing reminder to revoke stands.

## Prep Physics chapter (2026-08-28)
- New chapter 0 "Prep Physics" (id 683a1a72-6900-4e3c-a063-dca54eb50d4a),
  chapter_number=0/order=0 so it sorts above chapter 1 without renumbering
  the other 25. course_id matches all other chapters (single course row).
- 8 topics seeded (order 1-8): Rearranging Equations (6cb3f4b2...),
  Standard Form & Sig Figs (04575a57...), Unit Prefixes (12a38624...),
  Constant of Proportionality (1f4e68db...), Reading/Interpreting
  Graphs (235adaf3...), Basic Trig for Physics (0e3dc753...), Geometric
  Projections (87127372...), Order of Magnitude & Estimation
  (d4129957...). User explicitly wants a simulation for EACH ("that is
  VIP") - building one at a time, user reviews between each per their
  stated preference.
- `/simulations/equation-rearranger` (1st of 8, topic "Rearranging
  Equations") SHIPPED: NOT a physical simulation - a guided algebra
  trainer, deliberately different genre from every other sim on the
  platform since the skill itself is symbolic manipulation, not a
  phenomenon to model. 13 challenges across 6 real IGCSE formulas
  (F=ma, rho=m/V, V=IR, P=E/t, p=rho*g*h, v=u+at), 1-2 steps each.
  Step-by-step: student picks the correct legal operation from a
  randomized-position pair (correct vs decoy), decoy always has a
  specific written explanation of why it fails (not just "wrong").
  On full isolation: editable "verify with numbers" panel computes
  the target BOTH via the original relationship and the derived
  final formula from the same sample values, shows them agreeing live.
  All 13 rearrangements independently verified in node before writing
  any UI code (6 equation families, spot-checked with real numbers).
  sim_type 'graph_builder' (reused, no better enum value exists -
  same workaround as gas-laws needing 'collision').
- REMAINING 7 sims for this chapter, not yet built: Standard Form &
  Sig Figs, Unit Prefixes, Constant of Proportionality, Reading Graphs,
  Trig for Physics, Geometric Projections, Order of Magnitude. Topics
  already exist in DB and show on /curriculum now (chapter 0, at the
  top) even before their sims ship - curriculum page already supports
  chapters/topics with no sim yet (shows no "Launch Simulation" button
  until one is registered against that topic_id).

## Equation Rearranger REBUILT as animated click-to-isolate (2026-08-28)
- User rejected the button-quiz version, wanted genuine animation: click
  ANY variable, watch it visually move/cross the equals sign in front of
  the student, other variables redistributing to maintain the
  relationship. "I NEED THE STUDENT TO SEE THE VARIABLE MOVE IN FRONT
  OF HIS EYES" - full rebuild, not an iteration on the quiz version.
- Built a GENERAL algebra engine (not 13 hand-scripted answers): Side =
  {groups: [{sign,factors[]}], denom: [...]}. isolate(state, target)
  runs three rules: (0) pre-phase - if target starts inside a
  denominator, clear the fraction (move it to the opposite side's
  numerator); (1) additive clear - if target's home side has >1 summed
  group, move every OTHER group to the opposite side with sign flipped;
  (2) multiplicative clear - move every other factor in target's group
  to the opposite side's denominator, and if target's own side had a
  denominator, multiply those factors onto the opposite side's
  numerator. This derives correct rearrangements for ANY variable in
  ANY of the 6 equations (F=ma, rho=m/V, V=IR, P=E/t, p=rho*g*h,
  v=u+at), not just the ones explicitly tested.
- VERIFICATION (before any UI code): node script tested all 13
  previously-known targets (100% match against the old hand-verified
  bank), found and fixed 2 real bugs in the process (a
  denominator-starting-target case that threw "not found", and a
  cosmetic paren-formatting issue). Then, after porting to TS, wrote a
  SECOND independent verification mirroring the exact ported code
  structure and tested ALL 20 variable/equation combinations
  (previously-untested trivial cases like clicking F in F=ma included)
  - 20/20 pass, checked by plugging the derived value back into the
    ORIGINAL equation and confirming both sides balance (stronger check
  than comparing two separately-computed numbers).
- ANIMATION: tokens are individually absolutely-positioned spans (not
  canvas), keyed by symbol text, with CSS transition on left/top -
  React re-render with new layout-computed positions triggers smooth
  animated movement automatically, no animation library needed (none
  installed in this project; kept it that way). layoutEquation() is a
  hand-rolled fixed-cell-width layout (CELL_W=46, OP_W=30) that
  linearizes each side into numerator/denominator token rows with a
  fraction bar when a denominator exists, computes total width, and
  the whole assembly is centered via a flex parent + width-transitioning
  inner div so token positions AND overall re-centering both animate
  together.
- TWO-STAGE animation sequencing for equations needing both phases
  (only v=u+at in current bank): initial -> (1000ms) -> intermediate
  (additive-cleared state, CSS-transitions tokens into place) -> pause
  -> (900ms) -> final (multiplicative-cleared). Single-phase equations
  just animate straight to final. Managed via chained setTimeout with
  a timeoutsRef to cancel/prevent overlap if the user clicks a new
  target mid-animation.
- Clicking ANY variable at ANY time (including after already solved)
  restarts the derivation fresh from eq.initial for the newly-clicked
  target - no separate "reset" required to try a different variable,
  though a Reset button is also present.
- "Verify" panel: plug the DERIVED value back into the ORIGINAL
  (unrearranged) equation using editable sample numbers for the other
  variables, confirm both sides balance - live, for whatever numbers
  the user tries.
- Simulation DB row reused (same url_path /simulations/equation-
  rearranger, same id) - description updated to describe the new
  click-to-isolate mechanic instead of the old button-quiz.
- KNOWN LIMITATION (documented, not hit by current bank): the engine
  is not a full CAS. Two shortcuts taken deliberately because they're
  safe for all 6 equations here: (a) home-side detection after the
  pre-phase assumes target is in L if not immediately provable
  otherwise (no throw) - safe because every click target is guaranteed
  to come from an actual rendered token; (b) multiplying a cleared
  denominator's factors onto the opposite side assumes that side has
  exactly one group (true for all 6 equations - none combine an
  additive opposite side with an incoming denominator-clear). Flagged
  for whoever adds equation #7 later.

## Equation Rearranger v3: full Manim-style choreography (2026-08-28)
- User wanted the actual worked derivation shown, not just a jump to
  the answer: "divide by m in both sides in one slide, then cancel
  both m's in the other slide, and then rearrange... slow and smooth,
  exactly like manim simulations".
- Engine restructured AGAIN: isolateSteps() now emits ONE MOVE PER
  TERM CLEARED (not batched) - e.g. p=rho*g*h isolating rho gives
  TWO separate moves (div h, then div g), each independently
  animated/cancelled, matching the granularity requested. Two more
  real bugs found and fixed in this pass (node-verified before any
  TS/animation code): a target that starts already-alone in its
  numerator but still stuck under a denominator (e.g. 'm' in
  rho=m/V) was skipping the denominator-clear step entirely (the
  multiplicative while-loop condition only checked "more than 1
  factor in the group", never checked "does home side still have a
  nonzero denom"). Fixed with a second while-loop. Re-verified full
  20/20 (structural isolation check + numeric balance check) before
  writing the TS port.
- ANIMATION MODEL (per move): annotate (op label fades in under BOTH
  sides, home side under the term's own side, opposite side under
  the side that's GAINING it) -> strike (red strikethrough on the
  home-side original token + its annotation twin) -> fade (both drop
  to opacity 0) -> settle (the surviving OPPOSITE-side annotation
  transitions position+color from strip into its real computed slot
  in the updated layout, while ALL other tokens simultaneously
  reflow via the same displayState update). Durations deliberately
  slow: annotate dwell 1400ms, strike 550ms, fade 750ms, settle
  1150ms, gap 550ms between moves, final flip 1500ms.
- KEY DESIGN DECISION: the "opposite side" annotation is rendered as
  ONE PERSISTENT overlay element throughout annotate->settle (not
  handed off between two different code paths), with mainTokens
  filtering that exact symbol out for the same window - avoids any
  cross-render key-continuity fragility. Its target position during
  'settle' is computed by running layoutEquation() on the SAME
  stateAfter that mainTokens uses, guaranteeng the handoff position
  matches exactly (no jump) when the overlay is dropped and mainTokens
  takes over unfiltered.
- The home-side cancelling token is rendered at its EXACT pre-move
  position (looked up from the CURRENT layout.tokens before
  filtering), not the block's center - matters when a side has
  multiple factors (e.g. "m x a") so the strikethrough lands on the
  right symbol, not between two symbols.
- FINAL FLIP: after all moves complete, if the target didn't
  naturally land on the left, the whole equation slides (via
  mirror(state) + the same stable-key token system) so the isolated
  variable always ends up on the left, matching the explicit request.
- Fixed a real UX bug found during this build: clickable condition
  was `!target` (only clickable before ANY variable had ever been
  picked) - meant you could never try a second variable after the
  first derivation finished. Fixed to `phase==='idle'||phase==='done'`.
- Removed two dead/unused variables from an earlier design pass
  (isHomeCancelling, isHomeSideOfActiveMove) that were computed but
  never referenced in the render output.
- Same DB row/URL reused (/simulations/equation-rearranger).

## Equation Rearranger v3.1: bug fixes from screenshot + chaining (2026-08-28)
- User screenshot of p=rho*g*h clicking rho showed: (1) a bare
  strikethrough line with NO letter visible where 'g' should be in
  the main row, (2) a lone 'g' character floating at the bottom-left
  of the screen instead of under a clear side, (3) requested smoother
  no-jump transitions, (4) requested chaining (solve for a new
  variable starting from the CURRENTLY DISPLAYED/rearranged equation,
  not silently jumping back to the original) with an explicit Reset
  button to return to the true original.
- ROOT CAUSES FOUND:
  1. The "cancelling home token" overlay div rendered the strikethrough
     line but never actually rendered {activeMove.symbol} as its text
     content - a straight-up missing-JSX-content bug.
  2. The "opposite side" overlay (meant to show the operation applied,
     then settle into place) was showing the BARE migrating symbol
     (e.g. "g") for the ENTIRE annotate/strike/fade window instead of
     the operation label (e.g. "div g") - conflated two different
     things that should only converge at the 'settle' stage. Fixed by
     giving the overlay a {content, isPill} pair that's opLabel+pill
     styling during annotate/strike/fade, and bareSymbol+token styling
     only during settle - same persistent element throughout, so the
     transition is smooth (position/style/content all animate
     together via one 900ms CSS transition), not a hard swap.
  3. STRIP_Y=130 combined with a too-short 210px container caused the
     annotation strip to sit near/past the container's bottom edge -
     bumped STRIP_Y to 95, container height 210->260, verified with
     manual pixel-margin arithmetic (denominator row bottom ~118px,
     strip top ~170px, strip bottom ~191px, well inside 260px).
     ALSO found and fixed a second contributing bug: the home-side
     annotation pill was using `top: STRIP_Y` (missing the `+75` base
     offset every other element uses), placing it 75px higher than
     its opposite-side counterpart - real vertical misalignment bug,
     not just a spacing issue.
  4. Standardized ALL token transitions to a consistent 900ms
     ease-in-out (previously 750/900ms mixed) so nothing settles
     ahead of or behind anything else.
- CHAINING implemented: new `baseState` (separate from the per-equation
  `eq.initial`) is what solveFor() now derives from. It starts equal
  to eq.initial, and updates to the just-completed derivation's final
  (flipped) state once a derivation finishes - so clicking a NEW
  variable continues from what's on screen. Reset button (relabelled
  "Reset to original equation") explicitly restores baseState to
  eq.initial; switching equations also resets it. Verified the
  algebra engine needs no changes for this - isolateSteps() already
  operates generically on whatever EqState it's given, confirmed by
  hand-tracing a chained example (a=F/m, then click F -> correctly
  derives F=a*m via a single "x m" denominator-clear move).
  Also fixed a related bug: finalState's fallback (when a var is
  already isolated, 0 moves) was hardcoded to eq.initial instead of
  baseState - would have shown the WRONG "other side" text for a
  chained already-isolated case.
- Cleaned up a leftover unused target_ parameter from an earlier
  edit pass in playMove/finishAndMaybeFlip.

## Equation Rearranger v4: operation forms in-line, not a floating pill (2026-08-28)
- User provided two screenshots + a Manim example GIF showing the
  correct mental model: the divisor/multiplier should visually form a
  REAL fraction (or REAL new term) directly on the existing content of
  BOTH sides, not appear as a separate floating annotation. Example:
  F=ma isolating a should show F literally growing a fraction bar to
  become F/m, while m*a simultaneously grows the same denominator to
  become (m*a)/m, THEN the m/m cancels - not a detached "div m" pill.
  Told the user plainly: not literally using the Manim Python library
  (pre-rendered video, wrong fit for an interactive site) - matched
  its visual language inside the existing live React/CSS system.
- COMPLETE REWRITE of the animation model (4th major iteration of this
  sim). New concept: `buildIntermediate(move, before)` constructs the
  UNSIMPLIFIED state (operation injected into both sides, nothing
  cancelled yet) - e.g. F=ma dividing by m literally produces
  left={F, denom:[m]}, right={m*a, denom:[m]} as one real EqState,
  fed straight into the EXISTING layoutSide/layoutEquation functions
  (unchanged) - no separate overlay/pill rendering code needed at all
  anymore, since the "operation" IS the equation now.
- KEY SCHEME REDESIGNED: switched from `symbol` alone to
  `symbol:role:side:index` (role=n/d, index=group or denom-array
  position) because the unsimplified intermediate state can
  transiently show the SAME symbol twice on one side (e.g. 'm' in
  both the numerator "m*a" AND the newly-injected denominator) -
  needed unique keys to avoid React key collisions and to precisely
  target strikethrough/fade at the correct instance.
- REAL BUG FOUND in this pass (caught in node before any TS/rendering
  code): moves that clear a variable from a DENOMINATOR (e.g. V under
  m in rho=m/V) need OPPOSITE injection treatment (inject into the
  NUMERATOR) from moves that clear an extra NUMERATOR factor (inject
  into the DENOMINATOR) - both were tagged the same generic
  kind:'multiplicative' internally, which isn't the same as which way
  to inject. Added an explicit `op: 'divide'|'multiply'|'addsub'`
  field to Move (derivable from the already-correct opLabel prefix,
  now made an explicit field instead of string-parsed) and branched
  buildIntermediate on THAT, not on kind. Re-verified 20/20 with the
  fix.
- THREE-LAYER VERIFICATION before writing render code: (1) node
  algebra check - does the unsimplified intermediate, once simplified
  by removing the cancelling pair, equal the already-verified
  move.stateAfter? 20/20 pass. (2) Hand-mirrored (not regex-
  transpiled - tried that first, too unreliable) copy of the actual
  TS buildIntermediate/varKey/layoutSide functions, checked that
  EVERY cancelKey returned actually corresponds to a real token key
  layoutEquation produces for the mid state - 21/21 moves across all
  20 cases confirmed no silent key-mismatch (exactly the KIND of bug
  that caused the previous round's visible glitches). (3) tsc + full
  npm run build both clean.
- Fade-in mechanism for injected tokens: render at opacity 0 on
  mount, then flip a state flag via DOUBLE requestAnimationFrame
  (ensures the browser paints the opacity:0 frame before flipping, so
  the transition actually plays instead of being coalesced away) -
  standard CSS-transition-fade-in-on-mount pattern, no library.
- Removed STRIP_Y entirely / the whole floating-pill system - no
  longer needed, everything renders in the equation's own
  numerator/denominator rows. Container height reduced back down
  (130px) since there's no separate annotation strip taking vertical
  space anymore.
- Chaining (baseState) and Reset button from the previous pass
  retained unchanged - still correct, no changes needed there.

## Standard Form & Significant Figures sim (2026-08-28, 2nd of 8 Prep Physics sims)
- /simulations/standard-form: step the decimal point through real
  physics quantities' digits (Moon distance, speed of light, Sun
  distance, Earth radius, hydrogen atom diameter, green light
  wavelength, electron mass, radio wave period) - value pinned
  mathematically constant at every marker position (compExponent =
  trueExponent + (1-pos)), verified in node across the full bank at
  every position before any UI code, not just at the correct spot.
  "Snap to Standard Form" button jumps straight to pos=1; starting
  position is deliberately non-standard-form so there's something to
  actually do.
- Second panel: round the same digits to N significant figures via
  slider, showing kept vs greyed-out digits live. Rounding logic
  (digit-string based, with proper carry-over handling e.g. 998 -> 10
  needing an exponent+1 bump) independently verified against 9 cases
  including the carry-over edge case before shipping.
- Registered under topic_id 04575a57 (Standard Form & Significant
  Figures, order 2 in chapter 0 Prep Physics). sim_type
  'graph_builder' (reused enum value, no better fit exists).
- No practice questions seeded yet for this topic - can add if
  requested.
- REMAINING Prep Physics sims not yet built: Unit Prefixes, Constant
  of Proportionality, Reading and Interpreting Graphs, Basic Trig for
  Physics, Geometric Projections, Order of Magnitude & Estimation.

## Optics Puzzle: Lenses & Mirrors (2026-08-28) - largest build of the session
- User referenced prismrules.com (a paid $10 commercial indie game by
  an independent dev named Alan) as inspiration for an optics puzzle
  in the lens/mirror lessons. Explicitly did NOT scrape/embed/copy that
  game - built an ORIGINAL implementation of the "drag optical elements
  to guide light to a goal" genre, own code/levels/art, scoped to the
  actual syllabus (13.1 reflection, 13.4 lenses) rather than the full
  prism-dispersion scope of the reference game.
- REAL RAY-TRACING ENGINE, not scripted per-level behavior. Three
  physics primitives, independently verified in node BEFORE any
  rendering code:
  1. Plane mirror: standard vector reflection formula.
  2. Curved mirror: reflection from the TRUE LOCAL NORMAL at the exact
     arc-intersection point (not a principal-ray diagram) - verified to
     reproduce the real paraxial focal length f=R/2 AND genuine
     spherical aberration at larger ray heights, matching real spherical
     mirror behavior beyond the simplified paraxial case.
  3. Thin lens: paraxial ABCD transform theta_out = theta_in - h/f -
     verified to reproduce ALL THREE classical principal-ray rules
     (parallel->focus, through-center->undeviated, through-focus->
     parallel) from ONE general formula, so it correctly bends ANY ray,
     not just the 3 special textbook ones.
- TWO REAL BUGS FOUND in the full port (caught before shipping, via a
  hand-mirrored node re-verification of the actual TS source - same
  practice as the equation rearranger):
  1. Concave/convex mirror center-of-curvature had an extra unwanted
     sign flip, placing C on the wrong side entirely (was giving focal
     crossings ~350 instead of correct ~250 for a test case). Root
     cause: `-sign*R` should have been `sign*R`.
  2. Lens optical-axis perpendicular was a FIXED direction based only
     on the lens's own angle, which happens to point backward relative
     to the ray for some orientations, silently flipping the sign of
     theta_in/theta_out and giving CONSTANT wrong crossings regardless
     of ray height. Fixed by choosing whichever of the two valid
     perpendiculars is aligned with the incoming ray direction, before
     using it for both the intersection AND the angle decomposition.
  Also caught and corrected an arithmetic mistake in my OWN test
  expectations while debugging (confused R with f=R/2 in a comment) -
  worth remembering that a "failing" verification can be the test
  being wrong, not just the code; re-derived by hand before concluding
  which one was actually wrong.
- LEVEL SOLVABILITY independently verified via grid search (not just
  "the engine works," but "each of the 6 levels as designed actually
  has a real solution reachable by dragging/rotating the given
  elements") - all 6 confirmed solvable (best-found distance to goal
  effectively 0.0-0.2px against a 16px goal radius), including the
  combo level which needed a fuller position+angle search after an
  initial coarse angle-only sweep came up empty (search coarseness,
  not an unsolvable level).
- 6 original levels: plane mirror, concave mirror (converging),
  convex mirror (diverging), convex lens (converging), concave lens
  (diverging), mirror+lens combo. Canvas-based (matching ripple-tank/
  gas-laws/half-life's rendering pattern), drag-to-move + a small
  rotate-ring handle per element, real-time re-trace on every
  pointer move (not pre-baked), animated flowing-dash beam (gold,
  turns teal on goal hit).
- Registered under Chapter 13 (Light), topic 13.4 Lenses (also covers
  13.1 reflection). sim_type 'optics' (a real enum value, first sim
  to use it).

## Orthographic Projections sim (2026-08-28, 3rd of 8 Prep Physics sims)
- User vision (with 3 reference images: SolidWorks orientation panel,
  alloprof projection-box diagram, view-cube): interactive solid you
  can tilt manually, with 4 sub-screens showing all projections at
  once. Start with an engraved cube (different mark per face), then
  simple shapes, then complex isometric-style solids. "Like SolidWorks
  switching between projections, only the viewing part, no editing."
- /simulations/projections. NO 3D LIBRARY in this project (checked
  package.json - no three.js), so the 3D core is written from scratch:
  rotY/rotX transforms, prism() extrusion of a 2D profile into a
  closed solid, backface culling via transformed-normal z-sign,
  painter's-algorithm depth sort, per-view auto-fit. Deliberately kept
  dependency-free, consistent with the rest of the project.
- VERIFIED IN NODE BEFORE ANY RENDERING CODE (4 checks):
  1. Closure: every solid's edges each shared by exactly 2 faces
     (cube 12 edges, L-block 18, stair 24, cylinder 96) - an open
     solid would render with holes.
  2. Projected size: 2x2x2 cube measures exactly 2x2 in all six named
     views.
  3. Backface culling: exactly 1 face visible from each axis-aligned
     view, exactly 3 from isometric.
  4. CRITICAL - face identity: each named view proven to show the face
     it CLAIMS (TOP view's visible face has model normal (0,1,0), not
     (0,-1,0), etc). Getting this backwards would silently teach
     students projections inverted; asserted rather than assumed.
- 6 shapes, rising difficulty: Engraved Cube (6 different marks:
  circle/square/triangle/cross/hexagon/L - the L is deliberately
  asymmetric so its ORIENTATION is readable, not just its identity),
  Cylinder (circle vs rectangle - the classic case), Wedge, L-Block,
  T-Block (top and bottom views differ - proves one view is not
  enough), Stepped Block (staircase, matching the user's alloprof
  reference image).
- Engravings implemented as coplanar polygons offset outward by
  epsilon=0.012 so painter's sort naturally draws them in front of
  their host face. Each face has an explicit (origin, u, v, normal)
  frame so 2D marks map correctly onto all 6 orientations.
- Main view: drag to orbit (yaw/pitch, pitch clamped +-89deg to avoid
  gimbal flip). 7 snap buttons (Front/Top/Right/Bottom/Left/Back/
  Isometric) mirroring the SolidWorks orientation panel in the user's
  reference image. 4 locked sub-views (Front/Top/Right/Bottom) render
  through the SAME code path with fixed yaw/pitch - guarantees they
  can never drift out of sync with the main view's geometry.
- MISTAKE MADE AND CAUGHT: first INSERT used a topic_id typed from
  memory rather than looked up - hit the FK constraint. Looked up the
  real id (87127372-13c1-4275-ae86-1eea6bfc628a) and re-ran. Worth
  remembering: always query ids, never recall them.
- REMAINING Prep Physics sims: Unit Prefixes, Constant of
  Proportionality, Reading and Interpreting Graphs, Basic Trig for
  Physics, Order of Magnitude & Estimation.

## Unit Prefixes sim (2026-08-28, 4th of 8 Prep Physics sims)
- /simulations/unit-prefixes, topic_id 12a38624 (looked up, not
  recalled - see the projections entry's lesson).
- Vertical ladder tera->pico (11 rungs incl. deci and centi, since
  IGCSE leans on cm heavily and centi's 10^-2 breaks the
  three-at-a-time pattern that trips students up - called out
  explicitly in the Try This card). Click a rung: quantity
  re-expresses, and it reports how many places the decimal moved and
  the x10^n factor vs the PREVIOUS rung, so the movement is the
  lesson rather than just the endpoint. "common" badges mark the
  prefixes IGCSE actually uses.
- 6 quantities, each with a note on why that conversion matters in a
  real calculation (LED current mA->A for I=V/R, red light nm->m for
  v=f*lambda, ultrasound us->s for d=vt, etc).
- VERIFIED IN NODE BEFORE UI: (1) all 12 realistic conversions correct;
  (2) round-trip integrity across all 121 prefix pairs; (3) value
  invariance - every quantity reconstructs its exact original value
  from every prefix rung.
- DRILL: 10-item bank, 4 options each. Distractors are deliberately
  the REAL student mistakes (converted the wrong direction, off by
  10^3, forgot to convert entirely) rather than random numbers.
  Verified in node that every item yields exactly ONE correct option
  among 4 UNIQUE options - a distractor colliding with the correct
  answer would be a silent grading bug. Options shuffled with a
  seeded PRNG (deterministic per question index, so no hydration
  mismatch between server and client render).
- formatDecimal() written to avoid e-notation across the whole
  working range (the point of the lesson is watching the decimal
  point move, so 0.0000007 must render as digits, not 7e-7);
  spot-verified against 8 awkward values.
- REMAINING Prep Physics sims: Constant of Proportionality, Reading
  and Interpreting Graphs, Basic Trig for Physics, Order of Magnitude
  & Estimation.

## Constant of Proportionality sim (2026-08-28, 5th of 8 Prep Physics)
- /simulations/proportionality, topic_id 1f4e68db (looked up).
- User's spec: equation centre screen, draggable "key" per variable,
  other variables physically grow/shrink by size according to direct
  vs inverse proportionality. Implemented exactly that (font-size
  scales with value^0.38, clamped 17-66px, 500ms eased transition) and
  added a live graph showing the straight-line-through-origin vs
  falling-curve signature.
- CORE TEACHING POINT the sim is designed around: "F is proportional
  to m" is an INCOMPLETE sentence - proportional while WHAT is held
  constant? Solve for F, drag m -> direct. Solve for a, drag m ->
  inverse. Same equation, opposite answer. The "solve for" selector
  makes this switchable and the sim NAMES the relationship + lists
  which vars are held every time.
- GENERAL SOLVER, not scripted cases: each equation stored as a single
  product relation PROD(var^exp) = k. F=ma is {F:+1, m:-1, a:-1};
  rho=m/V is {rho:+1, m:-1, V:+1}. Response derived from exponents:
  newResponder = oldResponder * factor^(-e_driver/e_responder), and
  direct/inverse is simply the sign of that exponent. Adding a new
  equation only requires its exponent map.
- VERIFIED IN NODE BEFORE UI: 19 driver->responder pairs across 5
  equations, each checked THREE ways - (1) direct/inverse label
  matches hand-derived expectation, (2) the ORIGINAL equation still
  balances numerically after the change (F == m*a etc, re-derived
  independently per equation rather than trusting the generic
  invariant), (3) doubling the driver scales the responder by exactly
  2^k. All 19 passed.
- 5 equations: F=ma, V=IR, rho=m/V, P=E/t, p=rho*g*h (the 4-variable
  one exercises the "two vars held constant" case).
- REMAINING Prep Physics sims: Reading and Interpreting Graphs, Basic
  Trig for Physics, Order of Magnitude & Estimation.

### Proportionality sim: live equation rearrangement (2026-08-28, follow-up)
- User: picking "solve for X" should REARRANGE the displayed equation
  so X is alone on the left and the rest move right - not just relabel.
- rearrangedFor(vars, responder) added. Falls straight out of the SAME
  exponents that already drive the physics: for each other variable,
  relExponent(e_i, e_responder) > 0 -> numerator, < 0 -> denominator.
  No separate algebra engine needed (unlike the standalone
  EquationRearranger sim, which animates the step-by-step derivation;
  here only the end state matters).
- VERIFIED before wiring in: all 16 responder forms across the 5
  equations matched hand-written expected strings (F=m×a, m=F/a,
  a=F/m, rho=m/V, m=rho×V, V=m/rho, P=E/t, E=P×t, t=E/P, p=rho×g×h,
  rho=p/(g×h), etc), AND each rearranged form cross-checked numerically
  to reproduce the stored value of its responder.
- Rendered as a real fraction stack (numerator row / bar / denominator
  row) when a denominator exists, inline product otherwise. Every
  symbol keeps its value-proportional sizing and driver/responder
  colouring.
- Removed the now-dead static `layout` field from EquationDef and all
  5 equation definitions - the display is fully derived now.

### Proportionality sim: arrows + factor-allocation tab (2026-08-28)
- ARROWS: every symbol now carries an SVG arrow whose LENGTH scales with
  |ln(ratio)| (clamped 16-52px) and whose direction is up/down by whether
  the quantity rose or fell. Because the responder's value is already
  derived from the proportionality relation, its arrow automatically
  points the same way as the driver's for direct relationships and the
  opposite way for inverse ones - no special-casing needed, it falls out
  of the existing solver.
- NEW "Enter factors" TAB alongside the drag tab. Per non-responder
  variable: a number input + "x multiply" / "÷ divide" buttons.
  Allocations ACCUMULATE (they keep affecting the balance) until Reset,
  which returns every factor to 1 - exactly as the user specified.
- Factors are kept as a RAW FRACTION {num, den}, deliberately NOT
  collapsed to a decimal, so the history stays visible: the user's own
  worked example (double m, then divide a by 4, solving for F) displays
  F as 2 over 4, matching what they described. Badges render as a real
  stacked fraction beside each symbol.
- responderFactor() combines each driver's fraction by the relative
  exponent: direct -> num*num, den*den; inverse -> num and den swap.
- VERIFIED IN NODE BEFORE UI: (1) the user's exact worked example
  reproduces step by step (1/1 -> 2/1 -> 2/4, net 0.5); (2) numeric
  cross-check that base x factor equals the directly-computed m*a;
  (3) the inverse case (same equation, solving for a instead) gives
  1/2 as expected; (4) EXHAUSTIVE - 96 cases across all 5 equations x
  every responder x 6 random factor sets, confirming the original
  equation still balances after every allocation. All passed.
- NOTE FOR FUTURE ME: the user described the a-divided-by-4 step as
  being due to "inverse proportionality with a", but in F=ma solving
  for F, F and a are DIRECTLY proportional - dividing a by 4 divides F
  by 4, which is why the 4 lands in F's denominator. Their described
  OUTCOME was exactly right; only the label was loose. Implemented the
  physics correctly (the sim labels it "directly proportional") and
  flagged it gently in chat rather than silently coding the wrong
  relationship.

## Reading and Interpreting Graphs sim (2026-08-28, 6th of 8 Prep Physics)
- /simulations/graph-reading, topic_id 235adaf3 (looked up).
- Two draggable handles on an SVG graph; gradient triangle drawn
  between them (rise/run dashed legs + hypotenuse), area beneath
  shaded. Both computed exactly and both LABELLED WITH THEIR PHYSICAL
  MEANING for that specific graph - the core idea being that the same
  two operations mean different things on different axes.
- 4 scenarios: speed-time (gradient=acceleration, area=distance),
  distance-time (gradient=speed, area=NOTHING), force-extension
  (gradient=k, area=elastic PE, with a deliberate kink past the limit
  of proportionality), voltage-current (gradient=R, area=NOTHING).
- DELIBERATE TEACHING CHOICE: two scenarios have areaMeans=null and
  the sim explicitly says the area has no standard physical meaning,
  showing the number it *would* compute alongside the warning.
  Knowing when NOT to calculate an area is as valuable as knowing how,
  and students habitually compute areas because they can.
- spansCorner() detects when the gradient triangle crosses a
  breakpoint and warns that the reading is an AVERAGE gradient, not a
  value at a point - a real subtlety students lose marks on.
- areaBetween() splits at every breakpoint inside the interval before
  summing trapezia (naive endpoint-only trapezium would be WRONG
  across a kink). Verified in node: 19 hand-derived checks across all
  4 graphs, including the spans-two-kinks case.
- NOTE: one node check "failed" - my own inline expected-value
  expression was wrong (wrote 5+20*6+... instead of the correct
  trapezium 30+120+32=182); the hand-derived check on the next line
  confirmed the CODE was right. Second time this session a failing
  test turned out to be the test's fault, not the code's. Always
  re-derive before assuming the code is broken.
- REMAINING Prep Physics sims: Basic Trig for Physics, Order of
  Magnitude & Estimation.

## PAYMENT GATE: real solution shipped (2026-08-28)
- RESEARCH CONCLUSION (searched, not assumed): the international
  merchant-of-record route is CLOSED for a Turkey-based individual.
  Gumroad dropped PayPal payouts Oct 2024 and now pays via Stripe;
  Stripe does not operate in Turkey (open "Gumroad for Turkey" feature
  request confirms it's unsupported). PayPal banned in Turkey since
  2016. Wise unavailable. Lemon Squeezy/Payhip/Sellfy/Podia all ride
  the same Stripe Connect payout rail. So Gumroad/LemonSqueezy/Paddle
  are NOT viable without a foreign entity + foreign bank account.
- THE KEY REALISATION: Shopier's NATIVE STOREFRONT CHECKOUT ALREADY
  WORKS. The user completed a real 10 TL purchase of their own
  "ashphys kurs" product through it. Only api_pay4.php (own-website
  API) is blocked by the 509 error. So revenue is NOT actually
  blocked - only the automated integration is.
- SHIPPED, works today with zero payment API:
  * `subscription_plans` gained shopier_url_monthly / shopier_url_yearly.
  * New `access_grants` audit table (student, plan, months, reference,
    granted_by, timestamp) - every manual grant is logged.
  * `/pricing` (public): plan cards reading live from subscription_plans,
    "Subscribe monthly/yearly" buttons linking to the per-plan Shopier
    product URL, graceful "Checkout link coming soon" when the URL is
    null. Plus a 3-step "how subscribing works" explainer and a
    fallback contact line.
  * `/admin/access` + POST/PATCH /api/admin/access (+ /list): grant or
    extend by student EMAIL, pick plan + duration (1/3/6/12 months),
    optional payment reference. Extension uses
    GREATEST(end_date, now()) + months so renewing early ADDS to
    remaining time rather than discarding it. Revoke sets status
    expired + tier free.
  * Nav links added to Navbar (/pricing) and AdminNav (/admin/access).
- USER ACTION NEEDED to go live: create one Shopier product per plan
  (Plus monthly 99 TRY, Plus yearly 999, Pro monthly 179, Pro yearly
  1799), install Shopier's "Dijital Urun Teslimati" app so buyers get
  an instant receipt/instructions file, then paste each product URL
  into subscription_plans.shopier_url_monthly/_yearly.
- STILL OPEN (unchanged, not blocking revenue): the 509 own-website
  API error at Shopier's end, and PayTR's application. Both would only
  AUTOMATE what now works manually.

### CORRECTION + bank transfer rail (2026-09-08)
- CORRECTION TO THE ENTRY ABOVE: the claim that "Shopier's native
  storefront works, revenue is not blocked" was WRONG and must not be
  trusted. A completed checkout is only half the loop - the 10 TL from
  the 27/07 test purchase NEVER reached the user's IBAN, six weeks and
  ~6 Wednesday payout cycles later. Order #307538405 is confirmed
  KAPALI (closed), so the "you must close the order to trigger payout"
  theory (from Shopier's own help docs) was also wrong.
- FOUR SYMPTOMS NOW POINT ONE WAY: 509 on api_pay4.php, OSB test never
  emits an outbound request at all (proven via Vercel logs - zero
  inbound POSTs ever), dashboard showing raw `null adet`, and a closed
  order not paying out for 6 weeks. Read together: the account appears
  not to be fully provisioned as a MERCHANT - buyer-side checkout
  accepts cards, seller-side (payouts, API, notifications) does not
  work. Advised user to check Tahsilatlar > Tahsilat Detayodetails for
  whether the balance even exists, and whether an IBAN is registered
  and verified at all, but also advised to STOP treating Shopier as
  the plan.
- LESSON FOR FUTURE ME: I twice declared a stage "working" from a
  green light at one point in a pipeline (OSB test 200 response; the
  completed checkout) without testing the END of the pipeline. The
  user caught both. Verify the terminal outcome (money in the bank,
  request actually received), not an intermediate success signal.
- SHIPPED: bank transfer rail, the only path needing nobody's approval.
  * `site_settings` key/value table (bank_transfer_enabled,
    bank_account_name, bank_iban, bank_name, bank_note).
  * lib/settings: getBankSettings() + paymentReference(userId) =
    'ASH-' + first 6 hex of the uuid, uppercased. Stable per user
    (derived, never stored), 16.7M keyspace - verified stable and
    collision-free across sample ids.
  * /admin/settings + POST /api/admin/settings (allowlisted keys
    only): toggle, account holder, bank, IBAN, optional note. Warns
    if the IBAN isn't TR + 26 chars.
  * /pricing renders a bank-transfer card when enabled, showing the
    account details and the LOGGED-IN STUDENT'S OWN reference code
    prominently (prompts signup first if logged out, since the code
    is what makes matching possible).
  * Flow: student transfers with reference -> teacher matches it in
    their bank -> grants access at /admin/access with the reference
    recorded in access_grants.
- USER ACTION: fill in IBAN + account name at /admin/settings and flip
  the toggle on. That makes the site able to take money today.

### Receipt upload + approval flow (2026-09-08)
- Closes the manual payment loop: student pays anywhere (bank transfer,
  Shopier, cash), uploads proof, teacher approves, access granted.
- PRIVACY DECISION: the `receipts` bucket is PRIVATE (public=false),
  unlike booklets/past-papers. Receipts carry names, bank details and
  amounts - a guessable public URL would leak one student's banking
  info to anyone. Admin views go through SHORT-LIVED SIGNED URLs
  (lib/storage/signed.ts, 600s default) generated server-side with the
  service key. Accepts jpg/png/webp/pdf, 10MB cap.
- `payment_requests` table: student_id, plan_id, months, amount_claimed,
  reference, student_note, receipt_path, status
  (pending/approved/rejected), admin_note, reviewed_by, reviewed_at.
- STUDENT SIDE `/subscribe/verify` (auth-gated, redirects to login with
  ?next=): shows their own payment reference again, pick plan +
  duration + optional amount/note, attach receipt, submit. Plus a
  history list of their own submissions with status badges and any
  admin note. GUARD: only ONE pending request at a time (409
  otherwise) so the queue can't be spammed.
- ADMIN SIDE `/admin/payment-requests`: pending-first queue, each card
  showing who/when/claimed amount/their stated plan, their note, a
  "View receipt" signed link, and - importantly - EDITABLE plan +
  months before approving, since what a student selects may not match
  what they actually paid. Approve grants the subscription AND writes
  an access_grants audit row AND marks the request approved in one
  handler, so those three can never drift apart. Reject requires (or
  at least prompts for) a reason.
- Approve reuses the same GREATEST(end_date, now()) + months extension
  logic as /admin/access, so early renewal still adds time.
- /pricing now links to /subscribe/verify from both step 3 of the
  explainer and a green CTA inside the bank-transfer card.
- Nav: "Payment Receipts" added to AdminNav above Subscriber Access.

## Engineering courses + USD pricing + bigger logo (2026-09-08)
- LOGO: Navbar Image 140x100 -> 190x136 (same aspect ratio), added
  priority since it's above the fold.
- USD PRICING: `usd_rate` in site_settings (default 47.18, the rate the
  user quoted), admin-editable at /admin/settings. Deliberately NOT a
  live exchange feed - a stale-but-labelled number beats a page that
  breaks when a rate API is down, and every figure is shown as
  "approx." anyway. tryToUsd() formats sensibly across the range
  (2 dp under $10, 1 dp under $100, 0 dp above). Shown under both
  monthly and yearly plan prices and on course cards/detail pages.
- ENGINEERING COURSES - a second, separate product line from the
  physics subscription:
  * `courses` (title, slug, category, summary, description, level,
    price_try, status draft/published, order)
  * `course_modules` (title, description, video_url, resource_url,
    duration_minutes, is_free_preview, order)
  * `course_enrollments` (student+course unique, granted_by,
    expires_at NULL = lifetime)
  * payment_requests gained a nullable course_id; months made nullable.
  * PUBLIC /courses catalogue grouped by category with price in TRY +
    approx USD and lesson count; /courses/[slug] detail with full
    description, purchase panel (bank details + the student's own
    reference), and a module list where locked lessons show a padlock
    while is_free_preview lessons stay open - so a course can sell
    itself with a sample.
  * ADMIN /admin/courses: create/edit courses, publish/unpublish, and
    manage lessons inline per course (add/edit/delete, mark free
    preview). Slug auto-derived from title with a duplicate check.
  * RECEIPT FLOW EXTENDED: /subscribe/verify now has a
    subscription-vs-course switch (auto-selected via ?course=slug from
    the course page). Admin approval branches: a course request
    creates a course_enrollment with LIFETIME access and does NOT
    touch the student's physics subscription - the two products stay
    independent. Admin queue shows course requests distinctly and
    hides the plan/months editors for them, since they don't apply.
- Nav: "Courses" added to the public Navbar, "Engineering Courses" to
  AdminNav.

### Navbar logo fixed (2026-09-08)
- User: remove the decorative lines flanking the logo, and enlarge it -
  "it is not visible".
- ROOT CAUSE FOUND: /assets/logo.png is intrinsically 730x185 (a wide
  ~4:1 banner), but the Navbar declared width={140} height={100}
  (1.4:1). Completely wrong aspect ratio, which is why it rendered
  small and squashed. My own first fix this session (190x136) repeated
  the same mistake, and a second attempt (h-16 w-auto on a wrong
  declared ratio) would have made it NARROWER than before - caught by
  actually reading the PNG header for the real dimensions instead of
  trusting the existing numbers.
- FIXED: declared size now matches reality (730x185), rendered via
  className w-[210px] sm:w-[270px] h-auto -> ~53px tall on mobile,
  ~68px on desktop, correct proportions, meaningfully larger than the
  original 140px width.
- Removed the two flanking decorative bars (the black rule + end-cap
  divs on either side) entirely, per request.
- logo.png is referenced ONLY in Navbar.tsx - checked, no other file
  repeats the bad aspect ratio.

### Navbar decluttered (2026-09-08)
- Problem: 9 top-level links (Home, Curriculum, About Us, Resources,
  Past Papers, Booklets, Courses, Pricing, Contact) + search + auth
  buttons. "About Us" and "Past Papers" were wrapping onto two lines.
- New components/NavDropdown.tsx - reusable grouped menu (click-outside
  AND Escape to close, aria-expanded, optional hint line per item).
  Mirrors the existing CurriculumDropdown pattern rather than
  introducing a different one.
- Restructured to 5 visible items: Curriculum (existing dropdown),
  Study Materials (Past Papers / Booklets / Resources), Courses,
  Pricing (kept blue + always visible from md up, since it's the
  revenue path), More (Home / About Us / Contact).
- whitespace-nowrap added so labels can never wrap again.
- ALSO FIXED A PRE-EXISTING GAP: below lg, every nav link was hidden
  with no menu at all, so phone users could not reach Courses,
  Past Papers, Booklets etc. Added a "Menu" dropdown visible only
  below lg containing all 8 links. Not a regression from this change -
  it was already broken - but worth closing while in the file.
- Verified every href in both menus resolves to a real page
  (curriculum, courses, pricing, past-papers, booklets, resources,
  about, contact all exist).

### Past papers: card layout + score tracking + 2018-2025 grid (2026-09-15)
- User asked me to scrape Save My Exams and rehost all papers from 2018.
  DECLINED the scraping/rehosting (consistent with the earlier
  position): that is Cambridge's copyrighted content, compiled and
  served at a competitor's expense, being republished on a site the
  user charges for. Built everything else.
- WHAT I DID BUILD:
  * past_papers gained tier, max_marks, paper_name. Dropped the
    year>=2020 CHECK (it blocked 2018) and replaced with 2000-2100.
  * SEEDED THE FULL METADATA GRID - 336 rows, 2018-2025, 24 sessions.
    Labels only (year/session/paper/variant/marks/tier), which are not
    copyrightable. Correct Cambridge 0625 structure: P1 MCQ Core 40,
    P2 MCQ Extended 40, P3 Theory Core 80, P4 Theory Extended 80,
    P5 Practical 40, P6 Alt-to-Practical 40. Feb/Mar = variant 2 only;
    May/Jun and Oct/Nov = variants 1-3.
  * new `paper_scores` table (student+paper unique) + POST
    /api/paper-scores. Validates against the paper's max_marks and
    DELETEs the row on an empty value rather than storing nulls.
  * components/PastPaperCard.tsx - matches the user's reference
    screenshot: title, session, tier chip + syllabus code (0625/NN),
    dashed "Your score — / max" box that saves on blur and turns teal
    when filled, then Question Paper / Mark Scheme / Video Solution
    buttons. Missing files render as GREYED NON-LINKS, never broken
    links; missing video shows "Video Solution — coming soon".
  * /past-papers rebuilt as a 3-col card grid grouped by session,
    with paper and year filter pills. Prompts sign-in for score saving.
  * Admin manager: added a token-based filter box (e.g. "2023 paper 4")
    and an 80-row display cap, since 336 rows was unusable.
- CONTAINER RESET AGAIN mid-session (second time) - re-cloned from
  GitHub at ab39a1c, no work lost. DB changes were unaffected since
  they are server-side.

### Bulk past-paper uploader (2026-09-15)
- User will source the PDFs themselves and asked me to file them into
  the right slots. Agreed - that is exactly the split already stated
  (they supply files, I build infrastructure). Their copyright risk
  decision is unchanged and remains theirs.
- ~670 files makes one-at-a-time impractical, so built a BULK
  UPLOADER instead of doing it by hand.
- lib/papers/filename.ts - parseCambridgeName(). Cambridge naming is
  strict: 0625_s23_qp_42.pdf = syllabus 0625, May/Jun 2023, question
  paper, Paper 4 Variant 2. s=May/Jun, w=Oct/Nov, m=Feb/Mar;
  qp/ms. Verified against 10 cases (all session letters, both types,
  uppercase, plus 4 malformed inputs that must return null).
- POST /api/admin/past-papers/bulk: for each file, parse name -> look
  up the matching past_papers row -> upload to the past-papers bucket
  -> set question_paper_url or mark_scheme_url. NEVER GUESSES: an
  unparseable name, non-PDF, oversized file, or missing slot is
  skipped and REPORTED, because a mis-filed paper is worse than an
  unfiled one.
- components/admin/BulkPaperUpload.tsx: multi-select, uploads in
  batches of 20 with a progress bar (one request with 670 files would
  time out), then a green "filed" summary and an amber "skipped" list
  with the reason for each.
- BUILD CAUGHT A REAL BUG tsc MISSED: Next.js route files may only
  export HTTP handlers, and I had exported parseCambridgeName from the
  route. tsc --noEmit passed; `npm run build` failed with "not a valid
  Route export field". Fixed by moving the parser to lib/. Reminder
  that the full build is the real gate, not just typecheck.

## Equation Rearranger: Advanced tab, powers and square roots (2026-09-16)
- User wanted harder equations in the rearranger: gravity, Coulomb's law,
  capacitance, and generally "equations that have a square root in it or
  a power." The existing engine (components/simulations/
  EquationRearrangerSimulator.tsx) only ever modeled plain products of
  bare symbols — no exponent, no root — so this needed a real engine
  extension, not just new equation entries.
- ENGINE REDESIGN: `Factor` is now a union of `var` (symbol + integer
  exponent, e.g. r²), `const` (a NAMED, non-clickable physical constant
  or literal number — G, k, ε₀, c, π, ½ — carrying its own fixed numeric
  value so it never needs a "sample" entry), and `power` (an atomic
  wrapper around a nested `Side` raised to an exponent — √(...) is just
  exponent 0.5). `isolateSteps` is now an iterative loop (lift →
  additive → multiplicative → denominator-clear → power/root), repeating
  the whole cycle whenever peeling a radical exposes more structure to
  isolate — required for T = 2π√(L/g): ÷2π first, THEN square both sides
  to expose L/g, THEN g still needs lifting out of that denominator.
  Isolating a squared variable (v² = 2gh solving for v) ends with a
  genuine "take the square root of both sides" move; isolating something
  trapped inside an existing root starts with "square both sides" — both
  reuse the same inject → strike → fade → settle animation as the
  original three move types, by wrapping whatever is CURRENTLY on each
  side in the same power and letting only the home side's wrapper cancel.
- BUG CAUGHT DURING DESIGN (before any TS was written): an earlier
  version mutated a single `side.power` flag in place when squaring/
  rooting. That broke the moment something else was added to that side
  in a LATER move (the T = 2π√(L/g) case) — a subsequently-lifted factor
  ended up incorrectly trapped INSIDE the earlier power wrapper (g got
  squared along with T instead of sitting outside it). Fixed by making
  "raised to a power" its own atomic Factor (wrapping a full cloned Side)
  instead of a mutable side-level flag, so later moves append siblings
  next to the wrapper rather than merging into it.
- VERIFIED IN NODE BEFORE ANY UI CODE: every equation × every
  non-constant variable × 3 random positive-value trials (195 isolations
  total) — rearranged formula checked against the original equation to a
  relative error under 1e-9, AND every intermediate step along the
  derivation independently re-checked to still balance under the same
  sample values (not just the final answer). 0 failures.
- 14 new equations under a new "Advanced" tab (Basic keeps the original
  6): gravitation F=GMm/r², gravitational field strength g=GM/r²,
  Coulomb's Law F=kq₁q₂/r², kinetic energy Eₖ=½mv², capacitor energy
  E=½CV², E=mc², pendulum period T=2π√(L/g), free-fall speed v=√(2gh),
  capacitance C=Q/V, parallel-plate capacitance C=ε₀A/d, P=I²R, P=V²/R,
  the transformer equation V₁/V₂=N₁/N₂, and Boyle's Law p₁V₁=p₂V₂.
  Subscripted symbols (q₁, q₂, V₁, N₂, p₁, ...) are literal Unicode
  subscript characters, typed directly — never \u escapes, per the
  standing gotcha below. Each equation tagged "IGCSE" or "Beyond IGCSE"
  (gravitation, field strength, Coulomb, capacitance, and ½CV² marked
  Beyond IGCSE per the user's explicit list; everything else IGCSE).
  Physical constants (G, k, ε₀, c, π, ½) render in brass, are never
  clickable, and travel with the algebra like any other factor.
- Token rendering is now recursive: a `power`-type factor lays out its
  own inner numerator/denominator row set, wrapped in √( / ) or ( / )ⁿ
  bracket tokens, so every symbol inside a radical (even nested two
  levels deep, as in the pendulum equation) stays individually clickable
  — clicking L or g directly inside T = 2π√(L/g) on the very first
  screen is what kicks off its derivation.
- Seeded 12 practice questions for the Rearranging Equations topic
  (topic_id 6cb3f4b2, chapter_id 683a1a72 — Prep Physics, previously had
  zero questions): 4 basic "make X the subject" (difficulty 1, all
  multiple_choice, distractors are the real mistakes — inverted
  fraction, wrong operation, forgot the reciprocal), 4 powers/roots
  (difficulty 2, mix of symbolic multiple_choice and numeric
  rearrange-then-calculate on P=I²R and v=√(2gh)), 4 Beyond-IGCSE
  (difficulty 3, Coulomb's Law and ½CV², both directions). Multiple-
  choice options live in `problem_options` (discovered by inspecting an
  existing momentum question — separate table, not embedded in
  question_text); numeric answers are graded with a 2% relative
  tolerance per the existing submit route, so sample numbers were chosen
  to resolve to clean values (10, 0.5, 3, 10) rather than long decimals.
  Verified after insert: all 8 multiple_choice rows have exactly 4
  options with exactly 1 marked correct; problem_number/order run 1-12
  (topic had no prior rows).
- `npm run build` (the real gate, not just tsc) passed clean; scanned
  the changed file for `\u` escapes per the standing gotcha — none.

## Equation Rearranger: crash fix + sign bug + manual Back/Next stepping (2026-09-16)
- USER-REPORTED BUG: Advanced tab froze on "Isolating r…" for F=GMm/r²
  solving for r (same for g=GM/r² and F=kq₁q₂/r² solving for q₂) — never
  progressed past the caption.
- ROOT CAUSE: `isolateSteps()` set `move.symbol` to the DISPLAY label
  (`factorLabel`, e.g. "r²"), but `buildIntermediate()` re-found the moved
  factor with `factorTag(f) === move.symbol` — `factorTag` returns the
  BARE symbol ("r"). "r" never equals "r²", `findIndex` returned -1,
  `cloneFactor(undefined)` threw inside the animation's setTimeout chain,
  which silently died with no visible error. Same class of bug existed in
  the 'multiply' branch (lift moves route through it too) and, latently,
  in additive — all three re-found "what moved" by comparing strings
  instead of holding onto the actual thing that moved.
- FIX (not a string-compare patch): `Move` now carries the real
  structural pointer captured at the moment `isolateSteps` made each
  move — `movedFactor` (+`movedDenomIndex` where the position isn't
  provably always 0) for lift/multiplicative, `movedGroup`
  (+`movedGroupIndex`) for additive. `buildIntermediate` reads these
  directly; no more re-finding by any string.
- CLOSING THE VERIFICATION GAP THAT LET IT SHIP: the previous session's
  195-check Node script only exercised the pure algebra
  (isolateSteps + evalSide) — it never called `buildIntermediate` or
  `layoutEquation`, so it couldn't have caught a bug that only throws
  inside the *rendering* pipeline. New script extracts the algebra
  engine's actual source lines (not a hand-transcribed copy — a literal
  `sed` slice of the real file, run via `node --experimental-strip-types`)
  and, for every equation × every clickable variable × both starting
  orientations (equation as given, and mirrored) × every chained
  ordered pair of variables (solve X, then from that result solve Y —
  chaining is exactly how a user would actually hit this), runs every
  move through `buildIntermediate` + `layoutEquation`, asserts no throw,
  asserts every cancelKey resolves to a real token in the mid-layout,
  and checks the final/chained answer against the original equation
  (relative error < 1e-9). 3090 checks, 0 failures after the fix.
- THAT SAME THOROUGH PASS CAUGHT A SECOND, INDEPENDENT REAL BUG before
  it ever shipped: chaining v=u+at (solve u, then a) left the isolated
  side as "−a", not "a" — an additive move had flipped that term's sign
  earlier in the chain, and the "isolated" check only looked at whether
  the home side was down to one factor, never at that group's sign.
  Fixed with a new `negate` move ("×(−1) both sides") appended whenever
  the final single-term home group's sign is −1 — checked generically
  after the root-move logic, not special-cased to vuat. A THIRD bug
  surfaced by the same pass: `keysForFactorAt`-class mismatch — a
  power-wrapped factor (e.g. the surviving "(T/2π)²" from an earlier
  square-both-sides move, later needing to be cleared like any other
  multiplicative factor in a chained solve) renders as an `-open`/
  `-close` bracket PAIR, never as a single bare token, so the same
  bare-varKey cancelKey computation that broke on "r²" also broke on
  it. New `keysForFactorAt()` helper returns the right key shape
  (one key for var/const, the open+close pair for power factors) and
  is now used everywhere a cancelKey gets built.
- MANUAL STEPPING (separate request, same session): replaced the
  auto-playing setTimeout chain (inject → strike → fade → settle → next
  move, 4+ timers deep) with fully precomputed step snapshots. Clicking
  a variable now calls `isolateSteps` once, builds a flat
  `StepSnapshot[]` via `buildSteps()` (3 steps per move — operate/
  cancel/settle — plus one flip step if the answer needs mirroring to
  the left), and does nothing else automatically; the caption reads
  "Solve for r — 3 steps. Press Next." Back/Next just move an index
  into that array — no timers, no replay on Back (an effect only plays
  the token fade-in on a FORWARD arrival at an 'inject' step, tracked
  via a direction ref, so Back is instant). Next is disabled during that
  brief fade-in window and at the last step; Back is disabled at the
  start. ← / → keys mirror the buttons. A small step-list chip row
  ("1. × r²  2. ÷ F  3. √ both sides") shows the whole plan with the
  current step highlighted. The "Verify with numbers" panel and
  variable-clicking-to-chain are now gated on `isDone` (stepIndex at
  the last step) instead of the old `phase==='done'`. Injected-token
  diffing (which keys are "new" this step, for the fade-in) is computed
  ONCE per step inside `buildSteps` at solve-time, not per-render.
- Manually traced (Node, real `buildSteps`/`layoutEquation` code, since
  this sandbox's egress policy blocks browser access to the live site —
  same limitation as the previous session): F=GMm/r²→r (9 steps),
  F=kq₁q₂/r²→q₂ (10 steps, ends with a flip), T=2π√(L/g)→g (12 steps:
  ÷2π, square both sides, ×g, ÷(T/2π)² — the multi-move chain-through-
  a-radical case), KE=½mv²→v (10 steps, flip). All four stepped fully
  forward and back with no errors, every cancelKey resolved, and the
  numeric answer matched the original equation to relative error ~0 in
  every case.
- `npx tsc --noEmit` and `npm run build` both clean; scanned the changed
  file for `\u` escapes — none.

## Vector Addition Sandbox — 9th Prep Physics topic (2026-09-16)
- New topic "Vectors: Addition & Resolution" (id `11e7164b-e47d-4b4d-
  8bad-1002c892ba20`), chapter 0 Prep Physics, order 9 (after Order of
  Magnitude & Estimation). Shows on `/curriculum` immediately, same as
  the other 7 still-unbuilt Prep Physics topics do — the page never
  required a simulation to exist first.
- `/simulations/vector-addition` — inspired by PhET Vector Addition and
  oPhysics's vector tool (studied the IDEAS, wrote entirely original
  code/art/layout in the existing AshPhys lab-notebook palette, no
  Three.js, vanilla SVG + pointer events like every other drag-based sim
  here). `lib/vectors.ts` is the ONE pure-math module every mode shares
  (add/subtract/scaleVec/negate/sum/magnitude/angleDeg/toPolar/
  fromPolar/cumulativeChain/angleDiff) — verified by importing the REAL
  file directly into a Node script (`node --experimental-strip-types`,
  not a hand-transcribed copy) before any UI existed: 30,011 checks —
  polar↔cartesian round-trips both directions, tip-to-tail endpoint ==
  component sum, parallelogram diagonal, commutativity, a−b == a+(−b),
  scaling distributes over addition, all four quadrants, and every
  axis-aligned/cardinal case. 0 failures.
- SIX MODES, one tab bar:
  1. **1D** — arrows dragged along a number line (displacement/force/
     velocity context switch relabels the same maths); shows each
     vector individually from zero AND tip-to-tail into a signed
     resultant, so opposite-direction cancellation is visible directly.
  2. **2D Sandbox** (the core) — up to 6 vectors, drag tail to
     translate, drag tip to change; every vector independently editable
     as |v|/θ or vx/vy (kept in sync both ways); toggles for sum, angle
     arcs, on-canvas values, grid, snap-to-integer, and three component
     display styles (none / dashed right-triangle on each vector /
     projected onto the axes). Dragging a tail off the canvas edge
     deletes that vector.
  3. **Methods** — Tip-to-tail / Parallelogram / Components, ALL
     manually stepped (Back/Next + "Step X of Y" + ←/→, no auto-play
     anywhere, same pattern the Equation Rearranger uses) rather than
     timer-driven. A reverse-order toggle on tip-to-tail visibly proves
     a+b and b+a land on the same R via different intermediate paths.
     Components' final step writes out Pythagoras and tan⁻¹ with the
     actual numbers, not just symbols.
  4. **Equations** — c = s₁·a + s₂·b with live sliders (−3 to 3, step
     0.5, negative reverses); a separate manually-stepped 3-step panel
     shows a−b built explicitly as a+(−b), b visibly flipping before
     the tip-to-tail add.
  5. **Scale Drawing** — the actual IGCSE exam skill: two given vectors
     drawn tip-to-tail to a stated scale (e.g. 1 cm : 2 N), a
     draggable+rotatable virtual ruler and protractor (drag body to
     move, small ring handle to rotate), typed magnitude+angle answer
     checked against the true resultant (computed via the same lib, not
     hardcoded) at ±2% length / ±2°, revealing the calculated answer
     after checking either way.
  6. **Challenges** — four random-generated families (plain resultant,
     find-the-missing-vector, equilibrium/equilibrant, and real
     contexts: river crossing, crosswind, two tugboats), a streak/best
     counter, and a full worked solution shown after every check
     (right or wrong).
- SCOPE DECISIONS made explicitly, not silently:
  - "Drag new vectors out of a toolbox" became "+ Add vector" buttons
    (up to 6) that place a new vector ready to drag into position —
    genuine drag-and-drop from a palette is real friction on touch and
    adds nothing the click-then-drag flow doesn't already teach.
  - Scale Drawing's tip-to-tail CONSTRUCTION of the two given vectors is
    drawn for the student (correctly, to scale) rather than requiring
    freehand drawing — grading hand-drawn line accuracy fairly is a
    much harder, separate UX problem from the one actually specified
    (measure with virtual tools, check the typed numeric answer with
    tolerance). The ruler/protractor are for the student's own visual
    reading, not auto-measuring devices — the app never reads the tools
    itself, only the typed answer, which is the honest way to grade a
    measurement exercise.
  - Scale Drawing's canvas uses a FIXED pixel size (not the responsive
    viewBox-scaling every other mode uses) specifically so 1 cm stays
    exactly 37.8px (the standard 96dpi/100%-zoom web convention) and
    the ruler's tick spacing is real — a scaled viewBox would silently
    break that. Documented as an honest technical ceiling: a
    browser-responsive canvas can never GUARANTEE physical-world
    accuracy the way print can, at any zoom level or device pixel
    ratio, same category of limitation as the quiz-lockdown ceiling
    noted elsewhere in this file.
- DATABASE: `simulations` row (`sim_type='graph_builder'`, matching
  every other Prep Physics sim — no closer enum value exists, same
  workaround already used for gas-laws/equation-rearranger),
  `difficulty_level=2`, `order=9`. 12 practice questions seeded for the
  new topic (previously had zero): scalar-vs-vector classification x2
  (multiple_choice), opposite 1D forces, two perpendicular-force
  resultant magnitude/direction pairs (one 3-4-5, one 5-12-13, so the
  answers check exactly), scale-drawing interpretation, equilibrium
  magnitude, a velocity-change subtraction, a distance-vs-displacement
  conceptual multiple_choice, and a boat/river crossing — spanning
  difficulty 1-3. Verified post-insert: all 3 multiple_choice rows have
  exactly 4 options with exactly 1 correct; all 9 numeric answers are
  clean values (3, 5, 53.1, 20, 10, 5, 5, 13, 67.4) so the existing 2%
  numeric tolerance never creates a false negative.
- `npx tsc --noEmit` and `npm run build` both clean; scanned every new/
  changed file for `\u` escapes — none. Manual click-through on desktop
  and a mobile viewport blocked by this sandbox's egress policy (same
  standing limitation noted in the Equation Rearranger entries above) —
  typecheck, full build, and the Node-verified math are the available
  substitute; worth a real click-through from a session with browser
  access, particularly the ruler/protractor drag-and-rotate on touch.

### Fixed: "Network error during upload" on past-paper/booklet uploads

- ROOT CAUSE: all three admin upload flows (bulk past-papers, single
  past-paper, booklets) sent the raw file body straight through our own
  Vercel serverless function (`req.formData()` in the route handler).
  Vercel's Node.js serverless functions hard-cap the request body at
  ~4.5MB, platform-wide — not something `next.config.js`'s
  `experimental.serverActions.bodySizeLimit` touches, since that setting
  only governs Server Actions, not Route Handlers. Any real scanned exam
  PDF (or several batched together in one bulk POST) routinely exceeded
  that, Vercel returned a non-JSON 413, and the client's `await
  res.json()` threw — caught by a blanket `catch { setError('Network
  error during upload') }`, which is exactly the message the user hit
  ("Choose PDFs" → 6 files ready → "Upload and file them" → "Network
  error during upload").
- FIX: switched all three flows to a signed-upload-URL architecture, so
  file bytes never pass through our function at all — only small JSON
  does:
  - `lib/storage/signedUpload.ts` (new, server-only) — mints a
    short-lived Supabase Storage signed UPLOAD url via
    `POST /storage/v1/object/upload/sign/{bucket}/{path}` using the
    service-role key (never leaves the server). Mirrors the existing,
    already-proven signed READ-url helper in `lib/storage/signed.ts`
    (same REST contract, write side).
  - `lib/storage/directUpload.ts` (new, client-safe) — browser PUTs the
    File directly to that signed URL. Hardcodes Supabase's public
    "publishable" key (not a secret — same as any anon key shipped in
    client code; carries no bucket permissions on its own, the embedded
    signed token is what authorizes the specific write). Done this way
    because no Vercel env-var write tool is available in this session.
  - `app/api/admin/past-papers/bulk/route.ts` — rewritten to a two-phase
    JSON protocol: `action:"prepare"` (metadata only — filename, size,
    type — returns a matched slot + signed URL per file, or a skip
    reason), then `action:"confirm"` (writes the resulting public URLs
    onto `past_papers` rows after the browser has PUT the bytes
    directly to storage).
  - `app/api/admin/past-papers/upload/route.ts` and
    `app/api/admin/booklets/upload/route.ts` — same pattern for the
    single-file flows: JSON `{path}` in, `{signedUrl, publicUrl}` out.
  - `components/admin/BulkPaperUpload.tsx`,
    `components/admin/PastPaperManager.tsx`,
    `components/admin/BookletManager.tsx` — all three updated to the
    matching client flow (prepare/confirm JSON round trips + direct PUT
    to storage). `BookletManager` now reads the uploaded file's size
    from the local `File` object (`file.size`) instead of a
    server-echoed value, since the server no longer receives the bytes
    to measure.
  - Bulk flow additionally batches at 20 files per server round trip
    with 4 concurrent uploads within each batch, so a large batch
    doesn't open dozens of simultaneous storage PUTs or one huge
    `prepare` payload.
- VERIFICATION CEILING, disclosed rather than hidden: `npx tsc --noEmit`
  and `npm run build` are both clean, and the signed-upload REST
  contract mirrors the already-working signed READ-url pattern
  elsewhere in this codebase — but the exact Supabase Storage
  signed-upload contract could NOT be exercised end-to-end from this
  sandbox, because outbound network access to `*.supabase.co` is
  blocked by the environment's egress proxy (same standing restriction
  that blocks browser access to the live site from here). Recommend
  trying a single file first before running a full batch.

### Added: second past-paper syllabus (0972, Cambridge IGCSE (9-1) Physics)

- WHY: after the upload fix above, the user's first real bulk-upload
  attempt correctly surfaced a genuine second bug rather than the
  original one — 6 files named `0972_w23_qp_*.pdf` were all skipped
  with "no Oct/Nov 2023 P*V1 slot exists". `0972` is Cambridge's
  parallel "IGCSE (9-1) Physics" syllabus (same six-paper structure as
  0625, different code, different grading scale, sold and examined as
  a separate qualification) — the `past_papers` table only had 0625
  rows (336, seeded earlier this project), so every 0972 filename
  correctly found no matching slot rather than being mis-filed. Asked
  the user directly rather than guessing at intent; they confirmed
  they want 0972 supported as a genuine second syllabus alongside
  0625, not a one-off correction.
- FIX, three parts:
  1. `app/api/admin/past-papers/bulk/route.ts` — `prepareOne` now
     UPSERTs the `past_papers` row (`INSERT ... ON CONFLICT (syllabus_
     code, year, session, paper_number, variant) DO UPDATE SET
     updated_at = now() RETURNING id`) instead of requiring the row to
     already exist. This auto-creates a slot for ANY syllabus code
     found in an uploaded filename, the moment a matching file is
     first uploaded — deliberately not pre-seeding 336 more rows for
     0972 the way 0625 was seeded, since Cambridge's exact 0972 exam
     calendar (which years/sessions actually ran) isn't something to
     guess at from this sandbox, and an upsert-on-sight generalizes to
     any future syllabus too. A `PAPER_META` map (name/tier/max_marks
     per paper 1-6) is shared across syllabuses since the six-paper
     structure, tiers and mark totals are the same for 0625 and 0972 —
     verified this specific INSERT/ON CONFLICT statement directly
     against the real `past_papers` unique constraint via Supabase
     (confirmed `UNIQUE (syllabus_code, year, session, paper_number,
     variant)` matches exactly) inside a rolled-back transaction before
     shipping.
  2. `app/api/admin/past-papers/route.ts` + `components/admin/
     PastPaperManager.tsx` — the single-entry admin form gains a
     Syllabus dropdown (0625 / 0972); the API now accepts and validates
     `syllabus_code` instead of silently defaulting every manual entry
     to 0625. The manual-upload storage path also gained a syllabus
     segment (`{syllabus}/{year}-{session}/...`) to avoid colliding
     with a same-numbered 0625 paper's file. The admin entries list
     shows each row's syllabus code and it's now part of the filter
     text.
  3. `app/past-papers/page.tsx` — the public page no longer hardcodes
     "0625" in its heading/copy. It derives the set of syllabuses
     actually present in the DB, defaults to 0625, and (only once a
     second syllabus has real rows) shows a tab row to switch between
     them — papers from different syllabuses are never mixed under the
     same "Paper 4 2023" heading, since they're different exams.
     Switching syllabus resets the paper/year filters. The "download
     from Cambridge's own portal" deep link is kept 0625-only (its
     exact 0972 URL slug couldn't be verified — outbound access to
     cambridgeinternational.org is blocked from this sandbox); 0972
     gets a plain, non-hyperlinked pointer to Cambridge/the school
     instead of a guessed link.
- `npx tsc --noEmit` and `npm run build` both clean; scanned all
  changed files for `\u` escapes — none. The 0972 tab won't appear on
  the live site until the user's next bulk-upload attempt actually
  creates a 0972 row (none exist yet as of this fix) — that upload
  itself is the remaining real-world test, since Storage's exact
  signed-upload contract still can't be exercised from this sandbox
  (see the upload-fix entry above).

### Added: session/device-limit auth system + JWT_SECRET hardening

Requested as a 6-part spec: security fixes first, then a real session
table, device identity, login enforcement, request-time validation, a
student-facing devices page, and admin visibility. All shipped.

- SECURITY FIXES (`lib/auth/jwt.ts`):
  - Removed the `'default-secret-key-change-in-production'` fallback.
    The module now throws at import time if `JWT_SECRET` is missing or
    under 32 characters — no signing or verifying with an insecure
    default. Verified directly (unset, then set to 8 chars) that the
    module import rejects both cases with a clear message, and that a
    32+ char secret works normally.
  - `JWT_SECRET` in Vercel Production: **could not be confirmed from
    this session** — the Vercel MCP toolset available here has no
    env-var read tool (same standing gap noted for the past-paper
    upload fix's service-role key). This matters more than usual now:
    if it's missing in Production, every page that renders `<Navbar>`
    (i.e. nearly the whole site) imports `getCurrentUser()` →
    `lib/auth/jwt.ts` and will throw at runtime. Confirmed local
    `npm run build` behaves correctly either way (dummy secret set →
    clean build; unset → import throws, matching what Vercel would do
    if it's genuinely unset there) — but only checking Vercel's actual
    Production env var settings directly can confirm the real value.
    **Please verify `JWT_SECRET` is set in Vercel → Settings →
    Environment Variables → Production, at least 32 characters,
    before/immediately after this deploys.**
  - `/api/auth/login` and `/api/auth/signup` no longer return the JWT
    in the JSON response body — only the httpOnly cookie carries it
    now (the client never read it for anything else; grepped the
    whole app for `Authorization: Bearer` / `getTokenFromHeader` usage
    and found none). This required fixing three dead-end client reads
    of `data.data.token` into `localStorage` (login page, signup page,
    the old `/dashboard` client-side gate) — `/dashboard` is now
    protected server-side by `middleware.ts` instead, like `/teacher`
    and `/admin` already were.
  - Login rate limiting: new `login_attempts` table (email, ip,
    attempted_at). 8 failed attempts for the same email within a
    sliding 15-minute window → 429 `too_many_attempts`, checked BEFORE
    the password (or even user-existence) is checked, so a
    nonexistent-email guess costs the same as a real one. No explicit
    reset job needed — the sliding window naturally stops counting an
    attempt once it's >15 minutes old. Verified directly against the
    real table (rolled back): 8 attempts inside the window reads as
    blocked; the same rows aged to 20 minutes old read as 0 attempts
    (unblocked).

- SESSIONS TABLE + DEVICE IDENTITY:
  - New `sessions` table: id, user_id (FK → users, ON DELETE CASCADE),
    device_id, device_label, ip, created_at, last_seen_at, revoked_at.
    Partial indexes on `(user_id) WHERE revoked_at IS NULL` and
    `(user_id, device_id) WHERE revoked_at IS NULL` for the lookups
    the login flow does on every attempt.
  - `device_id` cookie (`lib/auth/device.ts`): a `crypto.randomUUID()`
    set by `middleware.ts` on first visit to ANY page (1 year, NOT
    httpOnly since nothing server-only needs to hide it, NOT cleared
    on logout — it identifies the browser, not the session, which is
    the whole point of a device limit). Deliberately runs only on page
    loads, not `/api/*` — the login/signup routes independently
    generate one if it's somehow still missing when they run, so there
    is exactly one writer for the cookie during the request that
    actually matters, instead of a middleware Set-Cookie and the
    route's own Set-Cookie racing on the same header.
  - `deviceLabelFromUserAgent()` — small dependency-free UA parser
    ("Chrome on Windows", "Safari on iPhone"); it's a label for the
    devices list, not used for any access decision, so it doesn't need
    to be spoof-proof. Verified against 6 real UA strings (desktop/
    mobile Chrome, Safari, Firefox, Edge) plus the null/unknown case.

- LOGIN ENFORCEMENT (`lib/auth/sessions.ts`, max 2 devices,
  90-day safety-net ceiling on top of explicit revocation):
  - Same device_id already has an active session → refreshes
    `last_seen_at`/`ip`/`device_label` and reuses it, doesn't spend a
    slot.
  - Under 2 active sessions → creates a new one.
  - At 2 already → **no token is issued**. Returns 409 `device_limit`
    with the active devices (id/label/lastSeenAt) and a 10-minute
    `preAuthToken` (a distinct signed JWT type, `lib/auth/jwt.ts`'s
    `generatePreAuthToken`/`verifyPreAuthToken`) proving this caller
    just supplied the right password for this account — without it, a
    stranger who only knows someone's email could hit the revoke
    endpoint and sign out their devices.
  - `POST /api/auth/sessions/revoke` accepts either a fully
    authenticated owner of the session (the normal case from the
    devices page) or a valid `preAuthToken` scoped to that same
    user — mid-login case from the 409 response.
  - `/auth/login`'s page now handles the 409 itself: shows the message,
    lists the active devices with a Sign Out button each, and
    auto-retries the same login once a device is freed.
  - Signup also creates a session (reusing the same resolve function —
    a fresh account always has 0 active sessions, so it always
    succeeds) so a brand-new user isn't immediately logged-out-looking
    once request-time validation (below) starts checking for one.

- REQUEST-TIME VALIDATION (`lib/auth/session.ts` `getCurrentUser()`):
  a JWT with a valid signature and unexpired `exp` is no longer
  sufficient — it must also carry a `sessionId` whose row exists and
  has `revoked_at IS NULL`, checked via one JOIN query on every call.
  This is what actually makes "sign out a device" work immediately
  rather than only once the JWT naturally expires. `last_seen_at` is
  only rewritten when it's gone stale by more than 5 minutes, so a
  burst of page loads from one active user doesn't hammer the table.
  Logout now sets `revoked_at` on the current session (in addition to
  clearing the cookie) instead of only clearing the cookie — a stolen
  but not-yet-expired cookie from before a legitimate logout no longer
  works either.
  BREAKING, DELIBERATELY: every token issued before this shipped has
  no `sessionId`, so `getCurrentUser()` treats it as logged out. Every
  currently-logged-in user needs to log in again once after this
  deploys — acceptable for a security fix, and no worse than the
  existing 24h token expiry would have forced anyway.

- STUDENT-FACING: `/account/devices` — lists a user's own active
  sessions (label, IP-free display just label + last active + "This
  device" tag matching the `device_id` cookie), Sign Out button per
  row, no pre-auth token needed since they're already fully
  authenticated. Linked from the student dashboard, and from the
  teacher/admin portal header bars (no account-settings page existed
  anywhere before this, so these are the natural landing spots).

- ADMIN VISIBILITY: `/admin/users` now shows each student's active
  device count inline (amber when at the 2-device cap — the instant
  tell for a shared/passed-around join code or login) and a "Sign out
  all devices" action inside the existing role/status dropdown, backed
  by `POST /api/admin/users/[userId]/revoke-sessions`.

- VERIFICATION: `npx tsc --noEmit` and `npm run build` both clean
  (build run locally with a throwaway 48-char `JWT_SECRET`, since
  none exists in this sandbox — see the JWT_SECRET caveat above for
  why that specific env var now matters at build time too, not just
  runtime). Scanned every new/changed file for `\u` escapes — none.
  Ran the actual session-resolution and rate-limit SQL from
  `lib/auth/sessions.ts`/`rateLimit.ts` directly against the real
  Supabase database inside a rolled-back transaction (a throwaway test
  user, never committed) and confirmed: two devices logging in create
  two sessions; the same device logging in again reuses its session
  rather than spending a third slot; a third distinct device would be
  correctly blocked at the 2-device count; revoking one session flips
  exactly the `revoked_at` field `getCurrentUser()`'s join checks,
  which is what proves revocation actually invalidates that device's
  JWT on its next request without waiting for expiry; after revoking,
  the count drops back under the limit so the blocked device would now
  be admitted. Separately ran the exact JWT/pre-auth-token and
  UA-label code from the real source files under Node — token
  round-trip, tampered-signature rejection, pre-auth vs normal token
  type-confusion rejected both directions, and the label parser against
  6 real User-Agent strings. Confirmed the transaction rolled back
  cleanly (zero leftover rows) after every DB-backed check.
  NOT verified end-to-end through a real browser (three real logins on
  three different device_id cookies, hitting the 409, revoking one,
  confirming the third succeeds) — this sandbox has no browser access
  to the live site, same standing limitation noted throughout this
  file. Worth doing once deployed, alongside confirming JWT_SECRET.

### Added: commitment-style pricing (1/3/12-month plans, per-month display)

Save-My-Exams-style restructure: each paid plan is sold as a 1-month,
3-month, or 12-month commitment, always shown as an effective
per-month price with what it's actually billed at underneath —
instead of the old flat "monthly or yearly" two-button layout.

- DATABASE (real migration, not ad-hoc — `add_quarterly_billing_period`):
  - `subscription_plans` gained `price_quarterly` (numeric) and
    `shopier_url_quarterly` (text), alongside the existing `_monthly`/
    `_yearly` columns. Meaning kept consistent: each price column is
    the TOTAL charged for that whole period (1/3/12 months), not a
    monthly rate — `price_quarterly` is what a 3-month commitment
    costs in total, same convention `price_yearly` already used.
  - New prices: Free 0/0/0, Plus 349/747/2388, Pro 999/2697/9588
    (monthly/quarterly/yearly). Chosen so Plus's 12-month rate
    (2388/12 = 199) is exactly 43% off its 1-month rate (349) — the
    "Save 43%" example given in the spec, confirmed by running the
    actual savings-percent formula from the real component source
    against these exact numbers before shipping.
  - `shopier_orders.billing_cycle` had a CHECK constraint limited to
    `('monthly', 'yearly')` — found by querying `pg_constraint`
    directly rather than assuming from column type, and extended to
    include `'quarterly'` in the same migration. `subscriptions.
    billing_cycle` turned out to already be unconstrained free text,
    so no constraint change was needed there.
  - New `lib/billing.ts`: `billingCycleForMonths()` / `monthsForBilling
    Cycle()` — every place that previously hardcoded `months >= 12 ?
    'yearly' : 'monthly'` (admin manual grant, receipt-approval grant)
    or `billing_cycle === 'yearly' ? 12 : 1` (the Shopier OSB callback,
    which would have silently granted only 1 month for a quarterly
    order under the old binary logic) now goes through these shared
    functions instead. The receipt-upload flow (`/subscribe/verify`,
    `payment_requests.months`) already stored a raw month integer with
    no enum at all, so it needed no schema change — 3-month requests
    already worked there before this, just weren't reflected in the
    subscription's own `billing_cycle` label correctly until now.

- `/pricing` PAGE REDESIGN:
  - New `components/PricingCards.tsx` (client component): a pill
    toggle — 1 month / 3 months / 12 months, defaulting to 12 — drives
    every card at once without a page navigation. Each card shows the
    effective per-month price for the selected period (`total /
    {1,3,12}`, rounded), a "billed at X TRY every 3 months" / "billed
    at X TRY / year" / "1-month rolling plan" line underneath, and the
    approx.-USD line kept from before (now converted from the
    per-month figure, matching what's actually displayed).
  - Savings badge ("Save N%") computed live from the DB values
    (`1 - perMonth/price_monthly`), not hardcoded — it simply reads 0
    and disappears if prices ever change. "Best value" badge replaces
    the evergreen "Most popular" tag on Plus specifically when the
    12-month toggle is selected (both live on the same ribbon slot
    rather than stacking two badges).
  - Free card now reads "Free" / "free forever" instead of "0 TRY /
    month", untouched by the toggle. CTA still per-period
    (`shopier_url_monthly/_quarterly/_yearly` matching the selected
    toggle) with the existing "Checkout link coming soon" fallback
    when a link is null — none of the three are filled in yet (see the
    still-open Shopier product-link action item elsewhere in this
    file), so every paid CTA currently shows that fallback regardless
    of period, which is correct/expected, not a bug.
  - Kept the site's own visual system throughout (cream background,
    navy/brass palette, Georgia serif headings) — deliberately not
    copying Save My Exams' own look, only the commitment-tiers idea.
  - `tryToUsd()` moved out of `lib/settings` into a new pure
    `lib/currency.ts`, re-exported from `lib/settings` for every
    existing server-side caller unchanged. Necessary, not cosmetic:
    `lib/settings` imports the pg-backed `query()` helper, and
    `PricingCards` is a client component that recomputes the USD line
    on every toggle click — importing anything from `lib/settings`
    there would have pulled Node's `pg` driver into the browser
    bundle. Confirmed the fix worked by checking the built `/pricing`
    bundle size (1.71 kB — small, not bloated by a DB driver).

- LANDING PAGE (`app/page.tsx`) pricing section: now shows
  `price_yearly / 12` (rounded) instead of the flat `price_monthly` —
  no more stale 99/179 next to the real 349/999 shown on `/pricing`.
  Footnote rewritten from the now-inaccurate "Yearly billing available
  at checkout" to state plainly it's the 12-month rate and link to
  `/pricing` for the 1- and 3-month options.

- VERIFICATION: `npx tsc --noEmit` and `npm run build` both clean;
  scanned every new/changed file for `\u` escapes — none. Verified the
  migration landed correctly by re-querying `subscription_plans` and
  `pg_constraint` directly after applying it. Ran the actual per-month/
  savings-percent arithmetic from the real `PricingCards.tsx` logic
  (copied inline, same formulas) against the real seeded prices for
  all three plans × all three periods, and separately imported and ran
  the real `lib/currency.ts` `tryToUsd()` against representative
  amounts — both match by hand-check. NOT yet verified by loading
  `/pricing` in an actual browser and clicking through all three
  toggle states (this sandbox has no browser access to the live site,
  the standing limitation noted throughout this file) — worth doing
  once deployed.
- NOT PUSHED YET: this commit sits on the same branch as, and after,
  the session/device-limit auth commit above — which is deliberately
  held back pending confirmation that `JWT_SECRET` is set in Vercel's
  Production environment (see that entry). Since a git push moves the
  whole branch, this pricing work is blocked on the same confirmation,
  even though it doesn't touch JWT_SECRET itself.

### Added: first-party analytics (analytics_events + /admin/analytics)

An event log instrumented across the key actions on the site, plus a
dashboard to actually read it. Reuses the `sessions` table from the
device-limit feature for DAU/WAU/MAU and login stats rather than
duplicating that data, per the explicit instruction this was built to.

- DATABASE (`add_analytics_events` + a follow-up index migration):
  `analytics_events` — id, user_id (nullable, FK users ON DELETE SET
  NULL — anonymous visitors keep event_type/entity_type/entity_id/
  path/metadata/created_at, deliberately NO FK on entity_id (it's a
  loose reference into whichever table entity_type names — topics,
  simulations, booklets, past_papers — so deleting content never has
  to cascade through a fast-growing events table). Three indexes from
  the spec ((event_type, created_at), (entity_type, entity_id),
  (user_id, created_at)) plus one added after building the recent-
  activity feed and realizing it sorts the WHOLE table by created_at
  regardless of event_type, which none of those three serve — a
  plain `(created_at DESC)` index was added in a second migration.
- `lib/analytics/track.ts` — server-side `logEvent()`, wrapped in try/
  catch, swallows and console.errors on failure so a logging problem
  never breaks the request it's attached to. Exports the fixed list of
  10 tracked event types from the spec (page_view, lesson_view,
  simulation_start, simulation_complete, practice_start, download,
  login, logout, signup, subscribe_click) — `simulation_complete` is
  defined but nothing fires it yet, since none of the 21 simulations
  currently has an unambiguous "done" moment (the spec explicitly
  allowed skipping this); the dashboard's completion-rate column
  degrades gracefully to blank rather than 0% when that's the case.
- `lib/analytics/client.ts` — client-side `trackEvent()`, zero imports
  beyond browser globals (deliberately, so importing it from a 'use
  client' component never pulls the pg driver into the browser
  bundle — see the currency.ts split in the pricing entry above for
  the same lesson learned once already this session). Uses
  `navigator.sendBeacon`, falling back to a keepalive `fetch`.
  `POST /api/analytics/track` is the public sink both hit; it always
  derives `user_id` server-side from the auth cookie (never trusts a
  client-supplied one) and resolves a simulation's DB id from its
  `path` when the caller doesn't know it (see below).
- INSTRUMENTED call sites:
  * Auth: `logEvent()` called directly (same process, no HTTP round
    trip) from login/signup on success and from logout after revoking
    the session.
  * `page_view`: one `<PageViewTracker />` in the root layout, self-
    excluding `/admin` and `/teacher` paths via `usePathname()` rather
    than needing every page to opt in.
  * `simulation_start`: all 21 simulation `page.tsx` files gained a
    `<SimulationStartTracker />` (mechanically, via a script matching
    each file's identical outer-div structure — verified 42 matches
    = 21 files × 2, one import + one usage each). It fires once per
    mount with NO props — simulation pages are static routes that
    don't know their own DB id, so the API route resolves
    `simulations.id` from the page's own path server-side instead of
    requiring 21 separate query edits.
  * `lesson_view`: fired from the chapter detail page
    (`/curriculum/[chapterId]`), entity_type `'topic'` — SCOPE
    DECISION worth flagging: this app has no separate per-lesson page
    (the `lessons` DB table is unused dead schema; "lessons" in this
    codebase's own language means `topics`, matching "25 chapters, 89
    lessons" elsewhere in this file), so one event fires per topic
    listed when its chapter page loads, not per genuine per-topic
    engagement. Coarser than ideal, but simple, non-blocking, and
    still a real "which chapters get looked at" signal.
  * `download`: `PastPaperCard.tsx` (already a client component)
    gained inline `onClick` handlers on its QP/MS links; a new
    `DownloadLink` component wraps the plain `<a>` on `/booklets`
    (a Server Component with no other client interactivity before
    this).
  * `subscribe_click`: the Subscribe button in `PricingCards.tsx`,
    metadata `{plan, period}`.
  * `practice_start`: `PracticeSession.tsx` on mount, keyed to
    `topicId` — not required for the dashboard's Practice section
    (that reads `problem_submissions` directly, which already had the
    data with no new tracking needed, per the spec), added anyway
    since it's a cheap, honest instrumentation of a listed event type.
- `/admin/analytics` DASHBOARD (added to `AdminNav`), date range
  picker (7/30/90 days via `?days=`, default 30, admin-page style
  matching the rest of `/admin/*` rather than the public marketing
  navy/brass/cream skin — a brass/navy accent is used only inside the
  chart itself as a brand touch):
  1. Overview cards — DAU/WAU/MAU from `sessions.last_seen_at`
     (reusing that table, not duplicating it into events), logins
     today, signups/downloads/sim-starts for the selected range.
  2. Activity over time — new `AnalyticsChart.tsx` (Recharts
     AreaChart, active users + logins per day), the first real use of
     the `recharts` dependency in this codebase (was already installed
     but unused).
  3. Most-viewed lessons — top 20 by `lesson_view` count joined to
     topics/chapters, with a trend arrow comparing against the
     equal-length PRIOR period.
  4. Most-used simulations — top by `simulation_start`, completion %
     shown only where `simulation_complete` data actually exists.
  5. Practice engine — attempts/% correct/avg attempts-before-correct
     per topic, straight from `problem_submissions` — no new tracking,
     as specified.
  6. Downloads — top booklets and top past papers by count.
  7. Recent activity feed — latest events paginated 50/page up to 200
     total, resolving a readable entity name across four different
     possible source tables via conditional LEFT JOINs.
  8. "Accounts near the device limit" — 2+ active sessions or 3+ new
     sessions started in the selected range, tying back into the
     device-limit feature per the spec's explicit ask, with a link
     into `/admin/users` to act on it.
- HOUSEKEEPING FOLLOW-UP, NOT WIRED THIS PASS: a scheduled prune of
  `analytics_events` rows older than 12 months. No Vercel cron was
  added — noting it here as the spec allowed. Manual version until
  then: `DELETE FROM analytics_events WHERE created_at < now() -
  interval '12 months';` run periodically (or wire a Vercel Cron
  Job hitting a small admin-authenticated route that runs that same
  statement, on whatever schedule — monthly is plenty for a 12-month
  retention window).
- VERIFICATION: `npx tsc --noEmit` and `npm run build` both clean
  (build run locally with a throwaway `JWT_SECRET`, as with the auth
  entry above); scanned every one of the 37 new/changed files for `\u`
  escapes — none. Every one of the 8 dashboard queries was run
  verbatim against the real database with real committed fixture rows
  (a throwaway test user, a throwaway booklet, real topic/simulation/
  past-paper ids already in the DB) rather than guessed at: confirmed
  DAU/WAU/MAU/logins/signups/downloads/sim-starts counts matched
  exactly, the activity-over-time bucketing landed events on the
  correct calendar day, the lesson trend arrow correctly picked up a
  deliberately-planted prior-period row, download counts matched per
  entity type, the recent-feed query resolved the right readable name
  across all four entity-type joins, and the device-insight query
  correctly flagged the 2-session test account. All fixture rows
  (events, sessions, the test booklet, the test user) were then
  explicitly deleted and confirmed at zero leftover — not relied on a
  transaction rollback this time, since multiple separate query calls
  were needed to inspect each result individually.
  NOT verified by actually loading `/admin/analytics` in a browser or
  clicking through a real student session end-to-end (view a lesson,
  start a sim, attempt practice, download a booklet, log out) — this
  sandbox has no browser access to the live site, the standing
  limitation noted throughout this file. Worth doing once deployed.
- NOT PUSHED YET: same branch, same JWT_SECRET confirmation blocking
  the push as the two entries above.
- MONETIZATION PASS: video solve requests, standalone 1-on-1 tutoring,
  hard tier-gated simulations/lessons, and a soft paywall popup — one
  spec, four parts plus a shared Part 0 helper. All server-side, all
  verified against the real database, all typecheck+build clean.

  PART 0 — `lib/subscriptions/getUserTier.ts`: searched the whole
  codebase first per the spec's own instruction ("search for it
  rather than re-deriving it") and confirmed there was genuinely no
  prior self-lookup tier gate to consolidate — every existing
  `tier_level` reference was either the pricing-page catalog display
  or an admin granting SOME OTHER user's access
  (`/api/admin/access`). `getUserTier(userId)` is new code: returns
  `subscription_plans.tier_level` for the caller's
  `status = 'active' AND (end_date IS NULL OR end_date > now())`
  subscription row, defaulting to `TIER_FREE` (0) for no row, an
  expired one, or a null/undefined id. `TIER_FREE`/`TIER_PLUS`/
  `TIER_PRO` (0/1/2) and `tierName()` live alongside it. Every gate
  added in Parts 1-4 calls this — no call site re-queries
  `subscriptions`/`subscription_plans` on its own.

  PART 1 — Video solve requests (Plus & Pro only):
  * New table `video_requests` (student_id, chapter_id/topic_id
    optional, description, screenshot_path, status enum
    open/in_progress/fulfilled/declined, youtube_url, admin_note).
  * New PRIVATE Supabase Storage bucket `video-request-screenshots`
    — created the same way `receipts` was discovered to exist this
    session: a plain row inserted into `storage.buckets`
    (`public = false`), no separate bucket-management call needed.
  * Upload path reuses the existing signed-upload pattern EXACTLY as
    instructed — `lib/storage/signedUpload.ts`'s
    `createSignedUploadUrl()` + `lib/storage/directUpload.ts`'s
    `putFileToSignedUrl()`, the same two functions the booklets/
    past-papers upload flow uses. No new upload mechanism was
    invented. `lib/storage/signed.ts`'s old `receipts`-only
    `signedReceiptUrl()` was generalized into `signedFileUrl(bucket,
    path, expiresIn)` (kept `signedReceiptUrl` as a one-line wrapper
    so nothing else had to change) and reused for admin screenshot
    viewing.
  * Fulfillment is a YouTube "Unlisted" link only — `youtube_url` is
    a plain text column validated to look like a youtube.com/youtu.be
    URL on save; no video file storage of any kind was built.
  * Per-student open-request cap reads `site_settings` key
    `max_open_video_requests_per_student` (new row, default `'3'`)
    through a new `getMaxOpenVideoRequests()` in `lib/settings`
    rather than a hardcoded number — an admin can change the limit
    by editing that row directly (no dedicated settings UI for this
    one value yet, matching how `usd_rate`/bank settings are edited
    today: direct DB edit, not a form).
  * `/video-requests` (student): server-side tier check via
    `getUserTier()` before rendering anything — a Free-tier student
    hitting the URL directly gets the upsell card, never the form or
    their own request history. The same check lives independently in
    both API routes (`POST /api/video-requests`,
    `POST /api/video-requests/upload`), since the page-level check
    alone wouldn't stop a direct API call.
  * `/admin/video-requests`: filterable list, per-request status/
    YouTube-link/note editor, signed screenshot links.

  PART 2 — 1-on-1 tutoring as a standalone purchase:
  * Removed "One 1-on-1 private tutoring session per month" from
    Pro's `subscription_plans.features`; added "Video solve requests
    for problems you get stuck on" to Plus's features (DB update,
    not a code change — the pricing page already renders whatever is
    in that JSONB column).
  * New tables `addon_services` (one row so far: `tutoring-1on1`,
    1500 TRY / 999 TRY Pro-discounted) and `addon_purchases`
    (student_id, addon_id, shopier_order_id, price_paid_try, status
    pending/paid/scheduled/completed/cancelled, scheduled_at,
    admin_note). `shopier_orders` gained a nullable `addon_id` FK —
    reused, not a parallel payment table, exactly as instructed.
    `addon_purchases.shopier_order_id` is UNIQUE (nullable-safe) so
    the OSB callback's fulfillment insert is idempotent against a
    duplicate webhook delivery.
  * New `POST /api/payments/shopier/addon-checkout` (student-facing,
    unlike the existing admin-only `/api/payments/shopier/checkout`
    test portal) builds a `shopier_orders` row with `addon_id` set
    and `plan_id` null, applies the Pro discount server-side via
    `getUserTier()`, and returns the same auto-submitting-form field
    set `buildShopierFormFields()` already produces for subscription
    test charges. `app/api/payments/shopier/callback/route.ts` (the
    OSB webhook) gained one more branch: on a verified success with
    `order.addon_id` set, it inserts into `addon_purchases` with
    `status = 'paid'` the same way it already activates a
    subscription when `order.plan_id` is set.
    CAVEAT (carried over, not new): AshPhys's own-site Shopier
    checkout (`api_pay4.php`) has the persistent 509 error documented
    earlier in this file — real subscription purchases go through
    Shopier's native storefront links instead
    (`shopier_url_monthly/_quarterly/_yearly`), with the OSB webhook
    just logging an "unmatched" order and a teacher manually granting
    access. The new addon checkout is built the exact same way the
    existing subscription checkout is, so it inherits the same
    caveat — not a new risk, just an honest note that it may need the
    same manual-confirmation fallback in practice.
  * That manual fallback exists for tutoring too:
    `/admin/tutoring-bookings` has a "record a booking manually" form
    (mirrors `/admin/access`'s manual subscription grant) alongside
    the list of bookings, editable status/schedule/note per row.
  * `/tutoring`: open to every tier (not gated), shows the Pro price
    struck through the full price when the viewer is Pro, "Book &
    Pay" button reuses the exact hidden-auto-submit-form pattern
    `TestPaymentPortal.tsx` established.
  * Confirmation: reused the existing generic `/payments/result` page
    (the one Shopier's classic gateway already redirects to — its
    return URL is a single site-wide setting in Shopier's panel, not
    passable per-request, so a dedicated new route couldn't actually
    be reached by Shopier's redirect) rather than building a second,
    unreachable confirmation page. It now LEFT JOINs `addon_services`
    and shows tutoring-specific copy when `order.addon_name` is set.
  * `/pricing` and `/admin` nav updated: a two-card teaser linking to
    `/video-requests` and `/tutoring` under the pricing cards; both
    new admin pages added to `AdminNav.tsx`; both linked from the
    student dashboard.

  PART 3 — Tier-gated simulations and lessons:
  * `required_tier integer not null default 0` added to `simulations`,
    `topics`, AND `lessons`.
    SCOPE DECISION, stated plainly: `lessons` is dead schema — 0 rows,
    confirmed independently this session and in the prior analytics
    task; nothing in the app renders it. `topics` is what the UI
    actually calls a "lesson" (curriculum pages, `/practice/[topicId]`).
    The spec named `lessons` explicitly, so the column was added there
    too for literal compliance and in case it's populated later, but
    the REAL enforcement surface — server-side checks, the admin
    dropdown, the locked-content UI — is `topics`, not `lessons`.
    `simulations` is unambiguous and gated the same way regardless.
  * One-time population (a single UPDATE per table, re-run is a
    no-op since it's not additive): chapter_number IN (0, 1) — Prep
    Physics and Making Measurements — stays fully free everywhere.
    Elsewhere, `simulations`/`lessons` are grouped by `topic_id` and
    `topics` by `chapter_id`; the lowest-`order` row in each group
    stays `required_tier = 0`, the rest become `1` (Plus). Verified
    against the live DB after running it: e.g. chapter 3 (Forces and
    Motion) landed at 1 free / 5 locked topics, chapters 0-1 landed
    at 100% free across both topics and simulations — matches the
    rule exactly.
  * HARD server-side enforcement, not UI hiding, per the explicit
    instruction:
    - All 21 `app/simulations/*/page.tsx` files now fetch
      `s.required_tier` in their existing per-page context query,
      compute `getUserTier()` server-side, and conditionally render
      either the real simulator component or a new
      `<LockedContent requiredTier title>` component — the simulator
      component is simply never invoked when the viewer doesn't
      qualify. (Applied identically across all 21 files via a small
      one-off Node script since the template was byte-for-byte
      identical across them; every file was then verified in the
      typecheck/build pass and via spot-check.)
    - `GET /api/practice/[topicId]` and
      `POST /api/practice/[topicId]/submit` both now check the
      topic's `required_tier` against `getUserTier()` and return 403
      before touching problem/mastery data — a locked topic's
      question set is never sent to the browser, not just hidden by
      the practice UI.
    - `/practice/[topicId]` (the page) does the same check and
      renders `<LockedContent>` instead of `<PracticeSession>`.
    A determined free-tier user hitting any of these URLs directly
    gets the lock screen and no simulator/question data — verified by
    reading the rendered output, not just the gate logic.
  * `LockedContent` (`components/subscriptions/LockedContent.tsx`,
    server component) is the shared lock screen for both simulations
    and practice; `/curriculum` and `/curriculum/[chapterId]` now show
    a 🔒 icon + tier badge next to any locked topic in their listings
    (still linkable — clicking through lands on the same server-
    enforced lock screen, so this is a preview affordance, not a
    bypass).
  * `/admin/curriculum` gained `CurriculumTierManager` — a tabbed
    Simulations/Lessons list with a per-row required-tier dropdown
    (Free/Plus/Pro), calling a new allowlisted
    `PATCH /api/admin/curriculum/tier` (`table` restricted to a
    `Set(['simulations','topics','lessons'])`, never interpolated
    from anywhere else).

  PART 4 — Soft paywall popup:
  * `lib/paywall/client.ts`: pure browser-storage helper, no server
    imports (same discipline as `lib/analytics/client.ts` — safe to
    import into any client component without pulling in `pg`).
    `sessionStorage` counts locked-content attempts for the current
    tab session (works for anonymous visitors too — not tied to
    login); on exactly the 3rd attempt it dispatches a
    `window` CustomEvent. `localStorage` holds a 24h cooldown
    timestamp set on dismiss (either "×" or "See plans").
  * The trigger point is `<LockedContent>` itself — a tiny
    `LockedContentTracker` client component mounted inside it fires
    one attempt per render, so viewing ANY locked simulation or
    practice page (Part 3's enforcement surface) counts as one
    attempt, consistently, without instrumenting every locked-content
    entry point separately.
  * `SoftPaywallModal` is mounted once in `app/layout.tsx`. Eligibility
    (`tier < TIER_PLUS`) is computed SERVER-SIDE in the root layout via
    `getCurrentUser()` + `getUserTier()` and passed down as a prop —
    a logged-in Plus/Pro viewer's client bundle never even attaches the
    trigger listener. Path exclusion (`/admin`, `/teacher`) is checked
    client-side via `usePathname()` since that's inherently a client-
    only API. Logs `paywall_shown` (added to
    `lib/analytics/track.ts`'s `EVENT_TYPES` allowlist — the track
    API route silently drops any event type not in that list, so this
    was required, not optional) when the modal actually opens, and
    `subscribe_click` with `metadata: { source: 'soft_paywall' }` on
    the "See plans" click, reusing the existing `analytics_events`
    table and `trackEvent()` client helper.

  VERIFICATION: `npx tsc --noEmit` clean after every part (checked
  incrementally, not just once at the end); `npm run build` clean
  (same throwaway local `JWT_SECRET` workaround as every prior build
  verification in this file — Vercel's real env var is untouched).
  Scanned all 55 new/changed files for `\u` escapes — none. Every new
  migration and every new/changed SQL query was run against the real
  database via the Supabase MCP tools before being trusted: bucket and
  `site_settings` rows confirmed post-insert, the Part 3 population
  UPDATE's per-chapter free/locked counts confirmed against the actual
  chapter numbers and rule, join queries for the new admin/student API
  routes confirmed with `EXPLAIN` against the live schema (no
  production data was mutated by verification — the one exception, an
  `UPDATE ... WHERE id = (...) AND false`, executes as a real no-op by
  construction, confirmed via its own `EXPLAIN` output).
  Also pushed to `ashphyss`'s `claude/charming-ride-usi05g` branch
  (cherry-picked from `ashphys`, the usual `tsconfig.tsbuildinfo`
  conflict resolved the usual way) and confirmed the resulting Vercel
  preview deployment (dpl_ELaMZaaYG2N6GoYxgbdNiKuE3uQN) reached
  READY with all 93 routes built, including every new one. Did not
  push to `master` myself — this session's branch instructions are
  explicit that pushes stay on the feature branch; whatever syncs
  this branch to `master`/production has, in every prior entry in
  this file, happened outside this session.
  NOT verified by clicking through a live browser session — this
  sandbox has no browser access, the standing limitation noted
  throughout this file. Specifically un-clicked: the Shopier addon
  checkout redirect end-to-end (blocked on the same known 509 issue
  as every other own-site Shopier checkout attempt this project has
  made), and the soft paywall's 3-click trigger/cooldown timing.
  Worth doing once deployed.

## Equation Rearranger: real reveal.js render/animation layer + glossary (2026-09-17)

- SCOPE, stated plainly up front: this replaced only the RENDER/
  ANIMATION layer. `isolateSteps`, `buildIntermediate`, the verified
  Basic/Advanced equation bank, and the layout math that turns a
  `Side` into positioned tokens (`layoutEquation` and everything under
  it) are BYTE-IDENTICAL to before — copied into the new
  `EquationRearrangerSimulator.tsx`, not re-derived, and re-verified
  against that exact copy (below) rather than trusted on the strength
  of the old verification alone.
- The task's reference presentation ("study its `<style>` block from
  '===== animated equation engine =====' onward, and its
  `render()`/`mk()`/`openGloss()` logic, which the user has already
  shown me") was NOT actually present anywhere in this session's
  context or on disk — checked directly (a filesystem-wide search for
  its marker strings, and this session's own artifact-shared list,
  both empty) before writing any code. Rather than guess at a
  reference I couldn't see, or silently invent one, this was built
  from the task's own detailed behavioral spec (FLIP-based token
  movement, cancel-strike, enter/exit, a glossary popup with backdrop/
  pop-in/edge-flip) — the TECHNIQUE the task asked to reuse, described
  precisely enough to implement correctly without the source. Noting
  this plainly rather than implying a port happened that didn't.

  PART 1 — `components/reveal/RevealDeck.tsx` (reusable, not
  equation-rearranger-specific):
  * `npm install reveal.js` (6.0.2, real npm package, not a CDN
    script). Only core (`reveal.js/reveal.css` + a hand-written
    scoped reset, NOT `reveal.js`'s own `dist/reset.css` — see below)
    — no plugins, no MathJax; equations are custom HTML/CSS tokens,
    never typeset math.
  * `new Reveal(containerElement, opts)` (v6's scoped-instance
    constructor, not the classic global-singleton `Reveal.initialize()`
    on a page-wide `.reveal`) with `embedded: true`, `hash: false`,
    `history: false`, `keyboardCondition: 'focused'`, `controls:
    false`, `progress: false`, `slideNumber: false`, plus one option
    beyond the spec's literal list that turned out to be required:
    `disableLayout: true` — without it reveal.js tries to scale/center
    the deck as a fixed 960×700 presentation box, which fights a
    normal responsive page; `disableLayout` is reveal.js's own
    documented escape hatch for exactly this ("so you can use custom
    CSS layout"). Container is `tabIndex={0}` so it's focusable.
  * reveal.js is used PURELY as a navigation/index state machine —
    which section, which fragment, keyboard/back/next plumbing — and
    draws none of the visible content. Fragment placeholders
    (`<span class="fragment">`) are zero-size and stripped of
    reveal.js's own opacity/transform fragment animation
    (`reveal-deck-scope.css`); the actual pixels are 100% owned by
    lib/equation-stage's imperative renderer, which redraws on every
    fragment-index change. Arrow-key navigation is NOT reveal.js's own
    key handler (which would fall through to the next SLIDE once
    fragments run out) — it's the deck's own `onKeyDown`, scoped to
    the container, calling `nextFragment()`/`prevFragment()`
    (fragment-only methods that structurally cannot cross a slide
    boundary), with `stopPropagation()` so nothing outside the deck
    ever sees an arrow key it fired.
  * Exposes `next`/`prev`/`goToSlide`/`syncFragments` via
    `useImperativeHandle` (a ref) plus a `useRevealDeck()` convenience
    hook pairing that ref with reactive `{slideIndex, fragmentIndex,
    canNext, canPrev}` state (the last two straight from reveal.js's
    own `availableFragments()`).
  * STYLE ISOLATION — checked in the actual COMPILED CSS output, not
    just the source, since that's what really ships: reveal.js's
    `dist/reset.css` (bare `html,body,div,h1-h6,p,a,section,...` tag
    selectors, no class scoping at all) is never imported — importing
    it would have reset margin/padding/font on every such element
    site-wide. A small hand-written `reveal-deck-scope.css` scopes an
    equivalent reset under `.ash-reveal-deck` instead, plus a targeted
    override for `.reveal-viewport` (a reveal.js-only class name, safe
    to touch globally since nothing else in this codebase uses it) to
    stop it assuming it owns the whole page (`height:100%`, opaque
    background, `overflow:hidden`). Verified post-build: grepped both
    compiled CSS chunks for any selector not scoped under `.reveal`/
    `.r-overlay`/`.reveal-viewport` — the only hits were inside
    reveal.js's own `@media print` block (bare `html`/`body` rules
    that only affect printing a reveal.js deck, never normal
    browsing), everything else was correctly `.reveal`-scoped, and the
    cascade order needed for the scope override to win same-specificity
    ties against reveal.css (`.ash-reveal-deck .slides` vs `.reveal
    .slides`, etc.) was confirmed directly in
    `react-loadable-manifest.json` — reveal.css's chunk is listed
    BEFORE the scope-override chunk for
    `EquationRearrangerSimulator.tsx`'s dynamic import, so the browser
    links them in the right order. Also confirmed this CSS is only
    ever fetched on `/simulations/equation-rearranger` at all (it's
    tied to `RevealDeck`'s own dynamic-import chunk per that same
    manifest) — every other page never loads a byte of it, the
    strongest isolation guarantee available short of a live click-
    through.
  * `RevealDeck` is dynamically imported (`next/dynamic`, `ssr:
    false`) at its one call site — reveal.js touches `document` and
    must never evaluate server-side.

  PART 2 — `lib/equation-stage/` (also reusable, but intentionally
  equation-domain-specific per its own name and the task's explicit
  node-builder list):
  * `types.ts` — a generic positioned-token tree (`StageToken`:
    key/text/x/y/kind, kind one of variable/number/operator/equals/
    bracket/fractionBar/unit — the task's own "variable/number/
    operator/unit/fraction/root/power" vocabulary, where fraction/
    root/power are STRUCTURAL shapes built from those leaf kinds, not
    separate leaf kinds themselves — exactly how the untouched
    `layoutFactor`/`layoutSideTokens` already build them: a fraction
    is a numerator row + a bar + a denominator row, a root/power is a
    bracket-open + a recursively laid-out inner side + a bracket-close).
  * `mk.ts` — the tiny typed DOM-builder helper the task asked for.
  * `render.ts` — `renderStage(container, stage, opts)`: a single,
    reusable FLIP-diff entry point (not a multi-phase API) that
    matches existing DOM nodes to `stage.tokens` by `key`, and for
    each one either FLIPs it (measure the old rect, apply the inverse
    transform, then transition to the new position — real First-Last-
    Invert-Play, using `getBoundingClientRect()` before and after),
    enters it (fade+scale from 0), or exits anything no longer present
    (fade+scale out, then removed) — plus a strike-through overlay
    toggled on any key in `cancelKeys`. Text lives in a dedicated
    `.eq-token-label` child (a real bug caught before it shipped: an
    earlier version wrote the label straight onto `el.textContent`,
    which on update would have silently WIPED the glossary glyph and
    strike-overlay children the same element also holds, since
    `textContent =` replaces every child).
  * The 3-phase choreography per move (operate → cancel → settle) —
    the SAME shape the old StepSnapshot system used — lives in the
    CALLER (`EquationRearrangerSimulator`'s `playForward`), which
    calls `renderStage` three times with awaited delays between them,
    not inside `render()` itself; keeping the engine to one simple
    "diff to this state" primitive is what makes it reusable for a
    future sim with a totally different phase shape.
  * `GlossaryOverlay.tsx` — popup card (symbol, name, unit + long-form
    unit name, description, a role line distinguishing "the variable
    you're solving for" from "travels with the algebra to both sides"),
    positioned from the clicked glyph's `getBoundingClientRect()`,
    flips above the glyph when it would overflow the viewport bottom
    and flips its arrow side near the left/right edges, closes on
    Escape / outside mousedown / window resize. Built with plain
    Tailwind + a CSS keyframe in `equation-stage.css`, not
    `styled-jsx` — nothing else in this codebase uses styled-jsx and a
    first usage wasn't worth introducing for one pop-in animation.
  * Variable tokens carry TWO independent click targets, never merged:
    the symbol itself (`clickableVariable`, unchanged solve-for-this
    behavior) and a small superscript "ⓘ" glyph rendered as a child of
    the token (`glossarySymbol`, opens the glossary). The glyph's
    click handler calls `stopPropagation()` so clicking it can never
    also fire the parent token's solve-for-variable handler — the one
    interaction bug this pairing could obviously have, closed
    directly rather than left to be found by clicking around.
  * Glossary content (`glossary.ts`): one entry per variable symbol —
    but NOT a flat symbol->text map, because a bare symbol isn't
    always the same physical quantity across this equation bank. Real
    collisions found while writing it: V₁/V₂ mean primary/secondary
    voltage in the transformer equation but initial/final VOLUME in
    Boyle's Law; V means volume in the density equation but voltage
    everywhere else; F means three different forces (plain, gravity,
    electrostatic) across three equations. Keyed by `(equationId,
    symbol)` with a shared per-symbol default for the (large majority
    of) cases that don't collide, name/unit always taken from that
    equation's own existing `VarInfo` (never re-typed) rather than a
    second, driftable copy. Verified with a small Node script against
    the real bank (all 20 equations, 68 variable-instances): every
    single one resolves to an AUTHORED description, zero silently
    falling through to the generic `"${name}, measured in ${unit}."`
    fallback — and each unit resolves to a real long-form name (down
    to the transformer's V₁/V₂ correctly reading "volts" while
    Boyle's Law's V₁/V₂, same bare symbol, correctly read "cubic
    metres").

  PART 3 — rewired `EquationRearrangerSimulator.tsx`:
  * One `RevealDeck`, one `<section>` per equation IN THE FULL,
    UNFILTERED bank order (so a section's index in the deck always
    equals its index in `EQUATIONS`, with no remapping needed when
    switching Basic/Advanced tabs) — 20 sections total, but only the
    currently-active one ever carries real fragment placeholders or
    content; the other 19 are empty shells (`display:none` until
    `.present`), cheap and simple rather than mounting/unmounting
    sections on tab or equation switches.
  * One fragment per `isolateSteps()` move, plus one more when
    `finalIsLeft` is false (the "flip sides" step) — `totalFragments =
    moves.length + (finalIsLeft ? 0 : 1)`, checked against the real
    move lists for the whole bank below. Clicking a variable computes
    `isolateSteps()` once (unchanged), and an effect registers the new
    fragment count with the deck via `syncFragments()` and renders the
    "ready, press Next" (f=-1) state; picking a DIFFERENT variable
    recreates the fragment placeholders from scratch (fresh DOM nodes,
    so reveal.js's per-slide fragment-visibility memory is never
    stale) and resets to f=-1 the same way.
  * Advancing INTO a move's fragment (`playForward`) plays the same
    three phases as the old StepSnapshot system, now as one
    continuous FLIP-animated sequence instead of three separate manual
    Next presses: inject the unsimplified form (real fraction/term
    growing on both sides), strike the cancelling pair, settle into
    `move.stateAfter` — captions update in step (`operateCaption`/
    `cancelCaption`/'Simplified.', ported verbatim from the logic the
    old `buildSteps()` used for the same three captions). Back
    (`snapTo`) jumps straight to the target fragment's already-settled
    state with `animate: false` — no replay, matching the existing
    manual-stepping requirement exactly. A monotonic render-generation
    counter guards every async step (`if (renderGenRef.current !==
    gen) return`), so a rapid Back press mid-animation can't let a
    stale `playForward` sequence clobber a newer one.
  * Next is disabled via `!deck.state.canNext` (reveal.js's own
    `availableFragments().next`, fragment-scoped) — reveal.js is never
    given the chance to fall through to the next slide, because
    nothing here ever calls its slide-level `.next()`/`.prev()`, only
    the fragment-only methods.
  * `isDone` and the settled `baseState` (for chaining to a new
    variable) are set EXPLICITLY at the exact moment each navigation
    function determines them, not derived from watching
    `deck.state.fragmentIndex` in a separate effect — an earlier
    design did that and had a real staleness race (the deck's fragment
    index updates asynchronously relative to a fresh derivation
    starting), closed by making both plain state set inline in
    `playForward`/`snapTo` instead.
  * `app/simulations/equation-rearranger/page.tsx` needed no changes
    — it already only imports `{ EquationRearrangerSimulator }` and
    wraps it in the Part 3 tier gate from the previous task; that gate
    still applies unchanged.

  PART 4 — STANDING PATTERN, documented here as asked: **use
  `RevealDeck` (`components/reveal/RevealDeck.tsx`) for future step-
  by-step simulations** — equation manipulation, worked examples,
  anything with a genuine stage-1/2/3 sequence a student advances
  through deliberately. Pair it with a domain-specific stage-tree
  module under `lib/<domain>-stage/` (following `lib/equation-stage/`'s
  shape: typed tokens, a `render()` FLIP-diff function, `mk()`) when
  the content needs positioned, animated tokens; for simpler step
  content (text/images per step, no token morphing) `RevealDeck` alone
  is enough — its fragment/section plumbing doesn't require the FLIP
  renderer. A future prompt asking for this pattern should just say
  "use RevealDeck."
  **This explicitly does NOT apply to free-play/sandbox simulations** —
  anything drag-based, slider-based, or continuously interactive (the
  Vector Addition Sandbox's 2D Sandbox mode, any of the existing
  drag-to-explore sims). Forcing those into a slide-deck/fragment
  structure would fight the format for no benefit; they keep whatever
  interaction style already fits them (the Vector Addition Sandbox's
  OWN manually-stepped Methods/Equations panels are the right
  precedent for when a sim mixes both — reveal.js-style stepping for
  its worked-example panels, free interaction for its main canvas).

  VERIFICATION:
  * `npx tsc --noEmit` and `npm run build` both clean (same throwaway
    local `JWT_SECRET` workaround as every prior build check in this
    file). `/simulations/equation-rearranger`'s route size grew to
    14.3 kB (reveal.js + the new engine code), in line with this
    codebase's other larger simulations (Vector Addition is also
    14.3 kB).
  * Re-ran the algebra engine's full verification against a fresh,
    byte-identical extraction of the ACTUAL new file (not the old
    one) — every equation × every clickable variable × both starting
    orientations × every chained pair, through the real
    `isolateSteps`/`buildIntermediate`/`layoutEquation`, asserting no
    throw, every cancelKey resolving in the mid-layout, and the final
    (or chained) answer balancing the original equation to relative
    error < 1e-9. Extended with the NEW check this task asked for:
    for every one of those cases, `totalFragments` was checked against
    `moves.length` (+1 exactly when a flip is needed), and walking
    every settled state from f=-1 to the last fragment via the same
    function the UI uses (`stateAtSettledFragment`) was confirmed to
    reach the identical numeric answer as the already-proven
    computation path. 4392 checks, 0 failures.
  * Retraced the three cases that crashed the OLD animation layer
    (F=GMm/r²→r, F=kq₁q₂/r²→q₂, T=2π√(L/g)→g) through the COMPLETE new
    pipeline end to end, including the new `toStage` adapter at every
    move — no throws, every cancelKey present in the adapted stage
    tokens, all three balance. Fragment counts (3, 4, 4) matched
    moves.length exactly (q₂'s case includes the flip: 3 moves + 1),
    which independently cross-checks against this file's own prior
    entry documenting these same three cases at 9/10/12 steps under
    the OLD 3-steps-per-move scheme (9=3×3, 10=3×3+1, 12=4×3) — same
    underlying moves, as expected, since `isolateSteps` never changed.
  * Scanned every new/changed file for `\u` escapes — none (the
    Advanced tab's subscripted symbols, √, ², ⁻¹, ⓘ, Σ, − are all
    typed as literal Unicode characters, per the standing rule).
  * NOT verified by clicking through a live browser session — this
    sandbox has no browser access, the standing limitation noted
    throughout this file. Specifically un-clicked: the actual FLIP
    motion looking smooth (vs. merely "not throwing"), the glossary
    popup's edge-flip behavior at real viewport sizes, and touch/
    keyboard interaction on a real device. Worth a real click-through
    from a session with browser access, in particular the three
    former crash cases and at least one square-root derivation
    (T=2π√(L/g)→g) to watch the multi-move-through-a-radical chain
    animate correctly.

## Practice grading overhaul + per-student analytics (2026-09-22)

Two changes, shipped in the order below. The grading fix was urgent: correct
answers typed in standard form were marked wrong during a live class.

### What the grading bug actually was

Three separate faults, not one. The brief guessed at `parseFloat()` and
missing tolerance; only the first of those was right, and it wasn't the one
that did the damage in the classroom.

1. **The client input, and this is the one that broke the lesson.**
   `components/practice/PracticeSession.tsx` used `<input type="number">`.
   A number input silently discards anything the browser considers invalid,
   so `1.8 x 10^10` never left the page — the server received an empty or
   truncated string. Three stored submissions of exactly `"1"` against
   answers of 6.75e9, 0.974 and 0.335 are the fingerprint of this. Those
   original keystrokes are gone and cannot be recovered by re-grading.
2. **The server grader.** `parseFloat()` stops at the first character it
   cannot read, so `parseFloat('1.8 x 10^10') === 1.8`, and
   `parseFloat('18,000,000,000') === 18`.
3. **Sign sensitivity.** A student answered `-8437500` to "calculate the
   magnitude of the force" (expected 8.44e6, 0.03% off) and was marked wrong.

Tolerance was **not** a cause: the old code already applied the same 2%
relative tolerance the brief asked for (`NUMERIC_TOLERANCE = 0.02`).

### What shipped

- `lib/grading/numericAnswer.ts` — pure, physics-aware grader.
  `gradeNumeric(input, spec)` returns `{correct, reason, parsedValue,
  parsedUnit, feedback}`. Handles e-notation, `m x 10^n`, `m * 10^n`,
  superscripts, LaTeX, thousands separators, SI prefixes and unit words;
  2% relative tolerance with a per-question override; sign-insensitive by
  default. 63 tests in `lib/grading/__tests__/`.
- The practice input is now `type="text"` with a live preview of how the
  grader will read the answer ("Reading this as 1.8 × 10¹⁰ N") and a format
  hint. Nothing validates on keystroke; grading happens on submit.
- `practice_attempts` + `practice_sessions`: append-only attempt log, now the
  source of truth. `topic_mastery` is kept as the fast-read cache but is
  recomputed from the log on every write, so the two cannot disagree.
- `/teacher/analytics`, `/teacher/analytics/[studentId]`,
  `/teacher/analytics/problems`, all CSV-exportable, over four new views.

### Where the proposed schema diverged from the real database

- **`user_id` → `student_id`, referencing `public.users`.** There is no
  `auth.users` here: the app has its own users table and a custom JWT.
  `problem_submissions` and `topic_mastery` already use `student_id`.
- **`topic_id`/`chapter_id` are `uuid`, not `text`** — that is what
  `topics.id` and `chapters.id` are.
- **`session_id` is nullable.** An attempt must never be lost because a
  session row could not be opened.
- **No `question_type` column was added.** `problems.answer_type` already
  distinguishes `multiple_choice` from `numeric`.
- **The MCQ conversion list was already done.** Q1, 3, 4, 6, 7, 9, 10, 11,
  12, 13, 14, 17, 18, 31, 32 of "17.4 Coulomb's law (extension)" were all
  already `multiple_choice` with four plausible-misconception distractors
  (plus Q33 and Q41, which weren't on the list). Q18 is a single question,
  not the sub-parts a–d the brief described.
- **Enrolment has no join table.** A class is a row in `sections`
  (`teacher_id`, `join_code`) and a student is enrolled by
  `users.section_id`. `v_class_topic_stats` joins through that.
- **There are currently zero rows in `sections`**, so no student is in any
  class. The teacher pages therefore show an explicit "create a class"
  empty state rather than a blank table.
- **RLS as specified cannot work here.** Every table in this database
  already has RLS enabled with zero policies, owned by `postgres`, and the
  app connects as the owner — so the API roles are denied everything and the
  app bypasses RLS entirely. A policy written against `auth.uid()` would
  match nothing and protect nothing. Access control therefore lives in
  `lib/practice/access.ts` (`rosterScope`, `canViewStudent`), which every
  analytics read goes through.
- **Per-question grading columns had to be added** to `problems`
  (`answer_unit`, `answer_unit_required`, `answer_tolerance`,
  `answer_sign_sensitive`, `answer_alternates`) — there was nowhere to put
  the per-question overrides the brief asked for.

### Re-grade result

25 historical submissions were migrated into `practice_attempts`; 6 of them
were numeric. Re-grading flipped **2** rows to correct:

- Q20, `-8437500` against 8.44e6 N — sign-insensitive magnitude.
- Q40, `1` against 0.974 N — inside the 5% tolerance now set for the
  multi-step net-force questions.

The other three wrong numeric rows stayed wrong (`46656` against 4.67e11 is
genuinely wrong working; the two `"1"` rows are what the number input left
behind and cannot be reconstructed). `topic_mastery` was rebuilt from the
corrected log for all four student × topic pairs that have history.

### Gotchas

- Unit case matters and is deliberately preserved: `MN` is mega, `mN` is
  milli — a factor of 10⁹. The grader lowercases only the numeric part.
- Superscript runs are folded to `^` + ASCII digits **before** any other
  digit handling, or `10¹⁰` would parse as 1010.
- `scripts/regrade-attempts.ts` is idempotent and defaults to a dry run;
  pass `--apply` to write. It needs `DATABASE_URL`.

## Practice worksheets as downloadable PDFs; all lessons free again (2026-09-22)

### What changed

- **Download PDF** on every practice page (`/practice/[topicId]`) returns a real
  A4 PDF built on the server by `GET /api/practice/[topicId]/worksheet`.
  Teachers and admins also get **Answer key PDF** (`?answers=1`); the key is
  only ever built for staff, whatever the query string says.
- The earlier print-styled HTML page (`/practice/[topicId]/worksheet`) is
  gone. It crashed in production (`TypeError: i is not a function`): the
  server page called `hasDiagram()` from `MomentumDiagrams.tsx`, a
  `'use client'` module, and a client module's plain functions are not
  callable from a server component. That file has no hooks, so the
  directive was removed.
- Admins bypass the practice tier gate (page, worksheet, practice GET and
  submit routes).
- **All 63 Plus-tier topics and the 1 Plus-tier simulation were set back to
  `required_tier = 0`** at the owner's request: everything is free to every
  signed-up user until tiers are switched on again from `/admin/curriculum`.
  The gating code is untouched.
- Drew the five Coulomb's law figures the questions said "as shown" but
  that had never existed (`coulomb-two-spheres-unequal`,
  `coulomb-two-positive-equal`, `coulomb-pith-balls`,
  `coulomb-three-inline`, `coulomb-right-angle`). They show only what the
  question text states — no force arrows — so they never give the answer
  away. They appear on screen and in the PDF.

### How the PDF is built (`lib/practice/worksheetPdf.ts`)

- PDFKit, with DejaVu Sans bundled in `lib/practice/fonts/` (licence
  alongside). PDFKit's built-in fonts only cover Latin-1; the questions use
  −, ×, ⁻¹¹, µ, Ω, ρ, √ and subscripts, all of which DejaVu covers.
- Diagrams go through svg-to-pdfkit. Next.js forbids `react-dom/server`
  inside route handlers, so `toSvgMarkup()` serialises the diagram's React
  tree itself; a test asserts it matches React's own output for every
  diagram key the problems table uses.
- Layout is manual (PDFKit margins are 0 so it never paginates on its own).
  Each question is measured by the same code that draws it, then moved to a
  new page if it would not fit — no question is ever split across pages.
- `next.config.js`: `pdfkit` and `svg-to-pdfkit` are
  `serverComponentsExternalPackages`, and `outputFileTracingIncludes` ships
  the fonts with the route's serverless function.

### Verified

- Unit tests (`lib/practice/__tests__/worksheetPdf.test.ts`) read the PDF
  back with pdfjs: the student copy never contains an answer, the key marks
  every one, pages never start mid-question.
- The compiled route was run under `next start` against the real 41
  Coulomb questions (database stubbed at the `pg` layer): logged-out →
  login redirect; student → worksheet, also when asking for `?answers=1`;
  admin → answer key (17 marked options + 24 numeric answers = 41). 11 A4
  pages, ~55 kB.

## Circular motion, gravitation and more Coulomb practice (2026-09-22)

From the owner's three worksheets (a circular motion / gravitation / Coulomb
question pack, a circular motion worksheet with answers, and a worked toy-plane
conical pendulum example). None of this is in the Cambridge IGCSE 0625 core, so
it sits in "(extension)" topics like 17.4:

| Topic | Where | Questions |
|---|---|---|
| **3.7 Circular motion (extension)** — new | Ch 3 Forces and Motion, after 3.6 (3.3 already introduces circular motion qualitatively) | 35: speed/period/acceleration, centripetal force and tension, vertical circles, conical pendulums |
| **24.3 Gravitation and orbits (extension)** — new | Ch 24 Earth and the Solar System | 7: field strength, F = Gm₁m₂/r², orbital speed/radius/period, planet mass from an orbit |
| 17.4 Coulomb's law (extension) | existing | +16 (Q42–57): net force at right angles and in triangles, solving for r and for q |

- Multi-part source questions ("a) speed b) acceleration c) tension") became one
  question per part, since each practice question has one graded answer.
  "Which force provides it?" and "what if the cord breaks?" became multiple choice.
- Answers were recomputed, not copied. **The source answer key is wrong for its
  Q9** (2.0 kg, r = 4.0 m, 2 rev in 6 s): it gives 75 m/s, 1.4 × 10³ m/s² and
  2.8 × 10³ N; the correct values are 8.38 m/s, 17.5 m/s² and 35.1 N. **The
  worked toy-plane example has Fc = 0.68 N**; 2.45 × tan 28° = 1.30 N, which
  gives T = 2.46 s. "Average velocity" over a full lap was reworded to speed.
- One source question mixed "mC" and "mu C" for the equilateral triangle; it is
  stored as µC throughout (+4.0, −6.0, +2.0 µC).
- g = 9.8 m/s² is stated in every question that needs it; multi-step answers
  have a 5% tolerance so g = 10 also marks correct.
- `database/seeds/2026-09-22-circular-motion-gravitation-coulomb.py` generates
  the `.sql` beside it: every stored answer and every number in each worked
  explanation is computed from the question's own values. The rows were applied
  through the Supabase MCP (no `DATABASE_URL` in the container) and checked by
  md5 against the file. IDs are deterministic (uuid5) and every insert is
  `ON CONFLICT DO NOTHING`, so re-running is safe.
- 13 new SVG figures (circular motion, orbits, charge layouts) in
  `components/practice/MomentumDiagrams.tsx`, labelled with the quantities only.

### Worksheet PDF layout change

With many figures the PDF ran to ~15 pages. A written-answer question now
draws its figure beside its working lines instead of above them (multiple
choice keeps it above the options): 3.7 is 10 pages, 17.4 went from 11 to 9.
Slashes inside units print as the division slash (∕), which PDFKit will not
break a line after, so "m/s²" never splits as "m/" + "s²".

## Admin portal: sidebar navigation and an infographic overview (2026-09-22)

- The admin navigation moved from a horizontally scrolling tab strip to a
  sticky left sidebar (`components/admin/AdminSidebar.tsx`), grouped as
  Dashboard / People / Content / Requests / Billing with an icon per page. The
  account block (name, My devices, Log out) sits at its foot. Below `lg` it
  collapses to a bar showing the current page and a Menu button.
- Queues that need an admin carry an amber count badge: pending teacher
  applications, pending payment receipts, open video requests and paid
  tutoring bookings not yet scheduled (`getPendingCounts` in
  `lib/admin/overview.ts`, queried once per admin page load by the layout).
- `/admin` is now a dashboard: a "Needs your attention" row (icon + count +
  label, amber only when something is waiting), headline tiles, daily active
  users (30 days, every day present so quiet days show as gaps), a ranked bar
  of what students did, correct vs incorrect practice answers per day, and
  meters for practice accuracy and lesson coverage (lessons with questions /
  all lessons). Every chart has a "Show as a table" view.
- Chart colours are the dataviz reference palette's first two categorical
  slots (blue #2a78d6, orange #eb6834), validated against the white surface;
  legend and label text stay in neutral ink, never the series colour.

## Practice: skip, jump to any question, and a progress map (2026-09-22)

- Practice now runs through a lesson's questions in their numbered order (the
  same numbers as the PDF worksheet) instead of a shuffle.
- **Skip for now** sits beside Check Answer. A skipped question is marked and
  comes back later.
- A **progress map** above the question shows one numbered square per
  question: green ✓ correct, red ✕ wrong, grey dashed "–" skipped, white not
  tried; the current one is ringed. Clicking a square jumps to it. A bar and
  legend give the counts. Revisiting an answered question says how it went
  last time and lets the student answer again.
- "Next" follows `nextQuestionIndex` (`lib/practice/progress.ts`): the next
  untried question, then skipped ones, then wrong ones, each searched forward
  from the current question with wrap-around. The session opens the same way.
- Correct/wrong comes from the student's latest `practice_attempts` row per
  question (GET /api/practice/[topicId] now returns `number` and `lastResult`
  per question), so it survives a reload and a new device. Skips are not
  attempts, so they are kept per browser in localStorage
  (`ashphys:practice-skipped:<topicId>`); losing them only resets those
  questions to "not tried".
- Skipping does not touch the mastery streak, which is still derived from
  attempts only.

## Homepage hero film, made with Three.js (2026-09-23)

A 20-second, 1920×1080, 30 fps looping film under the homepage hero:
"Every atom. / Every orbit. / Every wave. / Every field." and an AshPhys end
card ("Physics, made visible." · Lessons · Simulations · Practice ·
ashphys.org). Each beat is real physics: electrons on elliptical orbits; a
moon on a circular orbit with its velocity, centripetal force and radius
labelled (F = mv²/r); two-source interference on a ripple surface (v = fλ);
numerically traced field lines between + and − charges (F = kq₁q₂/r²).

- **Source:** `video/hero/scene.html` (Three.js r180, bloom, Inter captions as
  HTML over the canvas). The whole film is a pure function of time,
  `window.renderAt(t)`, with a seeded RNG, so every render is identical.
- **Rendering:** `video/hero/render.mjs` drives headless Chromium, screenshots
  each frame, pipes them into ffmpeg, and writes
  `public/video/ashphys-hero.{webm,mp4}` plus `ashphys-hero-poster.jpg`.
  `node render.mjs --stills 3.2,8.6 --out /tmp/x` dumps review stills.
  `video/hero` has its **own package.json** (three, playwright-core,
  ffmpeg-static, Inter) so none of it is installed with the site or on Vercel.
  To re-render: `cd video/hero && npm install && npm run render` (needs a
  Playwright Chromium: `npx playwright install chromium`). A full render takes
  about 15 minutes with software WebGL; `--encode-only` re-encodes the web
  files from the last 1080p master in under a minute.
- **Files shipped:** 1280×720 MP4 (H.264, 3.6 MB) and WebM (VP9, 3.9 MB) plus
  a 48 KB poster. The frames are rendered at 1080p; 720p is plenty at the
  ~1000 px the homepage shows it and roughly quarters the size.
- **On the page:** `components/home/HeroVideo.tsx` — muted, looping,
  `playsInline`, WebM with MP4 fallback, poster frame, a pause/play button
  (WCAG 2.2.2), no autoplay under `prefers-reduced-motion` (a big play button
  instead), and it pauses while scrolled out of view.

## Three.js simulations: Circular Motion Lab and Coulomb's Law Lab (2026-09-23)

The first two simulations built in 3D with Three.js (r180, now a site
dependency). Both are free (`required_tier` 0) and linked from their lessons.

- **Circular Motion Lab** — `/simulations/circular-motion`, topic 3.7.
  Three modes: *horizontal circle* (mass on a frictionless table round a peg),
  *vertical circle* (constant speed, as the questions assume; the path is
  shaded by tension, and below √(gr) the string goes slack near the top and
  the mass really falls inside the circle until the string snaps taut again),
  and *conical pendulum* (cone, h, r and θ drawn; “Resolve T” splits the
  tension into T cos θ and T sin θ). Arrows for T, mg, N, v and the resultant,
  all forces on one scale. “Cut the string” lets the mass go: along the
  tangent at steady speed on the table, or as a projectile otherwise, with the
  landing distance reported. Slow motion (½×, ¼×), 3D/side/top views, and a
  tension-round-the-loop graph for the vertical circle. Presets load every
  3.7 practice-question setup.
- **Coulomb's Law Lab** — `/simulations/coulombs-law`, topic 17.4.
  *Two charges*: q₁, q₂ (nC/µC/mC) and r; equal-and-opposite force arrows,
  one-click experiments (double r → × 0.25, double q₁, flip a sign) with the
  ratio spelled out, the substitution into kq₁q₂/r², and an F–r graph.
  *Three charges*: drag charges (snapped to half a grid square), pick which
  charge the forces act on, parallelogram construction, and a table of each
  force's r, F, Fx and Fy with the sums. Field lines (off / in the plane /
  all round in 3D) are traced numerically, with arrowheads. Presets load all
  six 17.4 net-force arrangements and five of the two-charge questions (the
  electron–proton and 0.017 m ones are outside the lab's range).

### How it is built

- `lib/physics/circularMotion.ts`, `lib/physics/coulomb.ts` — pure physics,
  tested against the stored answers of the practice questions
  (`lib/physics/__tests__/physics.test.ts`); `lib/physics/format.ts` — `sci()`
  standard-form formatting shared by both labs.
- `components/simulations/three/stage.ts` — shared plumbing for every 3D lab:
  renderer on the labs' paper colour, OrbitControls, CSS2D labels, soft
  shadows, a loop that stops while the canvas is off-screen, `fitPoints()`
  (frames a set of points exactly, with extra room on phones), a camera glide
  timed by the wall clock, `layoutLabels()` (puts each label beyond its
  arrow's tip on screen and pushes overlapping labels apart), `Arrow3D`,
  `Segment` (strings, rods) and `FatLine` (pixel-width lines whose buffers
  are rewritten in place — `LineGeometry.setPositions` allocates new GPU
  buffers every call, so never call it per frame).
- `components/simulations/circular/CircularScene.ts`,
  `components/simulations/coulomb/CoulombScene.ts` — the scenes. The React
  components (`CircularMotionLab.tsx`, `CoulombLab.tsx`) own all state and
  `import()` their scene inside `useEffect`, so three.js never runs on the
  server and only loads on these two pages.
- DB rows: `database/seeds/2026-09-23-3d-simulations.sql` (idempotent).

### Next

Other simulations can move to 3D on the same stage; the best candidates are
the ones whose physics is naturally three-dimensional (gas in a box, ripple
tank surface, optics bench, pressure in liquids, pendulum).

## Equation Rearranger rebuilt as a Manim-style lesson film (2026-09-24)

`/simulations/equation-rearranger` now plays like a 3Blue1Brown video that
the student steers. The algebra (isolateSteps / buildIntermediate and the
20-equation bank) is unchanged, moved to
`components/simulations/rearranger/algebra.ts`.

- **Look:** dark 16:9 stage; equations typeset by MathJax (Computer Modern,
  as in Manim) and drawn as real glyph outlines with three.js; Manim's
  palette, one colour per variable, the target in yellow, constants grey.
- **Each step:** the caption is written ("Divide both sides by m"); the
  operation appears on both sides (TransformMatchingTex: existing symbols
  glide, new ones rise in, fraction bars grow); the new pieces flash; the
  cancelling pieces flash red and are struck through with the reason
  (m/m = 1, +u − u = 0, √(v²) = v); they shrink away and the rest settles.
  Swapping sides moves along an arc; the answer gets SurroundingRectangle,
  Flash and "Solved for m". The camera zooms out for wide or tall equations.
- **Player:** Play (runs the whole derivation), Pause (freezes mid-move),
  previous/next step, a chapter timeline and step list (click to jump),
  speed 0.5–2×, full screen; Space / ← → / F on the keyboard. Hovering a
  variable shows its name and unit; clicking it solves for it (chained
  solves continue from what is on screen). Reduced motion plays at 2×.
- **reveal.js** still drives navigation: each step is a fragment. RevealDeck
  is now imported directly — `next/dynamic` did not forward its ref, so the
  imperative handle (Next/Back buttons) was null before.

### Code

- `lib/manim/` — a small Manim port: `rate.ts` (Manim's rate functions,
  line for line), `colors.ts`, `tex.ts` (MathJax → glyph outlines with
  their `\class{}` tags; runs in Node too), `mobject.ts` (Glyph, TexMob,
  Stroke with partial drawing), `animation.ts` (Write, FadeIn/Out,
  TransformMatching, Indicate, Recolor, Create, ShowPassingFlash, Flash
  lines, MoveFrame, Group/LaggedStart), `scene.ts` (renderer, moving camera
  frame, fixed caption layer, play/finishAll/pause/speed; renders only while
  something moves).
- `components/simulations/rearranger/` — `texFromState.ts` (equation → TeX
  with slot-key tags matching buildIntermediate's cancel keys),
  `captions.ts`, `RearrangerScene.ts` (the choreography), `palette.ts`.
- Tests: `components/simulations/rearranger/__tests__/typesetting.test.ts`
  typesets every state, caption and title over every equation × variable ×
  orientation × chained pair, and checks every cancel key exists as glyphs;
  `lib/manim/__tests__/tex.test.ts` checks the rate functions and layout.
- Removed the old DOM FLIP renderer (`lib/equation-stage/render.ts`,
  `types.ts`, `mk.ts`); the glossary and its overlay remain.
- New dependency: `mathjax-full` 3.2.2 (loaded lazily on this page only).

## Homepage "What's New" feed (2026-09-25)

A timeline of recent releases on the homepage (after "See It In Action")
and in full at `/updates`.

- `components/announcements/AnnouncementsFeed.tsx` — reusable: takes an
  `announcements` array; newest first; colour and icon per type (lesson
  blue, video rose, simulation teal, practice amber, platform violet);
  New/Updated badge; "Yesterday / 3 days ago" within a week, else
  "25 Sep 2026" (full date on hover); two-line clamp; type filter chips
  with counts; "Show N more" and a "View all updates" link; staggered
  fade-in (off under reduced motion). Pass `now` from the server so
  relative dates match between server and browser.
- `lib/announcements/` — `types.ts`, `format.ts` (date formatting and
  sorting, tested), `sampleAnnouncements.ts`.
- **The feed is a hand-kept list for now**: `sampleAnnouncements.ts` holds
  this week's real releases with real links. To announce something, add an
  entry there (newest anywhere; it sorts itself). Moving it to a database
  table with an admin form is the natural next step.
- The homepage hero film now has `id="film"` so the video announcement can
  link to it.

### What's New feed was stale (fixed 2026-10-15)
- Symptom: the newest entry on the homepage, the hero ticker and `/updates`
  was 24 Sep 2026 although lots shipped after. Root cause: the feed is
  ONLY the hand-kept array in `lib/announcements/sampleAnnouncements.ts`
  (no DB table, no API; the pages are `force-dynamic`, so nothing was
  cached), and no release since 24 Sep added an entry. Display logic
  (sort, counts, badges) was fine.
- Added 12 entries, dated from the commits and `problems.created_at`:
  messages (25 Sep), interactive solutions (27 Sep), AS/A Level/IB
  curricula (29 Sep), A Level circular motion & gravitation (30 Sep), 1,400+
  AS/A Level questions (30 Sep), coursebook chapters (30 Sep), Equation
  Rearranger cross-multiplication (1 Oct, simulation, UPDATED), circular &
  gravitation challenge set (5 Oct), Need help? button (6 Oct), AS
  Kinematics 440 questions (9 Oct), Coulomb CHALLENGING tier + A Level/IB
  (13 Oct), dark mode (14 Oct). New/Updated badges stay simulation-only.
- `format.test.ts` now checks the list is written newest first, dates parse
  and badges are only on simulations.
- **When you ship anything user-visible, add an entry to
  `sampleAnnouncements.ts` in the same commit.** (A DB table + admin form
  would remove this chore.)

## Messaging / mailbox (2026-09-25)

One conversation per subscriber with the AshPhys team, delivered on-site
always and by email when a provider is configured.

- **Admin mailbox**: `/admin/messages` (sidebar: People → Messages, with a
  live unread badge; also a "Unread messages" card on the overview).
  `/dashboard/messages` redirects admins there. Conversation list with
  search (name, email, message text), All / Unread / Received / Sent tabs,
  Drafts and Bulk history; thread view with the subscriber's plan, class
  and email status, All/Sent/Received toggle, read receipts ("Read",
  "Opened in email", "Emailed", "Delivered on AshPhys", "Email failed");
  reply box with rich text, templates and `{{placeholders}}`. Polls every
  20 s. Works one pane at a time on phones.
- **Compose** (`ComposeModal`): pick people by name/email; each gets their
  own copy in their own thread. **Bulk** (`BulkSendModal`): filters for
  students/teachers, plan (Free/Plus/Pro), class (or none), course
  enrollment (any / specific / none), joined within N days, subscription
  ending within N days, account status, email opt-in; live count and
  sample; confirm step with a personalised preview; the server refuses to
  send if the match count changed since the preview.
- **Drafts** autosave (compose, bulk, and per-thread replies).
  **Templates**: 8 seeded (welcome, enrollment confirmation, course
  reminder, payment received, renewal reminder, video ready, tutoring
  booked, exam prep); save/delete your own.
- **Student inbox**: `/dashboard/messages` (card on the student dashboard,
  envelope + unread badge in the navbar for every signed-in user). Plain
  text replies (20/hour limit), "Also email me new messages" toggle.
- **Email** (`lib/messaging/`): `config.ts` picks Resend, SendGrid or
  SMTP/Nodemailer from env vars; `mailer.ts` sends; `emailLayout.ts` wraps
  every email with an "Open in AshPhys" button and a CAN-SPAM footer
  (reason, unsubscribe link, `MAIL_POSTAL_ADDRESS`), plus
  `List-Unsubscribe` + one-click `List-Unsubscribe-Post` headers and a
  signed open-tracking pixel. `lib/email.ts` (password resets) now goes
  through the same provider switch.
- **Replies by email**: Reply-To is `MAIL_REPLY_TO` plus-addressed with the
  thread's token (`messages+<token>@…`). `POST /api/messages/inbound?secret=`
  accepts SendGrid Inbound Parse, Mailgun, Postmark or plain JSON; strips
  quoted history; files the reply in the thread if the sender is that
  subscriber; if the sender is an admin (replying to a "new message"
  alert) it is sent to the subscriber instead; other senders are ignored.
  Admins get an alert email for every student message (`ADMIN_NOTIFY_EMAIL`
  or all admins).
- **Unsubscribe**: `/unsubscribe?token=` page (confirm button, resubscribe)
  and `POST /api/unsubscribe` (also one-click). Unsubscribed people still
  get messages on-site, never by email.
- **API**: `POST /api/messages/send`, `GET /api/messages/inbox`,
  `GET /api/messages/thread/:subscriberId`, `PUT /api/messages/:id/read`,
  `GET /api/subscribers/search`, `POST|GET /api/messages/bulk-send`,
  `/api/messages/drafts[/:id]`, `/api/messages/templates[/:id]`,
  `GET /api/messages/unread-count`, `GET|PUT /api/messages/preferences`,
  `GET /api/messages/open/:id`, `POST /api/messages/inbound`,
  `POST /api/unsubscribe`.
- **Schema** (migration `messaging_mailbox`, file
  `database/seeds/2026-09-25-messaging.sql`): `message_threads` (one per
  subscriber, `reply_token`), `messages` (direction, channel, subject,
  sanitized HTML body + text, read_at, email_status/error/opened_at,
  bulk_send_id), `message_drafts`, `message_templates`, `bulk_sends`;
  `users.email_notifications`, `unsubscribe_token`, `unsubscribed_at`.
  RLS on, no policies (the app uses the direct Postgres connection).
- Admin HTML is sanitized server-side (`sanitize-html` allowlist); student
  text is escaped. Tests: `lib/messaging/__tests__` (15). Verified end to
  end against a local Postgres 16 copy of the schema with an SMTP sink.
- **To turn on email in production** (none of these are set yet): a
  provider key (`RESEND_API_KEY`, or `SENDGRID_API_KEY`, or
  `SMTP_HOST/PORT/USER/PASS`), `MAIL_FROM` on a verified domain,
  `MAIL_POSTAL_ADDRESS`; for reply sync also `MAIL_REPLY_TO` +
  `MAIL_INBOUND_SECRET` and an inbound-parse route to the webhook. See
  `.env.example`.

## Mailbox email delivery: validation, retries, warnings (2026-09-26)

Sending from the mailbox saves the on-site message first, then emails it;
an email problem never undoes the on-site delivery.

- **Before sending**: skipped (on-site only) if the person unsubscribed, no
  provider is configured, or the address is invalid: bad format, or its
  domain can't receive mail (`lib/messaging/validateEmail.ts`: MX, else
  A/AAAA; a null MX counts as "no mail"; DNS errors/timeouts never block;
  `MAIL_VALIDATE_DNS=off` disables the lookup).
- **Sending** (`mailer.ts`): 12 s timeouts; failures classified as
  permanent (HTTP 400/404/413/422, SMTP 5xx except 530/535/554) or
  retryable (timeouts, 408/429/5xx, 401/403 credentials, SMTP 4xx). A
  retryable failure gets one quick retry in the same request.
- **Retries** (`retryPolicy.ts`): after 2, 10, 30, 120, 480, 1440 minutes,
  then gives up (7 attempts). `retryDueEmails()` claims due rows with
  `FOR UPDATE SKIP LOCKED` and a 10-minute lease, so concurrent runs never
  double-send and an interrupted send is picked up again. Run by
  `GET /api/cron/email-retry` (Bearer `CRON_SECRET`, or an admin), which a
  **Supabase pg_cron job** (`ashphys-email-retry`, every 5 min, via pg_net,
  token in Vault as `email_retry_cron_secret`) calls only when something
  is due. Retries re-check unsubscribes and address validity.
- **Status in the database** (`messages`): `email_status` (pending / sent /
  failed / skipped), `email_error`, `email_attempts`,
  `email_last_attempt_at`, `email_next_attempt_at`, `email_sent_at`,
  `email_provider_id` (migration `messaging_email_delivery`).
- **In the mailbox**: after a send, a warning card if any email failed or
  was skipped for a real reason ("Delivered on AshPhys, but not by email
  yet… retrying automatically at 16:54"); per message "Email failed ·
  retrying at …" / "On AshPhys (invalid email address)" with **Retry now**
  (`POST /api/messages/:id/retry`). The line under "Messages" opens an
  email settings panel: provider, sender, where replies go, retry status,
  30-day sent/retrying/failed counts, and **Send test email**
  (`POST /api/messages/test-email`, shows the provider's exact error).
- **The email**: subject as a heading, the message, a **View in AshPhys**
  button deep-linking to that message (`/dashboard/messages#m-<id>`, which
  scrolls to and highlights it), a reply note, and the CAN-SPAM footer.
- **Reply-To**: `MAIL_REPLY_TO` if set (plus-addressed and synced when
  `MAIL_INBOUND_SECRET` is also set); otherwise the admin's own email
  (`ADMIN_NOTIFY_EMAIL`, else the admin account: naumnditch572@gmail.com),
  so students' replies land in your inbox. Admin "new message" alerts now
  set Reply-To to the student's email when replies aren't synced.
- Verified end to end on a local Postgres + SMTP sink simulating 451 and
  550 responses (37 checks), plus 21 unit tests.
- **Still needed to actually send email**: a provider key in Vercel (none
  is set). `CRON_SECRET` is already set in Vercel production.

## Interactive solutions catalog (2026-09-27)

Showcases premium quality to drive upgrades: Free and Plus can each fully
open a handful of interactive step-by-step problem solutions, then hit a
paywall; Pro is unlimited. Migration `solutions_catalog`.

- **Schema**: `solutions` (chapter, topic, problem_title, problem_number,
  difficulty, `interactive_html` or `interactive_html_url`,
  `static_preview` — always visible, even blocked —, description, tags,
  `solution_type` interactive/static, `is_published`, `tier_required`
  free/plus/pro — a per-solution floor independent of the view cap),
  `solution_access_log` (one row per view/block/upgrade-click, `action` in
  view_preview/view_full/blocked/attempted_upgrade), `user_solution_views`
  (`views_count` — the cumulative *distinct* solutions cap counts against).
  FKs point at this app's own `users` table (not Supabase `auth.users`,
  which this project doesn't use).
- **The gate** (`lib/solutions/`): `limits.ts` — Free 2, Plus 5, Pro
  unlimited (`viewLimitFor`), plus the `tier_required` floor
  (`tierRequiredRank`). `access.ts` — `resolveSolutionAccess()` is the
  single call a detail fetch runs through: a solution already fully
  viewed before is always free to reopen (checked via
  `solution_access_log`); otherwise it atomically spends one view with a
  guarded `UPDATE … WHERE views_count < limit`, so two concurrent requests
  can't both slip through the last slot. Every attempt is logged
  (view_full / blocked); `getViewStatus()` is the read-only version for
  showing remaining views without spending one.
- **API**: `GET /api/solutions` — published catalog + `viewer` (signed-in,
  tier, views used/left). `GET /api/solutions/[id]` — the gate: returns
  the static preview + `access` when blocked, the full
  `interactive_html`/`interactive_html_url` when allowed. Fetching an
  unlocked-for-the-first-time solution *is* the unlock. `POST
  /api/solutions/[id]/interest` logs `attempted_upgrade` when a blocked
  viewer clicks through to pricing.
- **Student UI**: `/solutions` (catalog: search, chapter filter, a
  views-remaining banner, tier/difficulty badges) and `/solutions/[id]`
  (viewer: the interactive HTML in a sandboxed iframe, `allow-scripts
  allow-same-origin`, or the external URL; blocked viewers get the
  preview plus a lock card with reason-specific copy and a "See plans" /
  "Sign in" CTA).
- **Admin UI**: `/admin/solutions` — create/edit/publish/delete, with the
  interactive HTML pasted in directly (or an external URL as a
  fallback) and a per-solution tier floor. `app/api/admin/solutions/`.
- Wired into the Navbar's "Study Materials" dropdown and mobile menu.
- Typecheck and `next build` both clean.
- **Linked from practice** (2026-09-27, migration `problems_solution_id`):
  `problems.solution_id` (nullable FK) lets a practice question point at
  its full interactive solution. `GET /api/practice/[topicId]` returns
  `solutionId` on a question only when the linked solution is published;
  `PracticeSession.tsx` shows a "✨ View full interactive solution" link
  to `/solutions/[id]` in the feedback panel once the student has
  answered (right or wrong — the walkthrough is worth seeing either
  way). First one seeded: **Four Charges on a Square** (Chapter 17,
  Static Electricity, Coulomb's law, `tier_required = 'pro'`) — problem
  `3eed062e-bec6-4312-bf1b-a83d5a607232`, solution
  `a6c82b1e-babb-468c-a525-0e12faa74fac`.

## Merged in `master`'s parallel work (2026-09-27)

Production deploys from `master`, but 31 commits of work (Manim rearranger
rewrite, QuestionMap progress bar, 3D simulation labs, messaging, the
solutions catalog, practice-solution linking, and more) had only ever
landed on `claude/charming-ride-usi05g`, never merged — so none of it
was actually live. Meanwhile `master` had picked up its own commits this
branch never had, most recently **receipt-scanning auto-tier-assignment**:
`lib/receipts/analyze.ts` (Anthropic API reads the uploaded bank-transfer
receipt), `lib/receipts/match-plan.ts` (matches the amount to a
subscription plan), `lib/access/grant.ts` (shared grant/revoke, now used
by the manual admin grant, receipt approval, and this auto-approval path
alike), and `payment_requests.detected_amount/currency/plan/months/
confidence/note/auto_approved`.

Merged `master` into this branch: every simulation page's tier-gating,
the Vector Addition simulator's label-position fix, the Manim rearranger,
and QuestionMap all predated master's copies (master was branched from
before those existed), so those resolved in this branch's favor. The
admin access-grant routes took master's side — it had refactored the
same logic into `lib/access/grant.ts`, which this branch's copies hadn't
picked up. `components/admin/AdminNav.tsx` (the old top-bar nav) was
already replaced by `AdminSidebar.tsx` on this branch, so its deletion
stood. This merge, once pushed to `master`, is what actually puts
everything on this branch live.
