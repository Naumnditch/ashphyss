"""Usage: python3 database/seeds/2026-10-13-coulomb-challenge.py database/seeds/2026-10-13-coulomb-challenge.sql [--json out.json]

"17.4 Coulomb's law (extension)" — a CHALLENGING tier appended to the IGCSE
bank, with the emphasis on suspended-charge problems.

The bank already holds 59 rows: Q1–58 plus Q59, an unanswered "(a)/(b) four
charges on a square" stub attached to the "Four Charges on a Square"
interactive solution. None of them is renumbered: the new questions start at
Q60. Every new question is difficulty 4 or 5, which the worksheet PDF labels
CHALLENGING (the practice page shows 4+ as "Stretch"), exactly like the
existing Q44, Q46, Q47 and Q58.

Format is the bank's own: one graded answer per question (numeric or
multiple choice with four options), the other parts of a multi-part
question worked in the explanation, which is a step-by-step paragraph
ending in a "Common mistake:" sentence. Figures are parametric SVG
components (components/practice/CoulombChallengeDiagrams.tsx) drawn in the
style of Q38's "coulomb-pith-balls"; this script writes their exact numbers
to components/practice/coulombChallengeDiagramData.ts so a figure can never
drift from its question.

Every answer, every distractor and every number in an explanation is
computed here from the question's own values. Inverse angle problems are
solved exactly with scipy.optimize.brentq. Constants: k = 9.0 × 10⁹ N·m²/C²,
g = 9.8 N/kg (as Q38), e = 1.60 × 10⁻¹⁹ C.

Also fixes two verified last-digit errors in the existing bank (listed in
PROJECT_STATUS.md, found by database/seeds/tests/test_coulomb_17_4_answers.py):
  Q40 stored 0.974 N, but √(0.54² + 0.81²) = 0.9735 N, which is 0.973 N to 3 s.f.
  Q58 stored 0.275 N, but 0.144√2 + 0.072 = 0.2757 N, which is 0.276 N to 3 s.f.
Both were already inside the grader's tolerance, so no past attempt changes.

All ids are uuid5 and every INSERT is ON CONFLICT DO NOTHING, so re-running
is a no-op. No literal ';' appears in any text (see PROJECT_STATUS.md: the
Supabase MCP hangs on one).
"""
import json
import os
import sys
import uuid
from math import asin, atan, atan2, cos, degrees, pi, radians, sin, sqrt, tan

from scipy.optimize import brentq

k = 9.0e9
g = 9.8
e = 1.60e-19
G = 6.67e-11
M_E = 9.11e-31
M_P = 1.67e-27

TOPIC = 'c6c1d1f5-1c6b-4ab4-a15b-beea25426304'
CHAPTER = '7137f560-2406-4a69-9099-4c845ef53ea8'
FIRST_NUMBER = 60  # Q1–59 already exist

K = 'Use k = 9.0 × 10⁹ N·m²/C²'
KG = f'{K} and take g = 9.8 N/kg.'


def uid(name):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f'ashphys/{name}'))


SUP = str.maketrans('-0123456789', '⁻⁰¹²³⁴⁵⁶⁷⁸⁹')


def sf(x, n=3):
    """A number as written in a worked solution: 3 s.f., × 10ⁿ outside 0.001–99 999."""
    if x == 0:
        return '0'
    if x < 0:
        return '−' + sf(-x, n)
    e10 = int(f'{x:e}'.split('e')[1])
    if -3 <= e10 < 5:
        if e10 >= n - 1:
            return str(int(round(x, n - 1 - e10)))
        return f'{x:.{n - 1 - e10}f}'
    m = f'{x / 10**e10:.{n - 1}f}'
    if m.startswith('10'):
        e10 += 1
        m = f'{x / 10**e10:.{n - 1}f}'
    return f'{m} × 10{str(e10).translate(SUP)}'


def deg(x, n=3):
    return f'{sf(x, n)}°'


def stored(x, n=4):
    """The answer_correct string: 4 s.f., e-notation outside 0.001–99 999."""
    neg = x < 0
    x = abs(x)
    e10 = int(f'{x:e}'.split('e')[1])
    trim = lambda s: s.rstrip('0').rstrip('.') if '.' in s else s
    if -3 <= e10 < 5:
        s = trim(f'{x:.{max(n - 1 - e10, 0)}f}')
    else:
        s = f"{trim(f'{x / 10**e10:.{n - 1}f}')}e{e10}"
    return ('-' if neg else '') + s


def q(s):
    assert ';' not in s, s
    return "'" + s.replace("'", "''") + "'"


def opt(v):
    return 'NULL' if v is None else q(v)


def theta_exact(q1q2, m, L):
    """Two balls on threads of length L from one point: k q1q2 / (2L sinθ)² = mg tanθ."""
    f = lambda t: k * q1q2 / (4 * L * L * sin(t) ** 2) - m * g * tan(t)
    return brentq(f, 1e-9, pi / 2 - 1e-9, xtol=1e-15)


def x_small_angle(q1q2, m, L):
    """Small-angle separation: x³ = 2kq1q2L/(mg)."""
    return (2 * k * q1q2 * L / (m * g)) ** (1 / 3)


questions = []
diagrams = {}


def _add(kind, slug, text, explanation, marks, difficulty, subtopic, suspended, figure, **extra):
    n = FIRST_NUMBER + len(questions)
    assert difficulty in (4, 5), slug
    assert 'Common mistake:' in explanation, slug
    key = None
    if figure is not None:
        if isinstance(figure, str):
            key = figure  # an existing diagram key
        else:
            key = f'coulomb-ch-{slug}'
            diagrams[key] = figure
    questions.append(dict(
        id=uid(f'problem/igcse/coulomb-challenge-2026-10-13/{slug}'), slug=slug, number=n, kind=kind, text=text,
        explanation=explanation, marks=marks, difficulty=difficulty, subtopic=subtopic, suspended=suspended,
        figure=f'diagram:{key}' if key else None, **extra))


def num(slug, text, value, unit, explanation, *, marks, difficulty=4, subtopic, suspended=False, figure=None,
        tolerance=0.05, sign=False, check=None):
    _add('numeric', slug, text, explanation, marks, difficulty, subtopic, suspended, figure,
         value=value, answer=stored(value), unit=unit, tolerance=tolerance, sign=sign, check=check or {})


def mcq(slug, text, options, correct, explanation, *, marks, difficulty=4, subtopic, suspended=False, figure=None,
        check=None):
    assert len(options) == 4 and len(set(options)) == 4, slug
    assert options[correct], slug
    _add('mcq', slug, text, explanation, marks, difficulty, subtopic, suspended, figure,
         options=options, correct=correct, answer=options[correct], check=check or {})


FBD_ONE = ('Free-body diagram for the hanging ball: its weight mg acts vertically down, the tension T acts along the '
           'thread towards the support, and the electric force Fe acts horizontally along the line of centres. ')
FBD_PAIR = ('Free-body diagram for either ball: weight mg vertically down, tension T along its thread towards the '
            'support, and the electric force Fe horizontally, directly away from the other ball. ')
RESOLVE = 'In equilibrium the components balance: T sinθ = Fe (horizontal) and T cosθ = mg (vertical). Dividing removes T: Fe = mg tanθ. '

# ════════════════════════════════════════════════════════════════════════
# A. SUSPENDED LIKE CHARGES — one ball on a thread, one on an insulating rod (Q38-style)
# ════════════════════════════════════════════════════════════════════════

# Q60 — unequal charges, one given: find the hanging ball's charge
m, th, r, qB = 2.0e-3, radians(20), 0.050, 40e-9
W = m * g
Fe = W * tan(th)
qA = Fe * r**2 / (k * qB)
T = W / cos(th)
num('fixed-unequal-charge',
    f'A small ball A of mass 2.0 g hangs from a support on an insulating thread. A second small ball B, carrying +40 nC and held on an insulating rod, is brought up level with A. A swings away and comes to rest with its thread at 20° to the vertical, with the centres of A and B 5.0 cm apart, as shown. Calculate the charge on A, in coulombs. {KG}',
    qA, 'C',
    FBD_ONE + RESOLVE +
    f'Step 1: mg = 2.0 × 10⁻³ kg × 9.8 N/kg = {sf(W)} N. '
    f'Step 2: Fe = {sf(W)} × tan20° = {sf(W)} × {sf(tan(th))} = {sf(Fe)} N. '
    f'Step 3: the charges are NOT equal, so rearrange F = kqAqB/r² for qA alone: qA = Fe r²/(k qB) = {sf(Fe)} × 0.050² ÷ (9.0 × 10⁹ × 40 × 10⁻⁹) = {sf(qA)} C (about {sf(qA * 1e9, 2)} nC). '
    f'A is repelled by a positive charge, so A is positive too. (The tension is T = mg/cos20° = {sf(T)} N, a little more than the weight.) '
    'Common mistake: copying Q38’s q = √(Fe r²/k) — that assumes equal charges, and here only qA is unknown. Also convert 5.0 cm to 0.050 m and 40 nC to 40 × 10⁻⁹ C before substituting.',
    marks=5, subtopic='Suspended charges: one ball fixed level (find q)', suspended=True,
    figure=dict(kind='fixed', props=dict(theta=20, attract=False, angleLabel='20°', sepLabel='5.0 cm',
                                          hangLabel='A', hangMass='2.0 g', hangCharge='q = ?', fixedLabel='B', fixedCharge='+40 nC')),
    check=dict(m=m, theta=20, r=r, qB=qB))

# Q61 — equal charges: find the separation
m, th, qq = 0.50e-3, radians(15), 12e-9
W = m * g
Fe = W * tan(th)
r = sqrt(k * qq**2 / Fe)
Fsin = W * sin(th)
r_sin = sqrt(k * qq**2 / Fsin)
num('fixed-find-separation',
    f'A 0.50 g pith ball hangs on an insulating thread. An identical ball on an insulating rod is brought up level with it. Each ball carries +12 nC. The hanging ball swings away and comes to rest with its thread at 15° to the vertical, as shown. Calculate the distance between the centres of the two balls, in metres. {KG}',
    r, 'm',
    FBD_ONE + RESOLVE +
    f'Step 1: mg = 0.50 × 10⁻³ × 9.8 = {sf(W)} N. '
    f'Step 2: Fe = mg tan15° = {sf(W)} × {sf(tan(th))} = {sf(Fe)} N. '
    f'Step 3: rearrange F = kq²/r² for r: r = √(kq²/Fe) = √(9.0 × 10⁹ × (12 × 10⁻⁹)² ÷ {sf(Fe)}) = √({sf(k * qq**2 / Fe)}) = {sf(r)} m, about {sf(r * 100, 2)} cm. '
    f'The angle being measured to the vertical is what makes the horizontal component T sinθ, and T itself is not mg: T = mg/cos15° = {sf(W / cos(th))} N. '
    f'Common mistake: writing Fe = mg sinθ (that is the component of the weight along an incline, not this balance) — it gives r = {sf(r_sin)} m. Another is forgetting the square root at the last step.',
    marks=5, subtopic='Suspended charges: one ball fixed level (find r)', suspended=True,
    figure=dict(kind='fixed', props=dict(theta=15, attract=False, angleLabel='15°', sepLabel='r = ?',
                                          hangMass='0.50 g', hangCharge='+12 nC', fixedCharge='+12 nC')),
    check=dict(m=m, theta=15, q=qq))

