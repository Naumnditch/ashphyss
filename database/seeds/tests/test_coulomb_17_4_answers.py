"""Independent answer check for "17.4 Coulomb's law (extension)", old AND new.

Run:  python3 -m pytest database/seeds/tests/test_coulomb_17_4_answers.py -q
 (or: python3 database/seeds/tests/test_coulomb_17_4_answers.py)

Every numerical answer is recomputed here from the question's own givens,
WITHOUT importing the seed generator's formulas, and compared with the stored
answer_correct at the significant figures that answer is written to:

* Q1–Q58: the values stored in the live `problems` table, snapshotted
  2026-10-13 (Q1–41 exist only in the database, never in a seed file).
* Q60 onwards: the rows the 2026-10-13 seed generator writes, read back from
  its SQL output.

Q59 is an unanswered stub (answer_correct NULL) and is reported, not checked.
Inverse angle problems are solved with scipy.optimize.brentq. Geometry is
checked for physical validity (angles below 90°, separations below 2L,
non-negative tensions) and the new set is checked for duplicates.
"""
import difflib
import os
import re
import subprocess
import sys
import tempfile
import unittest
from decimal import ROUND_HALF_UP, Decimal
from math import atan, atan2, cos, degrees, pi, radians, sin, sqrt, tan

from scipy.optimize import brentq

k, g, e, G = 9.0e9, 9.8, 1.60e-19, 6.67e-11
HERE = os.path.dirname(os.path.abspath(__file__))
SEED = os.path.join(HERE, '..', '2026-10-13-coulomb-challenge.py')


def sig_figs(stored):
    """Significant figures an answer string is written to ('0.0350' → 3, '16000' → 2, '6.5e4' → 2)."""
    mant = stored.lower().lstrip('-').split('e')[0]
    digits = mant.replace('.', '').lstrip('0')
    if '.' not in mant:
        digits = digits.rstrip('0') or '0'
    return max(len(digits), 1)


def round_sf(x, n):
    d = Decimal(repr(abs(x)))
    exp = d.adjusted()
    q = Decimal(1).scaleb(exp - n + 1)
    return float(d.quantize(q, rounding=ROUND_HALF_UP)) * (1 if x >= 0 else -1)


def matches(stored, computed):
    n = sig_figs(stored)
    return abs(round_sf(computed, n) - float(stored)) <= 1e-9 * max(abs(float(stored)), 1e-300)


def F(q1, q2, r):
    return k * abs(q1 * q2) / r**2


def net(target, others):
    """Net Coulomb force on target (q, x, y) from [(q, x, y)…], as a vector."""
    qt, xt, yt = target
    fx = fy = 0.0
    for q, x, y in others:
        dx, dy = xt - x, yt - y
        r = sqrt(dx * dx + dy * dy)
        f = k * qt * q / r**2  # + = repulsion, along (dx, dy)
        fx += f * dx / r
        fy += f * dy / r
    return fx, fy


def mag(v):
    return sqrt(v[0] ** 2 + v[1] ** 2)


def theta_pair(q1q2, m, L):
    return brentq(lambda t: k * q1q2 / (4 * L * L * sin(t) ** 2) - m * g * tan(t), 1e-9, pi / 2 - 1e-9, xtol=1e-15)


