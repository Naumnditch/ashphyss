# AshPhys — Current Project Status

**Read this first if you're a new Claude conversation picking this project up.**
This file is the source of truth for "what's actually built and where things
stand," separate from README_DEVELOPMENT.md (generic setup instructions).
Update it whenever something significant ships or changes.

Last updated: 2026-09-16 (Past papers now support a second Cambridge syllabus — 0972 IGCSE (9-1) Physics — alongside 0625, auto-created on upload)

---

## Live site

- Production: **www.ashphys.org** (aliases: ashphys.org, ashphyss.vercel.app)
- Owner/admin login: `naumnditch572@gmail.com` (role=admin in the `users` table)
- GitHub (code, push here): `github.com/Naumnditch/ashphys.git` → branch `main`
- GitHub (Vercel actually watches this one — **double s**): `github.com/Naumnditch/ashphyss.git` → branch `master`
- Standard deploy command from repo root:
  `git push origin main && git push ashphyss main:master --force`
- Supabase project: `ashphys-platform` (id `uolwvcszclviqrtyxwgl`, eu-central-1)
- Vercel project: `ashphyss` (id `prj_7lk98vPTJcP5ScK1syAZA0aPgTNV`), team `abdelrahman-elashmawys-projects`

## What's fully built and live

- **Homepage / positioning**: platform-first, not tutoring-first. Markets
  AshPhys as the only place needed to study physics, across IGCSE (marked
  "Available Now" — the only one with real content), IB and HMH (marked
  "Coming Soon" — honest, not yet built). Live stats and pricing tiers
  pulled from the DB, not hardcoded. Private tutoring is now a Pro-tier
  subscription perk, not a standalone headline CTA — `/book` still works,
  just isn't featured in the navbar anymore.
- **Curriculum**: 25 chapters, 89 lessons, matching the real Cambridge IGCSE
  Physics (0625) textbook table of contents. Browsable at `/curriculum`,
  navbar has a dropdown too. Full-text site search in the navbar
  (`/api/search`) covers chapters, lessons, and simulations.
- **13 interactive simulations**

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
- **Two GitHub repos**: pushing only to `ashphys` does nothing on the live
  site — Vercel watches `ashphyss` (double s). Always push both.
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