# Q62 — unlike charges: find the angle (attraction)
m, qA, qB, r = 1.5e-3, 30e-9, -25e-9, 0.040
W = m * g
Fe = k * abs(qA * qB) / r**2
thA = degrees(atan(Fe / W))
th_sin = degrees(asin(Fe / W))
num('fixed-attract-angle',
    f'A 1.5 g ball carrying +30 nC hangs on an insulating thread. A ball carrying −25 nC on an insulating rod is moved so that, when the hanging ball comes to rest, the two are level with their centres 4.0 cm apart, as shown. Calculate the angle the thread makes with the vertical, in degrees. {KG}',
    thA, '°',
    'The charges are unlike, so the hanging ball is ATTRACTED and swings towards the rod, not away from it. '
    + FBD_ONE.replace('along the line of centres', 'towards the other ball') + RESOLVE.replace('Dividing removes T: Fe = mg tanθ', 'Dividing removes T: tanθ = Fe/mg') +
    f'Step 1: Fe = k|qAqB|/r² = 9.0 × 10⁹ × 30 × 10⁻⁹ × 25 × 10⁻⁹ ÷ 0.040² = {sf(Fe)} N. '
    f'Step 2: mg = 1.5 × 10⁻³ × 9.8 = {sf(W)} N. '
    f'Step 3: tanθ = {sf(Fe)} ÷ {sf(W)} = {sf(Fe / W)}, so θ = {deg(thA)}. '
    f'Common mistake: using sinθ = Fe/mg, which gives {deg(th_sin)}. Fe and mg are the two legs of the right-angled force triangle and T is the hypotenuse, so their ratio is tanθ.',
    marks=5, subtopic='Suspended charges: one ball fixed level (find θ, unlike charges)', suspended=True,
    figure=dict(kind='fixed', props=dict(theta=thA, attract=True, angleLabel='θ', sepLabel='4.0 cm',
                                          hangMass='1.5 g', hangCharge='+30 nC', fixedCharge='−25 nC')),
    check=dict(m=m, qA=qA, qB=qB, r=r))

# ════════════════════════════════════════════════════════════════════════
# B. Two balls from the SAME point
# ════════════════════════════════════════════════════════════════════════

# Q63 — identical balls: find charge per ball
L, m, th = 0.50, 2.0e-3, radians(10)
r = 2 * L * sin(th)
W = m * g
Fe = W * tan(th)
qq = r * sqrt(Fe / k)
T = W / cos(th)
q_half = (L * sin(th)) * sqrt(Fe / k)
num('pair-find-charge',
    f'Two identical small balls, each of mass 2.0 g, hang from the same point on an insulating rod by threads 0.50 m long. They are given equal charges and repel until each thread makes 10° with the vertical, as shown. Calculate the charge on each ball, in coulombs. {KG}',
    qq, 'C',
    FBD_PAIR + RESOLVE +
    f'Step 1 (geometry): each ball is L sinθ from the vertical through the support, so the separation is r = 2L sinθ = 2 × 0.50 × sin10° = {sf(r)} m. '
    f'Step 2: Fe = mg tan10° = {sf(W)} × {sf(tan(th))} = {sf(Fe)} N. '
    f'Step 3: Fe = kq²/r², so q = r√(Fe/k) = {sf(r)} × √({sf(Fe)} ÷ 9.0 × 10⁹) = {sf(qq)} C. '
    f'Each thread pulls with T = mg/cos10° = {sf(T)} N. '
    f'Common mistake: using r = L sinθ = {sf(L * sin(th))} m, which is the distance from ONE ball to the vertical, not the gap between the balls — it gives half the charge, {sf(q_half)} C.',
    marks=5, subtopic='Suspended charges: two balls from one point (find q)', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=10, theta2=10, threadLabel='0.50 m', angle1='10°', angle2='10°',
                                         sepLabel='', left=dict(mass='2.0 g', charge='q'), right=dict(mass='2.0 g', charge='q'))),
    check=dict(L=L, m=m, theta=10))

# Q64 — tension with no mass given
qq, L, r = 50e-9, 0.25, 0.060
Fe = k * qq**2 / r**2
s = (r / 2) / L
thP = asin(s)
T = Fe / s
mP = T * cos(thP) / g
num('pair-tension-no-mass',
    f'Two small balls, each carrying +50 nC, hang from the same point on insulating threads 0.25 m long. In equilibrium their centres are 6.0 cm apart, as shown. The masses of the balls are not given. Calculate the tension in each thread, in newtons. {K}.',
    T, 'N',
    FBD_PAIR +
    f'Step 1 (geometry): half the separation, 0.030 m, is the side opposite θ in a right-angled triangle whose hypotenuse is the 0.25 m thread, so sinθ = 0.030 ÷ 0.25 = {sf(s)} and θ = {deg(degrees(thP))}. '
    f'Step 2: Fe = kq²/r² = 9.0 × 10⁹ × (50 × 10⁻⁹)² ÷ 0.060² = {sf(Fe)} N. '
    f'Step 3: only the tension has a horizontal component to balance Fe: T sinθ = Fe, so T = {sf(Fe)} ÷ {sf(s)} = {sf(T)} N. '
    f'(The vertical balance then gives the mass you were not told: m = T cosθ/g = {sf(mP * 1000)} g.) '
    f'Common mistake: reaching for T = mg/cosθ when m is unknown, or dividing Fe by tanθ — Fe/tanθ = {sf(Fe / tan(thP))} N is the WEIGHT mg, not the tension.',
    marks=6, subtopic='Suspended charges: two balls from one point (tension)', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=degrees(thP), theta2=degrees(thP), threadLabel='0.25 m', angle1='θ', angle2='θ',
                                         sepLabel='6.0 cm', left=dict(mass='', charge='+50 nC'), right=dict(mass='', charge='+50 nC'))),
    check=dict(q=qq, L=L, r=r))

# Q65 — unequal charges, equal masses: why equal angles (MCQ)
mcq('pair-unequal-charges-why',
    'Two balls of equal mass hang from the same point on threads of equal length. Ball A carries +20 nC and ball B carries +80 nC, four times as much. When they come to rest, how do the two thread angles compare, and why?',
    ['B’s thread makes the larger angle, because B carries four times the charge',
     'A’s thread makes the larger angle, because B’s bigger charge pushes A harder than A pushes B',
     'The angles are equal: by Newton’s third law A and B feel electric forces of the same size, and with equal masses and threads their force diagrams are identical',
     'The angles are equal only once the balls have touched and shared their charge equally'],
    2,
    'The force between A and B is ONE interaction: F = k qA qB / r² uses the product of the charges, so it is the same size on each ball (Newton’s third law — equal and opposite). '
    'Free-body diagram for each ball: mg down, T along the thread, Fe horizontal and away from the other ball. Both balls have the same mg and the same Fe, so Fe = mg tanθ gives the same θ for both — the arrangement is symmetric even though the charges are not. '
    'Swapping the charges, or making them +40 nC each (same product), would leave the angles unchanged. Unequal angles need unequal MASSES. '
    'Common mistake: thinking the bigger charge “feels” a bigger force or “gives out” a bigger force — each charge feels the same force, because the force depends on both charges together.',
    marks=4, subtopic='Suspended charges: unequal charges, equal masses (Newton’s third law)', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=12, theta2=12, threadLabel='L', angle1='θA', angle2='θB', sepLabel='',
                                         left=dict(mass='m', charge='A: +20 nC'), right=dict(mass='m', charge='B: +80 nC'))))

# Q66 — unequal charges q and 3q: find q
L, m, th = 0.60, 2.0e-3, radians(9.0)
r = 2 * L * sin(th)
W = m * g
Fe = W * tan(th)
qs = r * sqrt(Fe / (3 * k))
q_wrong = r * sqrt(Fe / k)
num('pair-q-and-3q',
    f'Two balls of mass 2.0 g hang from the same point on threads 0.60 m long. One carries charge q and the other 3q. In equilibrium each thread makes 9.0° with the vertical, as shown. Calculate q, in coulombs. {KG}',
    qs, 'C',
    'The angles are equal even though the charges are not: the electric force on each ball is the same (Newton’s third law) and the masses are equal. '
    + FBD_PAIR + RESOLVE +
    f'Step 1: r = 2L sinθ = 2 × 0.60 × sin9.0° = {sf(r)} m. '
    f'Step 2: Fe = mg tan9.0° = {sf(W)} × {sf(tan(th))} = {sf(Fe)} N. '
    f'Step 3: Fe = k(q)(3q)/r² = 3kq²/r², so q = r√(Fe/3k) = {sf(r)} × √({sf(Fe)} ÷ (3 × 9.0 × 10⁹)) = {sf(qs)} C, and the other ball carries 3q = {sf(3 * qs)} C. '
    f'Common mistake: writing F = kq²/r² as if both charges were q (giving {sf(q_wrong)} C), or adding the charges (q + 3q) instead of multiplying them.',
    marks=6, subtopic='Suspended charges: unequal charges, equal masses (find q)', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=9, theta2=9, threadLabel='0.60 m', angle1='9.0°', angle2='9.0°', sepLabel='',
                                         left=dict(mass='2.0 g', charge='q'), right=dict(mass='2.0 g', charge='3q'))),
    check=dict(L=L, m=m, theta=9.0))

# Q67 — unequal masses, equal charges, balls level: find θ2
m1, m2, th1 = 2.0e-3, 6.0e-3, radians(30)
Fe = m1 * g * tan(th1)
th2 = degrees(atan(Fe / (m2 * g)))
num('pair-unequal-masses-angle',
    'Two balls carrying equal charges hang from the same point on insulating threads whose lengths have been adjusted so that the balls hang LEVEL with each other, as shown. Ball 1 has mass 2.0 g and its thread makes 30° with the vertical. Ball 2 has mass 6.0 g. Calculate the angle ball 2’s thread makes with the vertical, in degrees.',
    th2, '°',
    'Because the balls are level, the line joining them — and so the electric force — is horizontal on both. By Newton’s third law that force has the same size Fe on each ball. '
    + FBD_PAIR + 'For each ball Fe = mg tanθ. '
    f'Step 1: ball 1 gives Fe = m₁g tan30° = 2.0 × 10⁻³ × 9.8 × {sf(tan(th1))} = {sf(Fe)} N. '
    f'Step 2: the same Fe acts on ball 2: tanθ₂ = Fe/(m₂g) = {sf(Fe)} ÷ ({sf(m2 * g)}) = {sf(Fe / (m2 * g))}, so θ₂ = {deg(th2)}. '
    f'Shortcut: equal Fe means m₁ tanθ₁ = m₂ tanθ₂, so tanθ₂ = tan30° ÷ 3. g cancels, so its value does not matter. '
    f'Common mistake: dividing the ANGLE by 3 (30° ÷ 3 = 10°). It is tanθ that scales with 1/m, not θ. Another is thinking the heavier ball feels a smaller electric force — it feels the same force, it is just harder to push sideways.',
    marks=5, subtopic='Suspended charges: unequal masses, equal charges (find θ)', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=30, theta2=th2, level=True, threadLabel='', angle1='30°', angle2='θ₂', sepLabel='',
                                         left=dict(mass='2.0 g', charge='q'), right=dict(mass='6.0 g', charge='q'))),
    check=dict(m1=m1, m2=m2, theta1=30))

# Q68 — inverse problem with the small-angle approximation
qq, m, L = 20e-9, 1.0e-3, 0.80
xa = x_small_angle(qq**2, m, L)
tex = theta_exact(qq**2, m, L)
xe = 2 * L * sin(tex)
tha = degrees(xa / (2 * L))
num('pair-small-angle-x',
    f'Two identical balls, each of mass 1.0 g and carrying +20 nC, hang from the same point on threads 0.80 m long. Using the small-angle approximation sinθ ≈ tanθ ≈ x/2L, where x is the separation of the balls, show that x³ = 2kq²L/(mg), and calculate x in metres. State why the approximation is justified. {KG}',
    xa, 'm',
    FBD_PAIR + RESOLVE +
    'Step 1 (exact condition): with r = x = 2L sinθ, kq²/x² = mg tanθ. '
    'Step 2 (approximation): for a small angle tanθ ≈ sinθ = x/2L, so kq²/x² = mg x/(2L), which rearranges to x³ = 2kq²L/(mg). '
    f'Step 3: x³ = 2 × 9.0 × 10⁹ × (20 × 10⁻⁹)² × 0.80 ÷ (1.0 × 10⁻³ × 9.8) = {sf(xa**3)} m³, so x = {sf(xa)} m. '
    f'Step 4 (justify): θ ≈ x/2L = {sf(xa / (2 * L))} rad ≈ {deg(tha, 2)}. At this angle tanθ and sinθ differ by only {sf((1 / cos(radians(tha)) - 1) * 100, 1)}%, so the approximation is excellent. Solving the exact equation numerically gives x = {sf(xe, 4)} m, the same to 3 s.f. '
    'Common mistake: taking the square root instead of the cube root at the end — x appears on both sides, giving x³, not x². Another is using the thread length L as the separation.',
    marks=6, difficulty=5, subtopic='Suspended charges: inverse problem (small-angle approximation)', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=tha, theta2=tha, threadLabel='0.80 m', angle1='θ', angle2='θ', sepLabel='x = ?',
                                         left=dict(mass='1.0 g', charge='+20 nC'), right=dict(mass='1.0 g', charge='+20 nC'))),
    check=dict(q=qq, m=m, L=L, exact_x=xe))