# ── Q1–Q58: stored answer (live DB, 2026-10-13) → recomputed value ──────────
q47_3 = (-0.25, sqrt(0.5**2 - 0.25**2))  # q₃ position from |q₃q₁| = 0.50 and |q₃q₂| = 0.70
OLD_NUMERIC = {
    2: ('1.8e10', F(2.0, 4.0, 2.0)),
    5: ('1.5e10', F(5.0, 3.0, 3.0)),
    8: ('6.75e9', F(6.0, 2.0, 4.0)),
    15: ('112.5', F(10e-6, 50e-6, 0.20)),
    16: ('4.33e-6', sqrt(0.30 * 0.75**2 / k)),
    19: ('0.335', sqrt(k * 2.5e-6**2 / 0.50)),
    20: ('8.44e6', F(2.0, 3.0, 80)),
    21: ('2.0e-4', 9.0 * 10**2 / (k * 5.0e-4)),
    22: ('6.5e4', sqrt(k * 9.0 / 19.2)),
    23: ('1120', F(4.0e-5, 7.0e-5, 0.15)),
    24: ('4.17e-7', 12 * 0.050**2 / (k * 8.0e-6)),
    25: ('1.22', sqrt(k * (5.0e-5) ** 2 / 15)),
    26: ('79.1', F(1.5e-5, 1.5e-5, 0.16)),
    27: ('4.67e11', F(1.8, 1.8, 0.25)),
    28: ('3.42e10', F(1.95, 1.95, 1.0)),
    29: ('313', 5.00e-17 / 1.60e-19),
    30: ('1.875e20', 30 / 1.60e-19),
    34: ('1.296', F(6.0e-6, 6.0e-6, 0.50)),
    35: ('16000', F(2.0e-4, 8.0e-4, 0.30)),
    36: ('0.4', F(2.0e-5, 8.0e-5, 6.0)),
    37: ('40', F(2.0e-5, 8.0e-5, 0.60)),
    38: ('2.38e-8', sqrt(1.0e-3 * g * tan(radians(30)) * 0.030**2 / k)),
    39: ('11.4', mag(net((6.0e-6, 0, 0), [(-4.0e-6, -0.20, 0), (-7.0e-6, 0.15, 0)]))),
    # Stored as 0.974 until 2026-10-13: √(0.54² + 0.81²) = 0.9735 is 0.973 to 3 s.f. (fixed, as Q58).
    40: ('0.973', mag(net((4.5e-5, 0, 0), [(-1.2e-5, 0, 3.0), (1.8e-5, 3.0, 0)]))),
    42: ('0.3923', mag(net((2.0e-6, 0, 0), [(-3.0e-6, 0.40, 0), (1.0e-6, 0, 0.30)]))),
    43: ('40099', mag(net((5.0e-3, 0, 0), [(-8.0e-3, 3.0, 0), (1.0e-3, 0, 4.0)]))),
    44: ('6.595e-6', mag(net((2.0e-9, 0, 0.10), [(-4.0e-9, 0, 0), (5.0e-9, 0.20, 0)]))),
    45: ('1.006e-6', mag(net((10e-9, 0, 0), [(5.0e-9, 1.0, 0), (-10e-9, 0, 1.0)]))),
    46: ('0.381', mag(net((2.0e-6, 0.25, 0.25 * sqrt(3)), [(4.0e-6, 0, 0), (-6.0e-6, 0.50, 0)]))),
    47: ('4.446e-6', mag(net((-5.0e-9, 0.30, 0), [(8.0e-9, 0, 0), (6.0e-9, *q47_3)]))),
    48: ('0.6325', sqrt(k * 5.0e-6 * 8.0e-6 / 0.90)),
    49: ('1.073e-10', sqrt(k * (1.60e-19) ** 2 / 2.0e-8)),
    50: ('109.5', sqrt(k * 1.0e-3 * 2.0e-3 / 1.5)),
    51: ('0.01697', sqrt(k * (4.0e-9) ** 2 / 5.0e-4)),
    52: ('33.54', sqrt(k * 25e-3 * 5.0e-3 / 1000)),
    53: ('2.5e-9', 0.27 * 0.50**2 / (k * 3.0e-3)),
    54: ('3e-6', 1.08 * 1.0**2 / (k * 4.0e-5)),
    55: ('3.536e-7', sqrt(0.050 * 0.15**2 / k)),
    56: ('1e-5', 3.375 * 0.20**2 / (k * 1.5e-6)),
    57: ('3e-6', 0.15 * 0.030**2 / (k * 5.0e-9)),
    # Stored as 0.275 until 2026-10-13: 0.144√2 + 0.072 = 0.2757 is 0.276 to 3 s.f.
    # Fixed by the 2026-10-13 seed (verified error, listed in PROJECT_STATUS.md).
    58: ('0.276', mag(net((2e-6, 0, 0), [(2e-6, 0.5, 0), (2e-6, 0, 0.5), (2e-6, 0.5, 0.5)]))),
}

# Multiple-choice questions whose correct option is a computed value or factor.
OLD_MCQ = {
    4: ('It falls to one quarter of its original value', (1 / 2) ** 2, 0.25),
    7: ('It becomes four times larger', 2**2, 4),
    10: ('20 N', 10 * 2, 20),
    11: ('It is three times larger', 3, 3),
    12: ('It is four times larger', 4, 4),
    13: ('It is nine times larger', 3 * 3, 9),
    14: ('It falls to one sixteenth', 1 / 4**2, 1 / 16),
    18: ('16F', 2 * 2 / (1 / 2) ** 2, 16),
    31: ('It falls to one ninth', 1 / 3**2, 1 / 9),
    41: ('About 39', round(__import__('math').log10(8.2e-8 / 3.6e-47)), 39),
}


class OldBank(unittest.TestCase):
    def test_numeric_answers_match_at_their_stated_sig_figs(self):
        bad = {n: (s, c) for n, (s, c) in OLD_NUMERIC.items() if not matches(s, c)}
        self.assertEqual(bad, {}, f'Q1–58 mismatches (stored, computed): {bad}')

    def test_mcq_factors(self):
        for n, (label, computed, expected) in OLD_MCQ.items():
            self.assertAlmostEqual(computed, expected, places=9, msg=f'Q{n} {label}')

    def test_q41_forces_are_consistent_with_constants(self):
        fe = k * (1.6e-19) ** 2 / (5.3e-11) ** 2
        fg = G * 1.67e-27 * 9.11e-31 / (5.3e-11) ** 2
        self.assertTrue(matches('8.2e-8', fe) and matches('3.6e-47', fg))


# ── Q60 onwards: read back from the generated SQL ──────────────────────────
def parse_tuple(vals):
    """Splits a VALUES (...) tuple into cells: quoted strings unescaped, ::casts dropped."""
    cells, i = [], 0
    while i < len(vals):
        while i < len(vals) and vals[i] in ' ,':
            i += 1
        if i >= len(vals):
            break
        if vals[i] == "'":
            j, buf = i + 1, ''
            while True:
                if vals[j] == "'" and j + 1 < len(vals) and vals[j + 1] == "'":
                    buf, j = buf + "'", j + 2
                elif vals[j] == "'":
                    break
                else:
                    buf, j = buf + vals[j], j + 1
            cells.append(buf)
            i = j + 1
            if vals.startswith('::', i):
                while i < len(vals) and vals[i] != ',':
                    i += 1
        else:
            j = vals.find(',', i)
            j = len(vals) if j == -1 else j
            cells.append(vals[i:j].strip())
            i = j
    return cells


def generated_rows():
    out = tempfile.mkdtemp()
    sql = os.path.join(out, 'seed.sql')
    subprocess.run([sys.executable, SEED, sql], check=True, capture_output=True)
    text = open(sql).read()
    rows = {}
    for line in text.splitlines():
        if not line.startswith('INSERT INTO problems ('):
            continue
        vals = line[line.index('VALUES (') + 8:line.rindex(') ON CONFLICT')]
        flat = parse_tuple(vals)
        n = int(flat[6])
        rows[n] = dict(text=flat[8], figure=flat[9], difficulty=int(flat[10]), type=flat[11], answer=flat[12],
                       unit=flat[13], tol=flat[14], sign=flat[15], explanation=flat[16], marks=int(flat[17]))
    options = {}
    for m in re.finditer(r"INSERT INTO problem_options .*? VALUES \('[^']+', '([^']+)', '((?:[^']|'')*)', '([A-D])', (true|false)", text):
        options.setdefault(m.group(1), []).append((m.group(2).replace("''", "'"), m.group(4) == 'true'))
    return rows, options, text


ROWS, OPTIONS, SQL = generated_rows()


def exact_x(q1q2, m, L):
    return 2 * L * sin(theta_pair(q1q2, m, L))


def lvl(m1, t1, m2):  # level balls, equal force: m1 tanθ1 = m2 tanθ2
    return degrees(atan(m1 * tan(radians(t1)) / m2))