# Q69 — is the approximation valid? (MCQ)
qq, m, L = 0.20e-6, 2.0e-3, 0.15
xa = x_small_angle(qq**2, m, L)
th_impl = degrees(asin(xa / (2 * L)))
tex = theta_exact(qq**2, m, L)
xe = 2 * L * sin(tex)
ratio = (1 / cos(radians(th_impl)) - 1) * 100
mcq('pair-approx-validity',
    f'Two identical 2.0 g balls, each carrying +0.20 µC, hang from one point on threads 0.15 m long. A student uses x³ = 2kq²L/(mg) and gets a separation of {sf(xa * 100)} cm. Which judgement of the student’s method is correct? {KG}',
    ['The approximation is valid, because the separation is smaller than the thread length',
     f'The approximation is not valid: x/2L implies θ ≈ {deg(th_impl, 2)}, where tanθ is about {sf(ratio, 2)}% bigger than sinθ, so the true separation is noticeably smaller — about {sf(xe * 100)} cm',
     'The approximation is valid for any angle below 45°, because tanθ and sinθ are equal until then',
     'The approximation is not valid, because the separation can never be more than the thread length L'],
    1,
    FBD_PAIR + 'The exact balance is Fe = mg tanθ with Fe = kq²/(2L sinθ)², and the approximation replaces tanθ by sinθ = x/2L. '
    f'Check an approximation by putting its answer back in. Step 1: x = {sf(xa * 100)} cm means sinθ = x/2L = {sf(xa / (2 * L))}, so θ ≈ {deg(th_impl, 2)}. '
    f'Step 2: at that angle tanθ = {sf(tan(radians(th_impl)))} but sinθ = {sf(sin(radians(th_impl)))} — they differ by about {sf(ratio, 2)}%, so “sinθ ≈ tanθ” is not a fair assumption. '
    f'Step 3: solving kq²/(2L sinθ)² = mg tanθ exactly (by trial and improvement, or numerically) gives θ = {deg(degrees(tex))} and x = {sf(xe * 100)} cm. The approximation over-estimates x by {sf((xa / xe - 1) * 100, 2)}%. '
    'A useful rule of thumb: below about 10° the error is under 1%. Option D is false — the separation can be up to 2L. '
    'Common mistake: judging an approximation by whether the ANSWER looks reasonable instead of checking the angle it implies.',
    marks=4, difficulty=5, subtopic='Suspended charges: testing the small-angle approximation', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=degrees(tex), theta2=degrees(tex), threadLabel='0.15 m', angle1='θ', angle2='θ', sepLabel='x',
                                         left=dict(mass='2.0 g', charge='+0.20 µC'), right=dict(mass='2.0 g', charge='+0.20 µC'))),
    check=dict(q=qq, m=m, L=L, xa=xa, xe=xe))

# Q70 — charge sharing by touching each other
qa0, qb0, L, m = 60e-9, 20e-9, 0.50, 1.2e-3
t0 = theta_exact(qa0 * qb0, m, L)
x0 = 2 * L * sin(t0)
qs = (qa0 + qb0) / 2
t1 = theta_exact(qs * qs, m, L)
x1 = 2 * L * sin(t1)
x1a = x_small_angle(qs * qs, m, L)
num('pair-touch-share',
    f'Two identical small conducting balls of mass 1.2 g hang from the same point on insulating threads 0.50 m long. Ball A carries +60 nC and ball B carries +20 nC. The balls are brought together so that they touch, then released. Calculate their new separation in equilibrium, in metres. {KG}',
    x1, 'm',
    f'Step 1 (charge sharing): identical conductors share the total charge equally: (60 + 20) ÷ 2 = 40 nC each. Charge is conserved — the total is still 80 nC. '
    f'Step 2: the product q₁q₂ goes from 60 × 20 = 1200 to 40 × 40 = 1600 (nC)², up by a factor 4/3, so the balls end up FURTHER apart even though no charge was added. '
    + FBD_PAIR + 'In equilibrium kq²/x² = mg tanθ with x = 2L sinθ. '
    f'Step 3 (small angles, tanθ ≈ x/2L): x³ = 2kq²L/(mg) = 2 × 9.0 × 10⁹ × (40 × 10⁻⁹)² × 0.50 ÷ (1.2 × 10⁻³ × 9.8), so x = {sf(x1a)} m. '
    f'Step 4 (check): θ ≈ x/2L = {sf(x1a / (2 * L))} rad ≈ {deg(degrees(x1a / (2 * L)), 2)}, small, so the approximation holds — the exact solution is x = {sf(x1, 4)} m (before touching it was {sf(x0)} m). '
    'Common mistake: assuming the separation cannot change because the TOTAL charge is unchanged. The force depends on the product of the charges, which is largest when the charge is shared equally.',
    marks=6, difficulty=5, subtopic='Suspended charges: charge sharing on contact', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=degrees(t0), theta2=degrees(t0), threadLabel='0.50 m', angle1='', angle2='', sepLabel='',
                                         left=dict(mass='1.2 g', charge='A: +60 nC'), right=dict(mass='1.2 g', charge='B: +20 nC'))),
    check=dict(qa=qa0, qb=qb0, L=L, m=m))

# Q71 — one ball touched with an identical neutral ball
th0 = radians(12)
c0 = sin(th0) ** 2 * tan(th0)
t_new = brentq(lambda t: sin(t) ** 2 * tan(t) - 0.5 * c0, 1e-9, th0)
t_approx = degrees(asin(0.5 ** (1 / 3) * sin(th0)))
num('pair-neutral-touch',
    'Two identical balls carrying equal charges hang from the same point on threads 0.30 m long, each thread at 12° to the vertical. Ball A is touched with an identical uncharged ball, which is then taken away. Calculate the new angle each thread makes with the vertical, in degrees. (The masses and charges are not needed.)',
    degrees(t_new), '°',
    'Step 1 (charge sharing): A shares its charge equally with the identical neutral ball, so A keeps q/2 while B keeps q. The product q₁q₂ halves. Both balls still feel equal forces (Newton’s third law), so the angles stay equal. '
    + FBD_PAIR +
    'Step 2: with x = 2L sinθ, the balance kq₁q₂/x² = mg tanθ becomes kq₁q₂ = 4L²mg sin²θ tanθ. Everything except q₁q₂ is fixed, so sin²θ tanθ is proportional to q₁q₂. '
    f'Step 3: sin²θ tanθ must halve: before it was sin²12° × tan12° = {sf(c0)}, now it must be {sf(c0 / 2)}. Trial and improvement (or a calculator solver) gives θ = {deg(degrees(t_new))}. '
    f'Small-angle check: x ∝ (q₁q₂)^⅓, so sinθ falls by a factor of 0.5^⅓ = {sf(0.5 ** (1 / 3))}, giving {deg(t_approx)} — the same to 3 s.f. '
    'Common mistake: halving the angle (6°) or the separation. Halving q₁q₂ does not halve the force in the end, because the balls move closer and the force grows back.',
    marks=6, difficulty=5, subtopic='Suspended charges: touched with a neutral ball', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=12, theta2=12, threadLabel='0.30 m', angle1='12°', angle2='12°', sepLabel='',
                                         left=dict(mass='', charge='A: q'), right=dict(mass='', charge='B: q'))),
    check=dict(theta0=12))

# Q72 — doubling both charges: does r double? (MCQ)
f2 = 4 ** (1 / 3)
mcq('pair-double-both-trap',
    'Two identical charged balls hang from the same point on long threads, with a small angle between the threads. The charge on EACH ball is doubled. A student says: “Coulomb’s law gives four times the force, so the balls end up twice as far apart.” What actually happens to the separation?',
    ['It doubles, as the student says',
     'It becomes four times as large, because the force is four times as large',
     f'It increases by a factor of about {sf(f2)}: as the balls move apart the force falls again, and the new balance (x³ ∝ q₁q₂) gives 4^⅓',
     'It does not change, because the tension increases to balance the bigger force'],
    2,
    'The trap is treating r as fixed. Free-body diagram: mg down, T along the thread, Fe = kq₁q₂/x² horizontal. The balance is Fe = mg tanθ ≈ mg x/2L for small angles. '
    'Step 1: substitute Fe: kq₁q₂/x² = mg x/2L, so x³ = 2kq₁q₂L/(mg) — x is proportional to the CUBE ROOT of q₁q₂. '
    f'Step 2: doubling both charges multiplies q₁q₂ by 4, so x grows by 4^⅓ = {sf(f2)}, not 2. '
    f'Step 3: the force ends up only {sf(f2)} times bigger too (F ≈ mg x/2L), not 4 times — moving apart has weakened it. '
    'The student’s “double” is wrong twice over: 4× force would not double x even at fixed angle, because F ∝ 1/x². '
    'Common mistake: applying F ∝ q₁q₂ while forgetting that x — and the angle — change until a new equilibrium is reached.',
    marks=4, difficulty=5, subtopic='Suspended charges: doubling reasoning (separation)', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=7, theta2=7, threadLabel='L', angle1='', angle2='', sepLabel='x',
                                         left=dict(mass='m', charge='q → 2q'), right=dict(mass='m', charge='q → 2q'))))

# Q73 — doubling one charge: what happens to the force? (MCQ)
f1 = 2 ** (1 / 3)
mcq('pair-double-one-force',
    'Two identical charged balls hang from the same point, with a small angle between the threads. The charge on ONE ball is doubled and they settle in a new equilibrium. By what factor has the electric force between them changed?',
    ['×4, because force is proportional to charge squared',
     '×2, because force is proportional to the product of the charges',
     f'×{sf(f1)} (2^⅓), because the balls move apart until the weaker force at the new separation balances again',
     '×1, the force cannot change because the masses have not changed'],
    2,
    'Free-body diagram for either ball: mg down, T along the thread, Fe horizontal. In equilibrium Fe = mg tanθ, and for small angles tanθ ≈ x/2L, so Fe ≈ mg x/2L — the force is proportional to the separation. '
    'Step 1: from kq₁q₂/x² = mg x/2L, x³ ∝ q₁q₂. Doubling one charge doubles q₁q₂, so x grows by 2^⅓. '
    f'Step 2: Fe ∝ x, so the force also grows by 2^⅓ = {sf(f1)} — not by 2. Had the separation been held fixed, the force would have doubled, but here the balls are free to move. '
    'Option D confuses “equilibrium” with “unchanged”: the weight is unchanged but the angle, the tension and the electric force all increase. '
    'Common mistake: using F ∝ q₁q₂ on its own when the separation is not held fixed.',
    marks=4, difficulty=5, subtopic='Suspended charges: doubling reasoning (force)', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=7, theta2=7, threadLabel='L', angle1='', angle2='', sepLabel='x',
                                         left=dict(mass='m', charge='q → 2q'), right=dict(mass='m', charge='q'))))

# ════════════════════════════════════════════════════════════════════════
# C. Vertical arrangement and uniform field
# ════════════════════════════════════════════════════════════════════════