# Data-analysis reading set (Q77): angles read to the nearest 0.5° from a true kq² = 3.6e-6 N·m².
R77 = [0.030, 0.040, 0.050, 0.060, 0.080]
A77 = [round(degrees(atan(3.6e-6 / r**2 / (0.6e-3 * g))) * 2) / 2 for r in R77]
X77 = [1 / r**2 for r in R77]
Y77 = [0.6e-3 * g * tan(radians(a)) for a in A77]

th64 = atan(0.030 / 0.25)  # sinθ = 0.12, written as atan of the right triangle's legs below
th64 = __import__('math').asin(0.030 / 0.25)
c71 = sin(radians(12)) ** 2 * tan(radians(12))
th81 = __import__('math').asin(0.060 / 0.50)
q81 = 0.120 * sqrt(2.0e-3 * g * tan(th81) / k)
q86 = 8.0e-9 * (0.30 / 0.90) ** 2

NEW_NUMERIC = {
    60: 2.0e-3 * g * tan(radians(20)) * 0.050**2 / (k * 40e-9),
    61: sqrt(k * (12e-9) ** 2 / (0.50e-3 * g * tan(radians(15)))),
    62: degrees(atan(F(30e-9, 25e-9, 0.040) / (1.5e-3 * g))),
    63: 2 * 0.50 * sin(radians(10)) * sqrt(2.0e-3 * g * tan(radians(10)) / k),
    64: F(50e-9, 50e-9, 0.060) / sin(th64),
    66: 2 * 0.60 * sin(radians(9)) * sqrt(2.0e-3 * g * tan(radians(9)) / (3 * k)),
    67: lvl(2.0e-3, 30, 6.0e-3),
    68: (2 * k * (20e-9) ** 2 * 0.80 / (1.0e-3 * g)) ** (1 / 3),
    70: exact_x((40e-9) ** 2, 1.2e-3, 0.50),
    71: degrees(brentq(lambda t: sin(t) ** 2 * tan(t) - c71 / 2, 1e-6, radians(12))),
    74: 5.0e-3 * g + F(40e-9, 40e-9, 0.050),
    75: 2.0e-3 * g * 0.040**2 / (k * 0.15e-6),
    76: 0.80e-3 * g * tan(radians(14)) / 2.5e4,
    77: sum(x * y for x, y in zip(X77, Y77)) / sum(x * x for x in X77),
    79: exact_x((0.15e-6) ** 2, 1.0e-3, 0.20),
    80: degrees(atan(2 * tan(radians(18)))),
    81: exact_x((q81 / 2) ** 2, 2.0e-3, 0.50),
    82: 3.0e-3 * tan(radians(24)) / tan(radians(15)),
    83: F(4.0e-6, 2.0e-6, 0.10) + F(1.0e-6, 2.0e-6, 0.20),
    84: 0.60,
    85: 0.30,
    86: -q86,
    88: mag(net((3.0e-6, 0, 0.20), [(-2.0e-6, 0.20, 0.20), (4.0e-6, 0.20, 0), (-1.0e-6, 0, 0)])),
    89: mag(net((5.0e-9, 0, 0), [(6.0e-9, 0.40, 0), (-4.0e-9, 0, 0.30), (-8.0e-9, 0.40, 0.30)])),
    90: mag(net((1.0e-9, 0.05, 0.05), [(5e-9, 0, 0.10), (5e-9, 0.10, 0.10), (-5e-9, 0, 0), (-5e-9, 0.10, 0)])),
    91: k * e * e / (G * 9.11e-31 * 1.67e-27),
    93: 3,
    94: (6 * e * 4.0e4 - 3.27e-15 * g) / 3.27e-15,
    95: sqrt((k * (50e-9) ** 2 * 2000) / 2000 / k),
    96: sqrt(k / (k / 0.050**2)),
}

# Correct MCQ option → a check it is the right one.
NEW_MCQ = {
    65: 'Newton’s third law',
    69: 'not valid',
    72: f'{4 ** (1 / 3):.2f}',
    73: f'{2 ** (1 / 3):.2f}',
    78: None,  # numeric option, checked below
    87: 'Stable for a nudge along the line',
    92: 'almost exactly equal amounts of positive and negative charge',
    97: '0.040 N',
    98: '0.014 N',
    99: '0.0032 N',
}


class NewBank(unittest.TestCase):
    def test_numbering_and_tier(self):
        nums = sorted(ROWS)
        self.assertEqual(nums, list(range(60, 60 + len(nums))))
        self.assertGreaterEqual(len(nums), 30)
        for n, r in ROWS.items():
            self.assertIn(r['difficulty'], (4, 5), f'Q{n} must be CHALLENGING (difficulty 4–5)')

    def test_every_numeric_answer_recomputed(self):
        numeric = {n for n, r in ROWS.items() if r['type'] == 'numeric'}
        self.assertEqual(numeric, set(NEW_NUMERIC), 'every numeric question needs an independent check')
        bad = {n: (ROWS[n]['answer'], v) for n, v in NEW_NUMERIC.items() if not matches(ROWS[n]['answer'], v)}
        self.assertEqual(bad, {})

    def test_mcqs_have_four_options_one_correct(self):
        mcqs = {n for n, r in ROWS.items() if r['type'] == 'multiple_choice'}
        self.assertEqual(mcqs, set(NEW_MCQ))
        ids = dict(re.findall(r"INSERT INTO problems .*? VALUES \('([^']+)', '[^']+', '[^']+', 'igcse', NULL, NULL, (\d+),", SQL))
        by_number = {int(n): pid for pid, n in ids.items()}
        for n, needle in NEW_MCQ.items():
            opts = OPTIONS[by_number[n]]
            self.assertEqual(len(opts), 4)
            self.assertEqual(len({t for t, _ in opts}), 4, f'Q{n} duplicate options')
            correct = [t for t, c in opts if c]
            self.assertEqual(correct, [ROWS[n]['answer']])
            if needle:
                self.assertIn(needle, correct[0], f'Q{n}')
        # Q78: the correct option is the 2L sinθ / tanθ answer.
        L, m, th = 0.20, 1.0e-3, radians(35)
        q78 = 2 * L * sin(th) * sqrt(m * g * tan(th) / k)
        self.assertTrue(ROWS[78]['answer'].startswith(f'{q78 / 1e-7:.2f} × 10⁻⁷'))

    def test_inverse_problems_solve_the_exact_equation(self):
        for q1q2, m, L in [((20e-9) ** 2, 1.0e-3, 0.80), ((0.20e-6) ** 2, 2.0e-3, 0.15), ((0.15e-6) ** 2, 1.0e-3, 0.20)]:
            t = theta_pair(q1q2, m, L)
            self.assertAlmostEqual(k * q1q2 / (2 * L * sin(t)) ** 2, m * g * tan(t), delta=1e-12)
        # Q68's small-angle answer agrees with the exact one (within 0.1%); Q79's does not (> tolerance).
        self.assertLess(abs(NEW_NUMERIC[68] / exact_x((20e-9) ** 2, 1.0e-3, 0.80) - 1), 1e-3)
        approx79 = (2 * k * (0.15e-6) ** 2 * 0.20 / (1.0e-3 * g)) ** (1 / 3)
        self.assertGreater(approx79 / NEW_NUMERIC[79] - 1, float(ROWS[79]['tol']))

    def test_geometry_is_physical(self):
        # Every pair set-up: θ < 90° and separation < 2L.
        for q1q2, m, L in [((40e-9) ** 2, 1.2e-3, 0.50), ((60e-9 * 20e-9), 1.2e-3, 0.50), ((0.15e-6) ** 2, 1e-3, 0.20),
                           ((0.20e-6) ** 2, 2e-3, 0.15), ((q81 / 2) ** 2, 2e-3, 0.50)]:
            t = theta_pair(q1q2, m, L)
            self.assertTrue(0 < t < pi / 2)
            self.assertLess(2 * L * sin(t), 2 * L)
        self.assertLess(0.060, 2 * 0.25)  # Q64
        self.assertLess(0.120, 2 * 0.50)  # Q81
        self.assertLess(0.068, 2 * 0.50)
        # Q74(a): like charges below — the thread must still be taut.
        self.assertGreater(5.0e-3 * g - F(40e-9, 40e-9, 0.050), 0)
        # Q82 level balls: thread lengths L1 cosθ1 = L2 cosθ2 exist for any θ < 90°.
        self.assertTrue(all(0 < a < 90 for a in (24, 15, 30, NEW_NUMERIC[67])))
        # Q89 3-4-5 rectangle diagonal, Q84 rejected root lies between the charges.
        self.assertAlmostEqual(sqrt(0.40**2 + 0.30**2), 0.50)
        roots = sorted(((2.4 - 1.2) / 6, (2.4 + 1.2) / 6))
        self.assertTrue(0 < roots[0] < 0.30 < roots[1])
        # Q86: q₃ balances q₁ AND q₂.
        self.assertAlmostEqual(F(2e-9, q86, 0.30), F(2e-9, 8e-9, 0.90), delta=1e-18)
        self.assertAlmostEqual(F(8e-9, q86, 0.60), F(2e-9, 8e-9, 0.90), delta=1e-18)
        # Q93/94: whole numbers of electrons.
        self.assertAlmostEqual(2.45e-15 * g / 5.0e4 / e, 3, places=2)
        self.assertAlmostEqual(3.27e-15 * g / 4.0e4 / e, 5, places=1)

    def test_units_and_signs(self):
        self.assertEqual(ROWS[86]['sign'], 'true')
        self.assertTrue(ROWS[86]['answer'].startswith('-'))
        for n in (62, 67, 71, 79, 80):
            if n == 79:
                self.assertEqual(ROWS[n]['unit'], 'm')
            else:
                self.assertEqual(ROWS[n]['unit'], '°')
        for n, r in ROWS.items():
            if r['type'] == 'numeric' and r['unit'] not in ('NULL',):
                self.assertIn(r['unit'], ('C', 'm', 'N', '°', 'kg', 'N·m²', 'm/s²'), f'Q{n}')

    def test_constants_stated_where_needed(self):
        for n, r in ROWS.items():
            uses_k = 'k' in re.sub(r'[^k ]', ' ', r['explanation']) and ('9.0 × 10⁹' in r['explanation'])
            if uses_k and n not in (65, 72, 73, 87, 92, 97):
                self.assertTrue('k = 9.0 × 10⁹ N·m²/C²' in r['text'] or 'previous' in r['text'], f'Q{n} uses k but does not state it')
            if '× 9.8' in r['explanation'] and n not in (67, 71):
                self.assertIn('g = 9.8 N/kg', r['text'], f'Q{n} uses g but does not state it')

    def test_solution_format(self):
        for n, r in ROWS.items():
            self.assertIn('Common mistake:', r['explanation'], f'Q{n}')
            self.assertNotIn(';', r['text'] + r['explanation'])
        suspended = [n for n, r in ROWS.items() if r['figure'].startswith('diagram:coulomb-ch-') and
                     re.search(r'coulomb-ch-(fixed|pair|vertical|field|extended)', r['figure'])]
        self.assertGreaterEqual(len(suspended), 14)
        for n in suspended:
            ex = ROWS[n]['explanation']
            self.assertTrue('mg' in ex and (' T ' in ex or 'T sin' in ex or 'tension' in ex.lower()) and ('Fe' in ex or 'qE' in ex),
                            f'Q{n}: free-body explanation must name T, mg and Fe')

    def test_no_duplicates_or_near_clones(self):
        texts = {n: r['text'] for n, r in ROWS.items()}
        self.assertEqual(len(set(texts.values())), len(texts))
        pairs = [(a, b, difflib.SequenceMatcher(None, texts[a], texts[b]).ratio()) for a in texts for b in texts if a < b]
        clones = [(a, b, round(r, 2)) for a, b, r in pairs if r > 0.8]
        self.assertEqual(clones, [])

    def test_harder_than_the_standard_tier(self):
        # STANDARD (difficulty 2–3) questions in Q1–58 are worth at most 3 marks and take 1–2 steps.
        marks = [r['marks'] for r in ROWS.values()]
        self.assertGreaterEqual(min(marks), 3)
        self.assertGreater(sum(marks) / len(marks), 4.5)
        self.assertGreaterEqual(sum(1 for m in marks if m >= 8), 6)


if __name__ == '__main__':
    unittest.main()