# Q74 — tension with a charge fixed below
m, qt, qb, r = 5.0e-3, 40e-9, 40e-9, 0.050
W = m * g
F = k * qt * qb / r**2
T_like, T_unlike = W - F, W + F
num('vertical-tension',
    f'A small ball of mass 5.0 g carrying +40 nC hangs at rest on an insulating thread. A second charged ball is fixed directly below it, with their centres 5.0 cm apart, as shown. Calculate the tension in the thread (a) when the lower ball carries +40 nC and (b) when it carries −40 nC. Enter your answer to (b), in newtons. {KG}',
    T_unlike, 'N',
    'Free-body diagram: every force is vertical here — weight mg down, tension T up, and the electric force Fe either up (repulsion from below) or down (attraction towards the ball below). '
    f'Step 1: mg = 5.0 × 10⁻³ × 9.8 = {sf(W)} N. Fe = kq₁q₂/r² = 9.0 × 10⁹ × (40 × 10⁻⁹)² ÷ 0.050² = {sf(F)} N, the same size in both cases. '
    f'Step 2 (a): like charges REPEL, so Fe pushes the hanging ball up and helps the thread: T + Fe = mg, T = {sf(W)} − {sf(F)} = {sf(T_like)} N. '
    f'Step 3 (b): unlike charges ATTRACT, so Fe pulls down along with the weight: T = mg + Fe = {sf(W)} + {sf(F)} = {sf(T_unlike)} N. '
    'Common mistake: always adding Fe to the weight. Decide the direction from the signs first: a like charge below pushes UP, an unlike charge below pulls DOWN.',
    marks=5, subtopic='Suspended charges: vertical arrangement (tension)', suspended=True,
    figure=dict(kind='vertical', props=dict(hangMass='5.0 g', hangCharge='+40 nC', fixedCharge='+40 nC or −40 nC', sepLabel='5.0 cm')),
    check=dict(m=m, q=qt, r=r))

# Q75 — levitation: T = 0
m, Q, r = 2.0e-3, 0.15e-6, 0.040
W = m * g
qL = W * r**2 / (k * Q)
num('vertical-levitation',
    f'A 2.0 g ball hangs on an insulating thread directly above a small sphere fixed on an insulating stand. The sphere carries +0.15 µC and the centres are 4.0 cm apart, as shown. What charge must the hanging ball carry for the tension in the thread to fall to zero? Give the magnitude in coulombs and state its sign. {KG}',
    qL, 'C',
    'Free-body diagram: weight mg down, tension T up, electric force Fe vertical. T = 0 means Fe alone holds the ball up, so Fe must point UP — a repulsion — and the ball’s charge must be POSITIVE, like the sphere’s. '
    f'Step 1: mg = 2.0 × 10⁻³ × 9.8 = {sf(W)} N. At T = 0, Fe = mg. '
    f'Step 2: kqQ/r² = mg, so q = mg r²/(kQ) = {sf(W)} × 0.040² ÷ (9.0 × 10⁹ × 0.15 × 10⁻⁶) = {sf(qL)} C (about {sf(qL * 1e9)} nC), positive. '
    'Step 3 (evaluate): vertically this balance is stable — if the ball drops a little, r falls and Fe rises, pushing it back. Sideways it is not: once the thread is slack, a small nudge lets the repulsion push the ball off to one side. That is why the thread is needed. '
    'Common mistake: giving a negative charge. An attraction from below would pull the ball DOWN and increase the tension.',
    marks=5, subtopic='Suspended charges: vertical arrangement (levitation)', suspended=True,
    figure=dict(kind='vertical', props=dict(hangMass='2.0 g', hangCharge='q = ?', fixedCharge='+0.15 µC', sepLabel='4.0 cm')),
    check=dict(m=m, Q=Q, r=r))

# Q76 — uniform horizontal field: find q
m, th, E = 0.80e-3, radians(14), 2.5e4
W = m * g
qF = W * tan(th) / E
num('field-find-q',
    f'A 0.80 g ball hangs on an insulating thread in a uniform horizontal electric field of strength 2.5 × 10⁴ N/C. The ball comes to rest with its thread at 14° to the vertical, displaced in the direction of the field, as shown. Calculate the charge on the ball, in coulombs, and state its sign. Take g = 9.8 N/kg.',
    qF, 'C',
    'Free-body diagram: weight mg down, tension T along the thread, and the electric force Fe = qE horizontal (along the field lines). This is the same force triangle as a ball repelled by a fixed charge, but here the horizontal force does not depend on distance — the field is uniform. '
    + RESOLVE +
    f'Step 1: mg = 0.80 × 10⁻³ × 9.8 = {sf(W)} N, so Fe = {sf(W)} × tan14° = {sf(W * tan(th))} N. '
    f'Step 2: Fe = qE, so q = Fe/E = {sf(W * tan(th))} ÷ 2.5 × 10⁴ = {sf(qF)} C. '
    'The ball is pushed IN the direction of the field, so the charge is positive. '
    'Common mistake: trying to use F = kq₁q₂/r² — there is no second point charge and no distance in a uniform field. F = qE links the force to the charge directly.',
    marks=5, subtopic='Suspended charges: uniform horizontal field (F = qE)', suspended=True,
    figure=dict(kind='field', props=dict(theta=14, angleLabel='14°', fieldLabel='E = 2.5 × 10⁴ N/C', hangMass='0.80 g', hangCharge='q = ?')),
    check=dict(m=m, theta=14, E=E))

# Q77 — data analysis: F against 1/r²
m = 0.60e-3
kqq_true = k * (20e-9) ** 2
rs_cm = [3.0, 4.0, 5.0, 6.0, 8.0]
angles = [round(degrees(atan(kqq_true / (r / 100) ** 2 / (m * g))) * 2) / 2 for r in rs_cm]  # read to ±0.5°
W = m * g
Fs = [W * tan(radians(a)) for a in angles]
xs = [1 / (r / 100) ** 2 for r in rs_cm]
grad = sum(x * y for x, y in zip(xs, Fs)) / sum(x * x for x in xs)  # best line through the origin
q_est = sqrt(grad / k)
rows = [[f'{r:.1f}', f'{a:.1f}', sf(F), sf(x)] for r, a, F, x in zip(rs_cm, angles, Fs, xs)]
num('fixed-data-analysis',
    f'In an experiment to test Coulomb’s law, a 0.60 g charged ball hangs on an insulating thread and an identical charged ball on an insulating rod is held level with it at different separations r. The table shows r and the thread angle θ. (a) Calculate the electric force F for each reading. (b) Plot F against 1/r². (c) Find the gradient of the best straight line through the origin, in N·m², and state what it represents. (d) Suggest two sources of error and one improvement. Enter your gradient. {KG}',
    grad, 'N·m²',
    'Free-body diagram for the hanging ball (each reading): weight mg down, tension T along the thread, electric force Fe horizontal, away from the fixed ball. Balancing components (T sinθ = Fe, T cosθ = mg) gives Fe = mg tanθ, written F below. '
    f'(a) mg = 0.60 × 10⁻³ × 9.8 = {sf(W)} N, so F = {sf(W)} × tanθ: ' + ', '.join(f'{r:.1f} cm → {sf(F)} N' for r, F in zip(rs_cm, Fs)) + '. '
    '(b) Plotting F (y) against 1/r² (x): ' + ', '.join(f'({sf(x)} m⁻², {sf(F)} N)' for x, F in zip(xs, Fs)) + ' — the points lie close to a straight line through the origin, so F ∝ 1/r², as Coulomb’s law predicts. '
    f'(c) The best line through the origin has gradient {sf(grad)} N·m². Since F = (kq₁q₂)(1/r²), the gradient is kq₁q₂. For equal charges q = √(gradient/k) = {sf(q_est)} C, about {sf(q_est * 1e9, 2)} nC each. '
    '(d) Sources of error: air currents make the ball swing, so θ is hard to read to better than ±0.5° (a large fractional error at the smallest angles), charge leaks away into humid air during the experiment so later readings are too small, and r is measured between centres that are hard to locate. Improvements: shield the apparatus in a draught-proof box, work quickly in dry air (or recharge before each reading), and read θ and r from a photograph against a scale. '
    'Common mistake: plotting F against r (a curve) or against 1/r (not straight), or reading the gradient as k alone — it is kq₁q₂.',
    marks=8, difficulty=5, subtopic='Suspended charges: data analysis (F against 1/r²)', suspended=True,
    figure=dict(kind='table', props=dict(title='Readings (mass of hanging ball 0.60 g)',
                                          columns=['r / cm', 'θ / °'], rows=[[a, b] for a, b, _, _ in rows])),
    check=dict(m=m, r_cm=rs_cm, angles=angles))

# Q78 — MCQ with the classic mistakes
L, m, th = 0.20, 1.0e-3, radians(35)
W = m * g
r_ok = 2 * L * sin(th)
q_ok = r_ok * sqrt(W * tan(th) / k)
q_half = (L * sin(th)) * sqrt(W * tan(th) / k)
q_L = L * sqrt(W * tan(th) / k)
q_sin = r_ok * sqrt(W * sin(th) / k)
mcq('pair-mcq-mistakes',
    f'Two identical 1.0 g balls with equal charges hang from one point on threads 0.20 m long. Each thread makes 35° with the vertical, as shown. What is the charge on each ball? {KG}',
    [f'{sf(q_half)} C', f'{sf(q_L)} C', f'{sf(q_sin)} C', f'{sf(q_ok)} C'],
    3,
    FBD_PAIR + RESOLVE +
    f'Step 1: r = 2L sinθ = 2 × 0.20 × sin35° = {sf(r_ok)} m. Step 2: Fe = mg tan35° = {sf(W)} × {sf(tan(th))} = {sf(W * tan(th))} N. '
    f'Step 3: q = r√(Fe/k) = {sf(q_ok)} C. '
    f'Where the other options come from: {sf(q_half)} C uses r = L sinθ (one ball to the vertical, half the gap), {sf(q_L)} C uses the thread length as the separation, and {sf(q_sin)} C uses Fe = mg sinθ instead of mg tanθ. '
    'Common mistake: any of those three — draw the geometry and the force triangle before substituting.',
    marks=4, subtopic='Suspended charges: multiple choice on common slips', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=35, theta2=35, threadLabel='0.20 m', angle1='35°', angle2='35°', sepLabel='',
                                         left=dict(mass='1.0 g', charge='q'), right=dict(mass='1.0 g', charge='q'))),
    check=dict(L=L, m=m, theta=35))

# ════════════════════════════════════════════════════════════════════════
# D. Extended responses on suspended set-ups (8–10 marks)
# ════════════════════════════════════════════════════════════════════════

# Q79 — the full inverse problem, solved exactly
L, m, qq = 0.20, 1.0e-3, 0.15e-6
tex = theta_exact(qq**2, m, L)
xa = x_small_angle(qq**2, m, L)
xe = 2 * L * sin(tex)
Te = m * g / cos(tex)
lhs = lambda d: k * qq**2 / (4 * L * L * sin(radians(d)) ** 2) - m * g * tan(radians(d))
lo = int(degrees(tex))
num('extended-exact-separation',
    f'Two identical balls, each of mass 1.0 g and carrying +0.15 µC, hang from the same point on insulating threads 0.20 m long. (a) Draw a free-body diagram for one ball and explain why the two threads make equal angles θ with the vertical. (b) Show that kq²/(4L² sin²θ) = mg tanθ. (c) Use the small-angle approximation to estimate the separation x of the balls. (d) Solve the equation in (b) by trial and improvement, use it to find the true separation to 3 significant figures, and evaluate the approximation in (c). Enter your answer to (d), in metres. {KG}',
    xe, 'm',
    '(a) ' + FBD_PAIR + 'The balls have equal masses, and the electric force on each has the same size (Newton’s third law), so the two force diagrams are mirror images and the angles are equal. '
    '(b) Horizontally T sinθ = Fe and vertically T cosθ = mg, so Fe = mg tanθ. The separation is r = 2L sinθ, so Fe = kq²/(2L sinθ)² = kq²/(4L² sin²θ) and therefore kq²/(4L² sin²θ) = mg tanθ. '
    f'(c) With sinθ ≈ tanθ ≈ x/2L: x³ = 2kq²L/(mg) = {sf(xa**3)} m³, so x ≈ {sf(xa)} m, which implies sinθ = x/2L = {sf(xa / (2 * L))} and θ ≈ {deg(degrees(asin(xa / (2 * L))))} — not a small angle. '
    f'(d) Left side minus right side at θ = {lo}°: {sf(lhs(lo))} N (positive: the electric force is still bigger than mg tanθ), at {lo + 1}°: {sf(lhs(lo + 1))} N (negative), so θ lies between. Narrowing down gives θ = {deg(degrees(tex))}, so x = 2L sinθ = 2 × 0.20 × sin{sf(degrees(tex))}° = {sf(xe)} m (and T = mg/cosθ = {sf(Te)} N). '
    f'The approximation over-estimates x by {sf((xa / xe - 1) * 100, 2)}%: at about {sf(degrees(tex), 2)}° tanθ is already {sf((1 / cos(tex) - 1) * 100, 2)}% bigger than sinθ. It is fine for a first estimate (and a good starting point for the trial and improvement) but not for an answer to 3 s.f. '
    'Common mistake: in (b), writing r = L sinθ or r = L. In (d), stopping at the small-angle value — this part asks for the exact solution.',
    marks=9, difficulty=5, subtopic='Extended: inverse problem, exact vs small-angle', suspended=True, tolerance=0.02,
    figure=dict(kind='pair', props=dict(theta1=degrees(tex), theta2=degrees(tex), threadLabel='0.20 m', angle1='θ', angle2='θ', sepLabel='x',
                                         left=dict(mass='1.0 g', charge='+0.15 µC'), right=dict(mass='1.0 g', charge='+0.15 µC'))),
    check=dict(L=L, m=m, q=qq, approx_x=xa))

# Q80 — field pendulum extended: E, T, then doubling E
m, qq, th = 1.2e-3, 45e-9, radians(18)
W = m * g
E = W * tan(th) / qq
T = W / cos(th)
th2 = degrees(atan(2 * tan(th)))
T2 = sqrt(W**2 + (2 * qq * E) ** 2)
num('extended-field-double',
    f'A 1.2 g ball carrying +45 nC hangs on an insulating thread between two vertical charged plates, which produce a uniform horizontal electric field. The thread makes 18° with the vertical. (a) Draw and label the free-body diagram. (b) Calculate the field strength E. (c) Calculate the tension in the thread. (d) The field strength is doubled. A student predicts the angle will double to 36°. Evaluate this prediction by calculating the new angle. Enter your answer to (d), in degrees. Take g = 9.8 N/kg.',
    th2, '°',
    '(a) Free-body diagram: weight mg vertically down, tension T along the thread, electric force Fe = qE horizontal, towards the negative plate (the ball is positive). '
    f'(b) Fe = mg tan18° = 1.2 × 10⁻³ × 9.8 × {sf(tan(th))} = {sf(W * tan(th))} N, so E = Fe/q = {sf(W * tan(th))} ÷ 45 × 10⁻⁹ = {sf(E)} N/C. '
    f'(c) T = mg/cos18° = {sf(W)} ÷ {sf(cos(th))} = {sf(T)} N (or √((mg)² + Fe²), the same). '
    f'(d) Doubling E doubles Fe (the field is uniform, so the force does not depend on where the ball ends up). Then tanθ doubles: tanθ = 2 × {sf(tan(th))} = {sf(2 * tan(th))}, so θ = {deg(th2)}, not 36°. The prediction is wrong because θ is not proportional to Fe — tanθ is. (The new tension is {sf(T2)} N.) '
    'Common mistake: doubling the angle, or assuming the force changes as the ball moves, which is true near a point charge but not in a uniform field.',
    marks=8, difficulty=5, subtopic='Extended: uniform field (find E, T, evaluate a prediction)', suspended=True,
    figure=dict(kind='field', props=dict(theta=18, angleLabel='18°', fieldLabel='uniform E', hangMass='1.2 g', hangCharge='+45 nC', plates=True)),
    check=dict(m=m, q=qq, theta=18))

# Q81 — leakage experiment extended
L, m, x0 = 0.50, 2.0e-3, 0.120
th0 = asin(x0 / (2 * L))
W = m * g
F0 = W * tan(th0)
q0 = x0 * sqrt(F0 / k)
t_half = theta_exact((q0 / 2) ** 2, m, L)
x_half = 2 * L * sin(t_half)
x_half_a = x0 * 0.25 ** (1 / 3)
x_meas = 0.068
th_m = asin(x_meas / (2 * L))
q_m = x_meas * sqrt(W * tan(th_m) / k)
num('extended-leakage',
    f'Two identical conducting balls of mass 2.0 g hang from one point on threads 0.50 m long and are given equal charges. Their centres settle 12.0 cm apart. (a) Calculate the charge on each ball. (b) Each ball is touched with an identical uncharged ball. Predict the new separation. (c) Ten minutes later the measured separation is 6.8 cm. Suggest why it is less than your prediction. (d) Estimate the charge left on each ball. Enter your answer to (b), in metres. {KG}',
    x_half, 'm',
    FBD_PAIR + RESOLVE +
    f'(a) sinθ = (x/2)/L = 0.060 ÷ 0.50 = 0.12, θ = {deg(degrees(th0))}. Fe = mg tanθ = {sf(W)} × {sf(tan(th0))} = {sf(F0)} N, and q = x√(Fe/k) = 0.120 × √({sf(F0)} ÷ 9.0 × 10⁹) = {sf(q0)} C. '
    f'(b) Each ball keeps q/2, so q₁q₂ falls to a quarter. For small angles x³ ∝ q₁q₂, so x = 12.0 cm × (1/4)^⅓ = {sf(x_half_a * 100)} cm. Solving the exact balance kq²/(2L sinθ)² = mg tanθ with q = {sf(q0 / 2)} C gives x = {sf(x_half)} m — the angle is small, so the two agree. '
    '(c) The balls lose charge to the air (leakage, faster when the air is humid) and through the threads and supports if they are not perfect insulators, so the force — and the separation — keep falling. '
    f'(d) With x = 6.8 cm: sinθ = 0.034 ÷ 0.50, θ = {deg(degrees(th_m))}, Fe = mg tanθ = {sf(W * tan(th_m))} N, so q = 0.068 × √(Fe/k) = {sf(q_m)} C each — {sf(q_m / (q0 / 2) * 100, 2)}% of the charge they had straight after being touched. '
    'Common mistake: in (b), halving the separation (because the charge halved) or quartering it (because the force quartered). x ∝ (q₁q₂)^⅓ for small angles.',
    marks=9, difficulty=5, subtopic='Extended: charge sharing and leakage (evaluate)', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=degrees(th0), theta2=degrees(th0), threadLabel='0.50 m', angle1='', angle2='', sepLabel='12.0 cm',
                                         left=dict(mass='2.0 g', charge='q'), right=dict(mass='2.0 g', charge='q'))),
    check=dict(L=L, m=m, x0=x0, x_meas=x_meas))

# Q82 — unequal masses extended
m1, th1, th2, x = 3.0e-3, radians(24), radians(15), 0.060
Fe = m1 * g * tan(th1)
m2 = m1 * tan(th1) / tan(th2)
qq = x * sqrt(Fe / k)
T2 = m2 * g / cos(th2)
num('extended-unequal-masses',
    f'Two small balls carrying equal charges hang from the same point. Their thread lengths are adjusted so that the balls hang level, 6.0 cm apart. The lighter ball (3.0 g) hangs at 24° to the vertical and the heavier one at 15°. (a) Explain why the electric force on each ball has the same size, even though the angles differ. (b) Show that m₁ tanθ₁ = m₂ tanθ₂ and calculate the mass of the heavier ball. (c) Calculate the charge on each ball. (d) Calculate the tension in the heavier ball’s thread. Enter your answer to (b), in kilograms. {KG}',
    m2, 'kg',
    '(a) The two balls exert forces on each other — one interaction, so by Newton’s third law the forces are equal and opposite. Because the balls are level, both forces are horizontal. '
    'Free-body diagram for each ball: mg down, T along its thread, Fe horizontal and away from the other ball. '
    f'(b) For each ball Fe = mg tanθ. The same Fe acts on both, so m₁g tanθ₁ = m₂g tanθ₂ and m₁ tanθ₁ = m₂ tanθ₂. Then m₂ = 3.0 g × tan24° ÷ tan15° = 3.0 × {sf(tan(th1))} ÷ {sf(tan(th2))} = {sf(m2 * 1000)} g = {sf(m2)} kg. '
    f'(c) Fe = m₁g tan24° = 3.0 × 10⁻³ × 9.8 × {sf(tan(th1))} = {sf(Fe)} N. With equal charges Fe = kq²/r², so q = 0.060 × √({sf(Fe)} ÷ 9.0 × 10⁹) = {sf(qq)} C. '
    f'(d) T₂ = m₂g/cos15° = {sf(m2 * g)} ÷ {sf(cos(th2))} = {sf(T2)} N (check: √((m₂g)² + Fe²) gives the same). '
    'Common mistake: assuming the heavier ball feels the smaller electric force. The forces are equal — the heavier ball simply needs a bigger sideways force to reach the same angle, so it hangs closer to the vertical. Note also that m ∝ 1/tanθ, not 1/θ.',
    marks=10, difficulty=5, subtopic='Extended: unequal masses (N3, mass ratio, q, T)', suspended=True,
    figure=dict(kind='pair', props=dict(theta1=24, theta2=15, level=True, threadLabel='', angle1='24°', angle2='15°', sepLabel='6.0 cm',
                                         left=dict(mass='3.0 g', charge='q'), right=dict(mass='m₂ = ?', charge='q'))),
    check=dict(m1=m1, theta1=24, theta2=15, x=x))

# ════════════════════════════════════════════════════════════════════════
# E. Other hard types
# ════════════════════════════════════════════════════════════════════════

# Q83 — three collinear charges: net force on the middle one
qA, qB, qC = 4.0e-6, -1.0e-6, 2.0e-6
xA, xB, xC = 0.0, 0.30, 0.10
FA = k * qA * qC / (xC - xA) ** 2
FB = k * abs(qB) * qC / (xB - xC) ** 2
Fnet = FA + FB
num('line-middle-net',
    f'Charge qA = +4.0 µC is at x = 0 and qB = −1.0 µC is at x = 30 cm. A third charge qC = +2.0 µC is placed between them at x = 10 cm, as shown. Calculate the magnitude of the net electrostatic force on qC, in newtons, and give its direction. {K}.',
    Fnet, 'N',
    f'Take +x to the right and treat each pair separately. '
    f'Step 1: qA and qC are both positive, so qA REPELS qC — to the right (+x): F = 9.0 × 10⁹ × 4.0 × 10⁻⁶ × 2.0 × 10⁻⁶ ÷ 0.10² = {sf(FA)} N. '
    f'Step 2: qB is negative, so qB ATTRACTS qC — towards qB, also to the right: F = 9.0 × 10⁹ × 1.0 × 10⁻⁶ × 2.0 × 10⁻⁶ ÷ 0.20² = {sf(FB)} N. '
    f'Step 3: both point the same way, so they ADD: {sf(FA)} + {sf(FB)} = {sf(Fnet)} N, towards qB (+x). '
    f'Common mistake: subtracting because the two charges are on opposite sides of qC. Work out each direction from the signs — here repulsion from the left and attraction to the right both push qC right. Also use 0.20 m (not 0.30 m) for qB to qC.',
    marks=4, subtopic='Collinear charges: net force on the middle charge',
    figure=dict(kind='line', props=dict(charges=[dict(x=0, name='qA', value='+4.0 µC', sign='+'),
                                                 dict(x=10, name='qC', value='+2.0 µC', sign='+'),
                                                 dict(x=30, name='qB', value='−1.0 µC', sign='−')],
                                        span=[-5, 40], dims=[[0, 10, '10 cm'], [10, 30, '20 cm']])),
    check=dict(qA=qA, qB=qB, qC=qC))

# Q84 — zero-force position: quadratic, reject a root
a, b, c = 4 - 1, -2 * 4 * 0.30, 4 * 0.30**2  # 4(x − 0.3)² = x²  →  3x² − 2.4x + 0.36 = 0
disc = b * b - 4 * a * c
roots = sorted([(-b - sqrt(disc)) / (2 * a), (-b + sqrt(disc)) / (2 * a)])
x0 = roots[1]
num('line-zero-point',
    'Charge qA = +4.0 µC is fixed at x = 0 and qB = −1.0 µC is fixed at x = 0.30 m. At what position x would a third charge feel zero net electrostatic force? Give x in metres, measured from qA.',
    x0, 'm',
    'Step 1 (where can it be?): between the charges, a test charge is pushed away from one and pulled towards the other — both forces point the same way, so they cannot cancel. To the left of qA it is always nearer the BIGGER charge, so qA’s force wins. The only possible region is to the right of qB, the smaller charge. '
    'Step 2: let the point be at x (> 0.30). The forces from qA and qB must have equal size: k(4.0 µC)q/x² = k(1.0 µC)q/(x − 0.30)². The test charge q and k cancel: 4(x − 0.30)² = x². '
    f'Step 3: expand: 4x² − 2.4x + 0.36 = x², so 3x² − 2.4x + 0.36 = 0. The quadratic formula gives x = (2.4 ± √({sf(disc)})) ÷ 6 = {sf(roots[0])} m or {sf(roots[1])} m. '
    f'Step 4 (reject): x = {sf(roots[0])} m is BETWEEN the charges, where the forces have equal size but point the same way — it is a root of the size equation, not a balance point. So x = {sf(x0)} m, 0.30 m beyond qB. '
    'Check: 4.0 ÷ 0.60² = 11.1 and 1.0 ÷ 0.30² = 11.1. The answer does not depend on the sign or size of the third charge. '
    'Common mistake: keeping both roots, or taking the square root of only one side when solving.',
    marks=6, difficulty=5, subtopic='Collinear charges: zero-force position (quadratic)',
    figure=dict(kind='line', props=dict(charges=[dict(x=0, name='qA', value='+4.0 µC', sign='+'),
                                                 dict(x=30, name='qB', value='−1.0 µC', sign='−')],
                                        span=[-10, 75], dims=[[0, 30, '0.30 m']], point=dict(x=60, label='P ?'))),
    check=dict(roots=roots))

# Q85 — equilibrium between two like charges
q1, q2, d = 2.0e-9, 8.0e-9, 0.90
xe = d / (1 + sqrt(q2 / q1))
num('line-between-like',
    'Two positive charges are fixed 0.90 m apart: q₁ = +2.0 nC at x = 0 and q₂ = +8.0 nC at x = 0.90 m. A small positive charge is placed on the line between them. At what distance from q₁ is the net force on it zero? Give your answer in metres.',
    xe, 'm',
    'Step 1 (where?): between two LIKE charges the test charge is pushed in opposite directions, so a balance point exists between them — nearer the SMALLER charge. '
    'Step 2: at distance x from q₁: kq₁q/x² = kq₂q/(0.90 − x)². Cancel k and q: 2.0/x² = 8.0/(0.90 − x)². '
    f'Step 3: both sides are positive squares, so take square roots: (0.90 − x)/x = √(8.0/2.0) = 2, giving 0.90 − x = 2x and x = {sf(xe)} m from q₁. (Squaring out would give a second root, x = −0.90 m, outside the charges where both forces point the same way — rejected.) '
    'Common mistake: placing the balance point nearer the bigger charge, or at the midpoint. The force falls with distance squared, so the point sits where the distances are in the ratio √q₁ : √q₂ = 1 : 2.',
    marks=4, subtopic='Equilibrium of a third charge between two fixed charges',
    figure=dict(kind='line', props=dict(charges=[dict(x=0, name='q₁', value='+2.0 nC', sign='+'),
                                                 dict(x=90, name='q₂', value='+8.0 nC', sign='+')],
                                        span=[-12, 102], dims=[[0, 90, '0.90 m']], point=dict(x=30, label='x = ?'))),
    check=dict(q1=q1, q2=q2, d=d))

# Q86 — charge needed for all three to be in equilibrium
q3 = -q2 * (xe / d) ** 2
num('line-three-equilibrium',
    'In the previous arrangement (q₁ = +2.0 nC at x = 0, q₂ = +8.0 nC at x = 0.90 m), the two outer charges are now free to move. What charge q₃, placed at the balance point 0.30 m from q₁, would keep ALL THREE charges in equilibrium? Give q₃ in coulombs, including its sign.',
    q3, 'C',
    'Step 1: q₃ is already balanced at x = 0.30 m whatever its value (k and q₃ cancelled in the previous question). Now q₁ and q₂ must also be balanced. '
    'Step 2 (sign): q₂ pushes q₁ to the left, so q₃ must PULL q₁ to the right — q₃ must be NEGATIVE. '
    f'Step 3 (size, balance on q₁): k|q₁q₃|/0.30² = kq₁q₂/0.90², so |q₃| = q₂ × (0.30/0.90)² = 8.0 nC × 1/9 = {sf(abs(q3) * 1e9)} nC. '
    f'Step 4 (check on q₂): attraction to q₃ = k × 8.0 × {sf(abs(q3) * 1e9)} ÷ 0.60² and repulsion from q₁ = k × 8.0 × 2.0 ÷ 0.90², both {sf(8 * abs(q3) * 1e9 / 0.36)} k (nC²/m²) — balanced. So q₃ = {sf(q3)} C. '
    'Common mistake: giving a positive q₃ (it would push q₁ and q₂ further apart), or using the distance 0.30 m for the q₁–q₂ pair instead of 0.90 m.',
    marks=5, difficulty=5, subtopic='Equilibrium of three charges (sign and size)', sign=True,
    figure=dict(kind='line', props=dict(charges=[dict(x=0, name='q₁', value='+2.0 nC', sign='+'),
                                                 dict(x=30, name='q₃', value='?', sign='?'),
                                                 dict(x=90, name='q₂', value='+8.0 nC', sign='+')],
                                        span=[-12, 102], dims=[[0, 30, '0.30 m'], [30, 90, '0.60 m']])),
    check=dict(q1=q1, q2=q2, d=d))

# Q87 — stability (MCQ)
mcq('line-stability',
    'A small POSITIVE charge sits at the balance point between two fixed positive charges (as in the previous two questions), where the net force on it is zero. Is this equilibrium stable?',
    ['Stable in every direction: whichever way it is nudged, it returns',
     'Stable for a nudge along the line joining the charges, but unstable for a nudge at right angles to that line',
     'Unstable along the line, but stable for a nudge at right angles to it',
     'Neutral: the net force stays zero everywhere near the balance point'],
    1,
    'Step 1 (along the line): nudge the charge towards q₁. It is now closer to q₁, whose repulsion grows, and further from q₂, whose repulsion falls, so the net force pushes it BACK — stable along the line. '
    'Step 2 (at right angles): nudge it slightly sideways. Both fixed charges repel it along lines that now point slightly AWAY from the axis, so their sideways components add and push it further out — unstable. '
    'So the equilibrium is stable in one direction only. (A negative charge at the same point would be the other way round: unstable along the line.) In fact no arrangement of fixed charges can hold a charge in stable equilibrium in every direction — this is Earnshaw’s theorem. '
    'Common mistake: checking only one direction of displacement, or assuming “zero force” means stable.',
    marks=4, difficulty=5, subtopic='Equilibrium of a third charge: stability',
    figure=dict(kind='line', props=dict(charges=[dict(x=0, name='q₁', value='+', sign='+'),
                                                 dict(x=30, name='', value='+q', sign='+', small=True),
                                                 dict(x=90, name='q₂', value='+', sign='+')],
                                        span=[-12, 102], dims=[])))

# Q88 — square, mixed signs: net force on one corner
a = 0.20
qA, qB, qC, qD = 3.0e-6, -2.0e-6, 4.0e-6, -1.0e-6
FB = k * qA * abs(qB) / a**2  # attract, +x
FD = k * qA * abs(qD) / a**2  # attract, −y
FC = k * qA * qC / (2 * a * a)  # repel, along C→A = (−1, +1)/√2
Fx = FB - FC / sqrt(2)
Fy = -FD + FC / sqrt(2)
Fsq = sqrt(Fx**2 + Fy**2)
ang = degrees(atan2(Fy, Fx))
num('square-mixed',
    f'Four charges sit at the corners of a square of side 0.20 m, as shown: qA = +3.0 µC (top left), qB = −2.0 µC (top right), qC = +4.0 µC (bottom right) and qD = −1.0 µC (bottom left). Calculate the magnitude of the net electrostatic force on qA, in newtons. {K}.',
    Fsq, 'N',
    'Take +x to the right and +y upwards, and work out each force on qA with its direction from the signs. '
    f'Step 1: qB is negative, so it ATTRACTS qA along the top edge, +x: F = 9.0 × 10⁹ × 3.0 × 10⁻⁶ × 2.0 × 10⁻⁶ ÷ 0.20² = {sf(FB)} N. '
    f'Step 2: qD is negative, so it attracts qA down the left edge, −y: F = 9.0 × 10⁹ × 3.0 × 10⁻⁶ × 1.0 × 10⁻⁶ ÷ 0.20² = {sf(FD)} N. '
    f'Step 3: qC is positive and across the diagonal, r² = 0.20² + 0.20² = 0.080 m². It REPELS qA, up and to the left at 45°: F = 9.0 × 10⁹ × 3.0 × 10⁻⁶ × 4.0 × 10⁻⁶ ÷ 0.080 = {sf(FC)} N, with components −{sf(FC / sqrt(2))} N (x) and +{sf(FC / sqrt(2))} N (y). '
    f'Step 4: ΣFx = {sf(FB)} − {sf(FC / sqrt(2))} = {sf(Fx)} N, ΣFy = −{sf(FD)} + {sf(FC / sqrt(2))} = {sf(Fy)} N. F = √({sf(Fx)}² + {sf(Fy)}²) = {sf(Fsq)} N, at {sf(ang, 2)}° above the +x direction. '
    'Common mistake: using 0.20 m for the diagonal (it is 0.20√2 m, so r² = 0.080 m²), or adding the three magnitudes as if they were in a line.',
    marks=6, difficulty=5, subtopic='Square arrangement, mixed signs (components)',
    figure=dict(kind='rect', props=dict(wLabel='0.20 m', hLabel='0.20 m', square=True,
                                        corners=dict(tl=dict(name='qA', value='+3.0 µC', sign='+'), tr=dict(name='qB', value='−2.0 µC', sign='−'),
                                                     br=dict(name='qC', value='+4.0 µC', sign='+'), bl=dict(name='qD', value='−1.0 µC', sign='−')))),
    check=dict(a=a, q=[qA, qB, qC, qD]))

# Q89 — rectangle, mixed signs
w, h = 0.40, 0.30
qP, q2, q3, q4 = 5.0e-9, 6.0e-9, -4.0e-9, -8.0e-9
F2 = k * qP * q2 / w**2  # repel, −x
F3 = k * qP * abs(q3) / h**2  # attract, +y
F4 = k * qP * abs(q4) / (w * w + h * h)  # attract towards (0.40, 0.30)
Fx = -F2 + F4 * w / 0.50
Fy = F3 + F4 * h / 0.50
Frect = sqrt(Fx**2 + Fy**2)
num('rectangle-mixed',
    f'Charges sit at the corners of a 0.40 m × 0.30 m rectangle, as shown: P = +5.0 nC at the bottom left, +6.0 nC at the bottom right, −4.0 nC at the top left and −8.0 nC at the top right. Calculate the magnitude of the net electrostatic force on P, in newtons. {K}.',
    Frect, 'N',
    'Take +x to the right and +y up, with P at the origin. The diagonal is √(0.40² + 0.30²) = 0.50 m (a 3-4-5 triangle). '
    f'Step 1: +6.0 nC (0.40 m to the right) REPELS P, −x: F = 9.0 × 10⁹ × 5.0 × 10⁻⁹ × 6.0 × 10⁻⁹ ÷ 0.40² = {sf(F2)} N. '
    f'Step 2: −4.0 nC (0.30 m above) ATTRACTS P, +y: F = 9.0 × 10⁹ × 5.0 × 10⁻⁹ × 4.0 × 10⁻⁹ ÷ 0.30² = {sf(F3)} N. '
    f'Step 3: −8.0 nC (diagonal) attracts P towards it: F = 9.0 × 10⁹ × 5.0 × 10⁻⁹ × 8.0 × 10⁻⁹ ÷ 0.50² = {sf(F4)} N, with components × 0.40/0.50 = {sf(F4 * 0.8)} N (x) and × 0.30/0.50 = {sf(F4 * 0.6)} N (y). '
    f'Step 4: ΣFx = −{sf(F2)} + {sf(F4 * 0.8)} = {sf(Fx)} N, ΣFy = {sf(F3)} + {sf(F4 * 0.6)} = {sf(Fy)} N, so F = {sf(Frect)} N, {sf(degrees(atan(abs(Fx) / Fy)), 2)}° to the left of straight up. '
    'Common mistake: resolving the diagonal force with the wrong side — the x-component uses the 0.40 m side (cos = 0.40/0.50) — or forgetting that the repulsion from the bottom-right charge points LEFT.',
    marks=6, difficulty=5, subtopic='Rectangle arrangement, mixed signs (components)',
    figure=dict(kind='rect', props=dict(wLabel='0.40 m', hLabel='0.30 m', square=False,
                                        corners=dict(bl=dict(name='P', value='+5.0 nC', sign='+'), br=dict(name='', value='+6.0 nC', sign='+'),
                                                     tl=dict(name='', value='−4.0 nC', sign='−'), tr=dict(name='', value='−8.0 nC', sign='−')))),
    check=dict(w=w, h=h, q=[qP, q2, q3, q4]))

# Q90 — charge at the centre of a square
a, Q, qc = 0.10, 5.0e-9, 1.0e-9
Fone = k * Q * qc / (a * a / 2)
Fc = 4 * Fone / sqrt(2)
num('square-centre',
    f'Four charges of equal size sit at the corners of a square of side 0.10 m: +5.0 nC at both top corners and −5.0 nC at both bottom corners. A charge of +1.0 nC is placed at the centre of the square, as shown. Calculate the magnitude of the net force on the centre charge, in newtons, and state its direction. {K}.',
    Fc, 'N',
    f'Step 1: each corner is half a diagonal from the centre: r = 0.10√2 ÷ 2 = {sf(a / sqrt(2))} m, so r² = 0.0050 m². Each corner exerts F = 9.0 × 10⁹ × 5.0 × 10⁻⁹ × 1.0 × 10⁻⁹ ÷ 0.0050 = {sf(Fone)} N. '
    'Step 2 (directions): the top two (+) REPEL the centre charge, pushing it diagonally down and away. The bottom two (−) ATTRACT it, pulling diagonally down and towards them. All four forces point at 45° below the horizontal. '
    f'Step 3: the horizontal components cancel in pairs. Each vertical component is {sf(Fone)} × cos45° = {sf(Fone / sqrt(2))} N, all downwards: F = 4 × {sf(Fone / sqrt(2))} = {sf(Fc)} N, straight down (towards the negative side). '
    'Common mistake: assuming that equal-sized charges around a centre always cancel. They do only when opposite corners carry the SAME sign — here opposite corners have opposite signs, so the forces add.',
    marks=5, subtopic='Square arrangement: charge at the centre',
    figure=dict(kind='rect', props=dict(wLabel='0.10 m', hLabel='0.10 m', square=True, centre=dict(name='', value='+1.0 nC', sign='+'),
                                        corners=dict(tl=dict(name='', value='+5.0 nC', sign='+'), tr=dict(name='', value='+5.0 nC', sign='+'),
                                                     br=dict(name='', value='−5.0 nC', sign='−'), bl=dict(name='', value='−5.0 nC', sign='−')))),
    check=dict(a=a, Q=Q, qc=qc))

# Q91 — electron–proton ratio from constants
ratio = k * e * e / (G * M_E * M_P)
num('ep-ratio',
    f'Calculate the ratio of the electric force to the gravitational force between an electron and a proton, and explain why the answer does not depend on how far apart they are. {K}, G = 6.67 × 10⁻¹¹ N·m²/kg², e = 1.60 × 10⁻¹⁹ C, electron mass 9.11 × 10⁻³¹ kg and proton mass 1.67 × 10⁻²⁷ kg.',
    ratio, '',
    'Step 1: write both laws with the same r: Fe = ke²/r² and Fg = Gm_e m_p/r². '
    'Step 2: divide — the r² cancels: Fe/Fg = ke²/(Gm_e m_p). Both forces are inverse-square, so their ratio is the same at every separation. '
    f'Step 3: Fe/Fg = 9.0 × 10⁹ × (1.60 × 10⁻¹⁹)² ÷ (6.67 × 10⁻¹¹ × 9.11 × 10⁻³¹ × 1.67 × 10⁻²⁷) = {sf(k * e * e)} ÷ {sf(G * M_E * M_P)} = {sf(ratio)}. '
    'In words: between two particles, the electric force is about two thousand billion billion billion billion times stronger than gravity, at any distance — which is why gravity is ignored inside atoms. '
    'Common mistake: picking a separation and computing both forces, then losing a power of ten in one of them. Cancelling r² first is quicker and avoids it.',
    marks=4, subtopic='Electric vs gravitational force (ratio from constants)', tolerance=0.02)

# Q92 — explain in words (MCQ)
mcq('ep-ratio-explain',
    f'The electric force between an electron and a proton is about {sf(ratio, 2)} times their gravitational attraction. Yet planets are held in their orbits by gravity, not by electric forces. Which is the best explanation?',
    ['The electric force falls off faster with distance than gravity, so it is negligible over astronomical distances',
     'Planets and stars carry almost exactly equal amounts of positive and negative charge, so their electric forces cancel, while gravity — always attractive — adds up over every particle',
     'Coulomb’s constant k becomes much smaller in the vacuum of space',
     'Gravity is the stronger force for large masses because G is a bigger constant than k'],
    1,
    'Both forces obey an inverse-square law, so A is false — their ratio does not change with distance. The difference is that charge comes in two signs and mass in only one. '
    'A planet contains vast numbers of protons and electrons in almost exactly equal numbers. The electric attractions and repulsions between two such neutral bodies very nearly cancel. Gravity has nothing to cancel it: every kilogram attracts every other kilogram, so it builds up with mass. '
    'k is a constant (C is false), and G is about 10²⁰ times SMALLER than k (D is false). '
    'Common mistake: concluding that the weaker force must also have the shorter range. Range is not the issue — cancellation is.',
    marks=3, subtopic='Electric vs gravitational force (explain in words)')

# Q93 — oil drop balanced between plates
mo, Eo = 2.45e-15, 5.0e4
qo = mo * g / Eo
n_e = qo / e
assert abs(n_e - round(n_e)) < 0.01
num('oil-drop-electrons',
    'A charged oil drop of mass 2.45 × 10⁻¹⁵ kg is held stationary between two horizontal metal plates. The upper plate is positive and the uniform field between the plates is 5.0 × 10⁴ N/C, as shown. How many excess electrons does the drop carry? Take g = 9.8 N/kg and e = 1.60 × 10⁻¹⁹ C.',
    float(round(n_e)), '',
    'Free-body diagram for the drop: weight mg down and electric force qE up — nothing else (it is stationary, so air resistance is zero). '
    'Step 1 (sign): the field points from the positive (top) plate down to the negative plate. The electric force is UPWARDS, opposite to the field, so the charge is negative — the drop has extra electrons. '
    f'Step 2: balance qE = mg: q = mg/E = 2.45 × 10⁻¹⁵ × 9.8 ÷ 5.0 × 10⁴ = {sf(qo)} C. '
    f'Step 3: number of electrons = q/e = {sf(qo)} ÷ 1.60 × 10⁻¹⁹ = {sf(n_e)}, so 3 electrons. A whole number is a good check — charge comes in multiples of e (Millikan’s result). '
    'Common mistake: using Coulomb’s law F = kq₁q₂/r² — the plates produce a uniform field, so F = qE. Another is getting the sign wrong: a positive drop would be pushed down.',
    marks=4, subtopic='Oil drop balanced between plates (qE = mg)',
    figure=dict(kind='plates', props=dict(fieldLabel='E = 5.0 × 10⁴ N/C', dropLabel='m = 2.45 × 10⁻¹⁵ kg')),
    check=dict(m=mo, E=Eo))

# Q94 — oil drop extended (8 marks)
mo, Eo = 3.27e-15, 4.0e4
qo = mo * g / Eo
n0 = round(qo / e)
q6 = (n0 + 1) * e
Fnet = q6 * Eo - mo * g
acc = Fnet / mo
E_new = mo * g / q6
num('oil-drop-extended',
    'An oil drop of mass 3.27 × 10⁻¹⁵ kg is held stationary between horizontal plates in a uniform downward field of 4.0 × 10⁴ N/C. (a) Explain, using a free-body diagram, why the drop is stationary. (b) Calculate the charge on the drop and the number of excess electrons. (c) The drop suddenly picks up one more electron. Calculate its initial acceleration. (d) Calculate the field strength that would hold it stationary again. Enter your answer to (c), in m/s². Take g = 9.8 N/kg and e = 1.60 × 10⁻¹⁹ C.',
    acc, 'm/s²',
    '(a) Two forces act: weight mg down and electric force qE up. They are equal and opposite, so the resultant force is zero and the drop stays at rest (Newton’s first law). The force is opposite to the downward field, so the drop is negative. '
    f'(b) q = mg/E = 3.27 × 10⁻¹⁵ × 9.8 ÷ 4.0 × 10⁴ = {sf(qo)} C, which is {sf(qo / e)} × e, so {n0} excess electrons. '
    f'(c) Now q = {n0 + 1}e = {sf(q6)} C. The electric force rises to qE = {sf(q6 * Eo)} N but the weight is still {sf(mo * g)} N, so the resultant is {sf(Fnet)} N upwards and a = F/m = {sf(Fnet)} ÷ 3.27 × 10⁻¹⁵ = {sf(acc)} m/s² upwards (at first — air resistance soon builds up as it moves). '
    f'(d) For balance E = mg/q = {sf(mo * g)} ÷ {sf(q6)} = {sf(E_new)} N/C — the field must be REDUCED by a factor {n0}/{n0 + 1}. '
    'Common mistake: in (c), using the electric force alone (qE/m) instead of the RESULTANT force, or forgetting that the weight is unchanged.',
    marks=8, difficulty=5, subtopic='Extended: oil drop (balance, quantisation, acceleration)',
    figure=dict(kind='plates', props=dict(fieldLabel='E = 4.0 × 10⁴ N/C', dropLabel='m = 3.27 × 10⁻¹⁵ kg')),
    check=dict(m=mo, E=Eo))

# Q95 — graph: F against 1/r²
qg = 50e-9
grad95 = k * qg**2
px, py = 2000.0, grad95 * 2000.0
num('graph-inverse-square',
    f'A student measures the force F between two equally charged spheres at several separations r and plots F against 1/r². The graph is a straight line through the origin passing through the point (2000 m⁻², {sf(py)} N), as shown. (a) What does the straight line through the origin show? (b) What does the gradient represent? (c) Calculate the charge on each sphere, in coulombs. Enter your answer to (c). {K}.',
    qg, 'C',
    '(a) A straight line through the origin means F is directly proportional to 1/r² — an inverse-square law, as Coulomb’s law predicts. '
    f'(b) Coulomb’s law is F = (kq₁q₂) × (1/r²), which has the form y = mx, so the gradient is kq₁q₂: gradient = {sf(py)} N ÷ 2000 m⁻² = {sf(grad95)} N·m². '
    f'(c) The charges are equal, so kq² = {sf(grad95)} and q = √({sf(grad95)} ÷ 9.0 × 10⁹) = {sf(qg)} C (50 nC). '
    'Common mistake: dividing the gradient by k and forgetting the square root (that gives q², in C²), or reading the gradient as k.',
    marks=5, subtopic='Graph interpretation: F against 1/r²',
    figure=dict(kind='graph', props=dict(xLabel='1/r² / m⁻²', yLabel='F / N', xMax=2500, yMax=grad95 * 2500 * 1.08, line=dict(gradient=grad95),
                                         mark=dict(x=px, y=py, label=f'(2000, {sf(py)})'), xTicks=[0, 500, 1000, 1500, 2000, 2500])),
    check=dict(q=qg))

# Q96 — graph: F against q1q2
r96 = 0.050
grad96 = k / r96**2
qx, qy = 5.0e-15, grad96 * 5.0e-15
r_from = sqrt(k / grad96)
num('graph-product',
    f'In a second experiment the separation is kept fixed and the product of the charges q₁q₂ is varied. The graph of F against q₁q₂ is a straight line through the origin, passing through (5.0 × 10⁻¹⁵ C², {sf(qy)} N), as shown. Calculate the separation of the charges, in metres. {K}.',
    r_from, 'm',
    f'Step 1: write Coulomb’s law in the form y = mx: F = (k/r²) × (q₁q₂). With r fixed, the gradient is k/r². '
    f'Step 2: gradient = {sf(qy)} N ÷ 5.0 × 10⁻¹⁵ C² = {sf(grad96)} N/C². '
    f'Step 3: k/r² = {sf(grad96)}, so r² = 9.0 × 10⁹ ÷ {sf(grad96)} = {sf(r_from**2)} m² and r = {sf(r_from)} m (5.0 cm). '
    'A steeper line would mean a smaller separation, since the gradient is proportional to 1/r². '
    'Common mistake: treating the gradient as k, or as k/r instead of k/r², and so forgetting the square root at the end.',
    marks=5, subtopic='Graph interpretation: F against q₁q₂',
    figure=dict(kind='graph', props=dict(xLabel='q₁q₂ / 10⁻¹⁵ C²', yLabel='F / N', xMax=6, yMax=grad96 * 6e-15 * 1.1, line=dict(gradient=grad96 * 1e-15),
                                         mark=dict(x=5.0, y=qy, label=f'(5.0, {sf(qy)})'), xTicks=[0, 1, 2, 3, 4, 5, 6])),
    check=dict(r=r96))

# Q97 — graph: F against r (MCQ)
F2cm = 0.36
F6 = F2cm * (2 / 6) ** 2
mcq('graph-f-vs-r',
    'The graph shows how the force between two fixed charges varies with their separation r. At r = 2.0 cm the force is 0.36 N, as marked. What is the force at r = 6.0 cm?',
    [f'{sf(F2cm / 3, 2)} N', f'{sf(F6, 2)} N', f'{sf(F2cm / 27, 2)} N', f'{sf(F2cm * 3, 2)} N'],
    1,
    f'The curve is not a straight line, so you cannot read a gradient from it — use the law instead. Step 1: F ∝ 1/r². Tripling r (2.0 → 6.0 cm) divides F by 3² = 9. Step 2: F = 0.36 ÷ 9 = {sf(F6, 2)} N. '
    f'Where the distractors come from: {sf(F2cm / 3, 2)} N forgets to square, {sf(F2cm / 27, 2)} N cubes, and {sf(F2cm * 3, 2)} N gets the proportion upside down. '
    'To TEST the law from data like this, re-plot: F against 1/r² should be a straight line through the origin (the curve of F against r only shows that F falls as r rises). Note also that the cm do not need converting here, because only the ratio 6.0/2.0 matters. '
    'Common mistake: assuming F ∝ 1/r because the graph “goes down”.',
    marks=3, subtopic='Graph interpretation: F against r',
    figure=dict(kind='graph', props=dict(xLabel='r / cm', yLabel='F / N', xMax=8, yMax=0.5, curve=dict(A=F2cm * 4.0, power=-2, xFrom=0.85),
                                         mark=dict(x=2.0, y=F2cm, label='(2.0, 0.36)'), xTicks=[0, 2, 4, 6, 8])))

# Q98 — unit slips (MCQ)
F98 = k * 25e-9 * 40e-9 / 0.025**2
mcq('mcq-unit-slips',
    f'Two small spheres carry +25 nC and −40 nC, with their centres 2.5 cm apart. What is the magnitude of the force between them? {K}.',
    [f'{sf(k * 25e-9 * 40e-9 / 0.025, 2)} N', f'{sf(F98, 2)} N', f'{sf(k * 25e-9 * 40e-9 / 2.5**2, 2)} N', f'{sf(k * 25e-6 * 40e-6 / 0.025**2, 2)} N'],
    1,
    f'Step 1: convert first — 25 nC = 25 × 10⁻⁹ C, 40 nC = 40 × 10⁻⁹ C, 2.5 cm = 0.025 m. Step 2: F = 9.0 × 10⁹ × 25 × 10⁻⁹ × 40 × 10⁻⁹ ÷ 0.025² = {sf(F98, 2)} N. The sign only tells you it is attractive. '
    f'Where the others come from: {sf(k * 25e-9 * 40e-9 / 0.025, 2)} N forgets to square r, {sf(k * 25e-9 * 40e-9 / 2.5**2, 2)} N leaves r in centimetres, and {sf(k * 25e-6 * 40e-6 / 0.025**2, 2)} N reads nC as µC (10⁻⁶ instead of 10⁻⁹) — a factor of a million. '
    'Common mistake: converting only some of the quantities. Put every value into C and m before substituting.',
    marks=3, subtopic='Multiple choice: unit slips (cm, nC, µC)', figure='coulomb-two-charges')

# Q99 — centre-to-centre distance (MCQ)
rr, gap, qq = 0.010, 0.030, 30e-9
r_ok = gap + 2 * rr
F_ok = k * qq**2 / r_ok**2
mcq('mcq-centre-distance',
    f'Two small metal spheres, each of radius 1.0 cm and each carrying +30 nC, are placed so that the GAP between their surfaces is 3.0 cm, as shown. Treating each sphere as a point charge at its centre, what is the force between them? {K}.',
    [f'{sf(k * qq**2 / gap**2, 2)} N', f'{sf(k * qq**2 / (gap + rr) ** 2, 2)} N', f'{sf(F_ok, 2)} N', f'{sf(k * qq**2 / r_ok, 2)} N'],
    2,
    f'Step 1: Coulomb’s law uses the distance between the CENTRES: r = 1.0 + 3.0 + 1.0 = 5.0 cm = 0.050 m. Step 2: F = 9.0 × 10⁹ × (30 × 10⁻⁹)² ÷ 0.050² = {sf(F_ok, 2)} N (repulsive). '
    f'The others: {sf(k * qq**2 / gap**2, 2)} N uses the gap alone, {sf(k * qq**2 / (gap + rr) ** 2, 2)} N adds only one radius, and {sf(k * qq**2 / r_ok, 2)} N forgets to square r. '
    'Evaluate: spheres this close are only approximately point charges — the charges repel each other towards the far sides, so the true force is a little less than this. '
    'Common mistake: measuring r between the surfaces. The same applies to the hanging-ball questions: r is centre to centre.',
    marks=3, subtopic='Multiple choice: centre-to-centre separation',
    figure=dict(kind='gap', props=dict(radiusLabel='1.0 cm', gapLabel='3.0 cm', charge='+30 nC')))

# ════════════════════════════════════════════════════════════════════════
# Output
# ════════════════════════════════════════════════════════════════════════
assert len(questions) >= 30, len(questions)
assert sum(1 for x in questions if x['suspended']) >= 14
assert len({x['text'] for x in questions}) == len(questions)
for x in questions:
    for s in (x['text'], x['explanation'], *(x.get('options') or [])):
        assert ';' not in s and '\\u' not in s, x['slug']

LAST = questions[-1]['number']
out = [
    '-- 17.4 Coulomb\'s law (extension): CHALLENGING tier, Q60–Q%d (2026-10-13).' % LAST,
    '-- GENERATED by 2026-10-13-coulomb-challenge.py: edit that, never this file.',
    '-- IGCSE bank only (the only bank 17.4 has). Q1–Q59 are not renumbered.',
    '-- Idempotent: uuid5 ids, ON CONFLICT DO NOTHING.',
    '',
    '-- Verified last-digit fixes in the existing bank (both already inside the grading tolerance):',
    '--   Q40 is √(0.54² + 0.81²) = 0.9735 N, stored as 0.974.   Q58 is 0.144√2 + 0.072 = 0.2757 N, stored as 0.275.',
    "UPDATE problems SET answer_correct = '0.973', updated_at = now() WHERE id = 'a0ae963a-920d-472b-8f75-21ef29863340' AND answer_correct = '0.974';",
    "UPDATE problems SET answer_correct = '0.276', updated_at = now() WHERE id = '3eed062e-bec6-4312-bf1b-a83d5a607232' AND answer_correct = '0.275';",
    '',
]
for x in questions:
    is_num = x['kind'] == 'numeric'
    out.append(
        'INSERT INTO problems (id, chapter_id, topic_id, curriculum_id, topic_code, syllabus_cite, problem_number, "order", '
        'question_text, question_image_url, difficulty_level, answer_type, answer_correct, answer_unit, answer_tolerance, '
        'answer_sign_sensitive, explanation, points) VALUES ('
        f"{q(x['id'])}, {q(CHAPTER)}, {q(TOPIC)}, 'igcse', NULL, NULL, {x['number']}, {x['number']}, {q(x['text'])}, "
        f"{opt(x['figure'])}, {x['difficulty']}, '{'numeric' if is_num else 'multiple_choice'}'::answer_type, "
        f"{q(x['answer'])}, {opt(x['unit'] or None) if is_num else 'NULL'}, "
        f"{x['tolerance'] if is_num and x['tolerance'] is not None else 'NULL'}, "
        f"{'true' if is_num and x['sign'] else 'false'}, {q(x['explanation'])}, {x['marks']}) ON CONFLICT (id) DO NOTHING;")
    if not is_num:
        for i, text in enumerate(x['options']):
            out.append(
                'INSERT INTO problem_options (id, problem_id, option_text, option_letter, is_correct, "order") VALUES ('
                f"{q(uid('option/' + x['id'] + '/' + str(i)))}, {q(x['id'])}, {q(text)}, '{'ABCD'[i]}', "
                f"{'true' if i == x['correct'] else 'false'}, {i + 1}) ON CONFLICT (id) DO NOTHING;")
out.append('')

with open(sys.argv[1], 'w') as fh:
    fh.write('\n'.join(out))

def rounded(v):
    if isinstance(v, float):
        return float(f'{v:.5g}')
    if isinstance(v, dict):
        return {kk: rounded(vv) for kk, vv in v.items()}
    if isinstance(v, list):
        return [rounded(vv) for vv in v]
    return v


here = os.path.dirname(os.path.abspath(__file__))
ts_path = os.path.join(here, '..', '..', 'components', 'practice', 'coulombChallengeDiagramData.ts')
with open(ts_path, 'w') as fh:
    fh.write('// GENERATED by database/seeds/2026-10-13-coulomb-challenge.py — do not hand-edit.\n')
    fh.write('// The exact numbers behind each 17.4 CHALLENGING-tier figure (Q60 onwards); see\n')
    fh.write('// CoulombChallengeDiagrams.tsx for the components that draw them.\n')
    fh.write('// eslint-disable-next-line @typescript-eslint/no-explicit-any\n')
    fh.write('export const COULOMB_CHALLENGE_DIAGRAM_DATA: Record<string, { kind: string; props: any }> = ')
    json.dump(rounded(diagrams), fh, ensure_ascii=False, indent=1)
    fh.write(';\n')

if '--json' in sys.argv:
    with open(sys.argv[sys.argv.index('--json') + 1], 'w') as fh:
        json.dump([{kk: vv for kk, vv in x.items()} for x in questions], fh, ensure_ascii=False, indent=1)

print(f'{len(questions)} questions (Q{FIRST_NUMBER}–Q{LAST}), {len(diagrams)} figures', file=sys.stderr)
