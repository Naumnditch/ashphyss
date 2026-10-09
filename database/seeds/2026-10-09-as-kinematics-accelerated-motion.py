"""Usage: python3 database/seeds/2026-10-09-as-kinematics-accelerated-motion.py \
    database/seeds/2026-10-09-as-kinematics-accelerated-motion.sql \
    components/practice/kinematicsDiagramData.ts

AS Level (Cambridge 9702) Chapter 1 "Kinematics" (1.1-1.8) and Chapter 2
"Accelerated motion" (2.1-2.14): a fresh, tier-ordered 20-question (Q1-Q20)
bank for every one of the 22 lessons, replacing whatever AS questions those
lessons had before. Tiers, in order within each lesson:
  Q1-Q6   Foundation    (difficulty_level 1, 1 mark)
  Q7-Q13  Intermediate  (difficulty_level 2, 2 marks)
  Q14-Q18 Challenging   (difficulty_level 3, multi-part, 3-5 marks)
  Q19-Q20 Stretch       (difficulty_level 4, 9702 Paper 2/4 style, 5-6 marks)

Every numeric answer is computed here from the question's own numbers (never
hand-typed), and every figure is generated from those same numbers via the
parametric components in components/practice/KinematicsDiagrams.tsx — this
script emits both the SQL (problems + problem_options) and the diagram data
file consumed by that component, so a figure can never disagree with its
question. All ids are uuid5, so re-running is a no-op. g = 9.81 m/s^2
throughout, up/right taken positive unless a question states otherwise.

Two lessons are SHARED with other curricula (1.4 lives on the IGCSE "2.2
Distance-time graphs" topic, 1.5 on the Prep Physics "Vectors: Addition &
Resolution" topic) — only their AS-curriculum bank is touched.
"""
import json
import sys
import uuid
from math import pi, sqrt, sin, cos, tan, asin, acos, atan, atan2, radians, degrees, hypot

from _existing_as_rows import EXISTING

G = 9.81  # m/s^2, acceleration of free fall


def uid(name):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f'ashphys/{name}'))


SUP = str.maketrans('-0123456789', '⁻⁰¹²³⁴⁵⁶⁷⁸⁹')


def sf(x, n=3):
    """Formats x to n significant figures the way a worked solution would write it."""
    if x == 0:
        return '0'
    if x < 0:
        return '−' + sf(-x, n)
    e = int(f'{x:e}'.split('e')[1])
    if -3 <= e < 5:
        if e >= n - 1:
            return str(int(round(x, n - 1 - e)))
        return f'{x:.{n - 1 - e}f}'
    m = f'{x / 10**e:.{n - 1}f}'
    return f'{m} × 10{str(e).translate(SUP)}'


def stored(x, n=4):
    """The answer_correct value, plain ASCII, as precise as sf() but parseable."""
    if x == 0:
        return '0'
    neg = x < 0
    x = abs(x)
    e = int(f'{x:e}'.split('e')[1])
    trim = lambda s: s.rstrip('0').rstrip('.') if '.' in s else s
    out = trim(f'{x:.{max(n - 1 - e, 0)}f}') if -3 <= e < 5 else f"{trim(f'{x / 10**e:.{n - 1}f}')}e{e}"
    return f'-{out}' if neg else out


def round_sf(x, n):
    if x == 0:
        return 0.0
    e = int(f'{abs(x):e}'.split('e')[1])
    return round(x, n - 1 - e)


def q(s):
    s = str(s)
    # A literal ';' anywhere in a string value (even safely inside single quotes)
    # hangs this environment's SQL-apply tool, which appears to split on every
    # bare semicolon without regard for quoting. Route any embedded ';' through
    # chr(59) concatenation instead, so the character never appears literally in
    # the emitted SQL text while the stored value is unaffected.
    if ';' not in s:
        return "'" + s.replace("'", "''") + "'"
    parts = s.split(';')
    return '(' + " || chr(59) || ".join("'" + p.replace("'", "''") + "'" for p in parts) + ')'


def opt(v):
    return 'NULL' if v is None else (q(v) if isinstance(v, str) else str(v))


def b(v):
    return 'true' if v else 'false'


# topic id, chapter id, syllabus section title (for syllabus_cite)
LESSONS = {
    '1.1': dict(topic='ffbe7a62-e4c5-4cb6-8a20-6f0177f86d30', chapter='4653a171-76f9-4b44-bc1d-19802787195f', title='Speed'),
    '1.2': dict(topic='cbfde8f1-1390-4f8a-b259-ff4ad9ad516e', chapter='4653a171-76f9-4b44-bc1d-19802787195f', title='Distance and displacement, scalar and vector'),
    '1.3': dict(topic='d47d25c0-5538-419d-9d8f-026400e11f72', chapter='4653a171-76f9-4b44-bc1d-19802787195f', title='Speed and velocity'),
    '1.4': dict(topic='b2e3d430-7699-4dac-9f55-e84c5cd5ce9b', chapter='157573de-e4fd-418b-9e2b-b4772e5fe137', title='Displacement–time graphs'),
    '1.5': dict(topic='11e7164b-e47d-4b4d-8bad-1002c892ba20', chapter='683a1a72-6900-4e3c-a063-dca54eb50d4a', title='Combining displacements'),
    '1.6': dict(topic='0e10f0fa-b4fd-4e02-beba-8c15b05746c1', chapter='4653a171-76f9-4b44-bc1d-19802787195f', title='Combining velocities'),
    '1.7': dict(topic='19109221-dd23-4986-8f92-84b0ea2c6033', chapter='4653a171-76f9-4b44-bc1d-19802787195f', title='Subtracting vectors'),
    '1.8': dict(topic='e1b6c84c-afbc-4845-b67b-d5b6bd15720c', chapter='4653a171-76f9-4b44-bc1d-19802787195f', title='Other examples of scalar and vector quantities'),
    '2.1': dict(topic='8ba3439e-0247-4a40-8f47-a5945e5c2968', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='The meaning of acceleration'),
    '2.2': dict(topic='91cb1c54-423a-4525-a723-99c1e9e9bf6b', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Calculating acceleration'),
    '2.3': dict(topic='cfa4c849-4465-4806-9a6e-29163a3db134', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Units of acceleration'),
    '2.4': dict(topic='5e4207c2-e358-4374-b5ab-92bbcb2b87e7', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Deducing acceleration'),
    '2.5': dict(topic='c47dfb2d-b9eb-482e-b89f-aecbc8e799cc', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Deducing displacement'),
    '2.6': dict(topic='97c777dc-0adf-4df6-bd8f-9c659f0ef783', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Measuring velocity and acceleration'),
    '2.7': dict(topic='c16862d4-9430-4015-95fa-20d7cf89a45d', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Determining velocity and acceleration in the laboratory'),
    '2.8': dict(topic='69f49b38-4492-521c-be78-56effb528ad2', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='The equations of motion'),
    '2.9': dict(topic='69bb568e-7993-444e-9ce8-19ebbd98c526', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Deriving the equations of motion'),
    '2.10': dict(topic='643b6cd1-3fbe-4618-9330-b9d737f06161', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Uniform and non-uniform acceleration'),
    '2.11': dict(topic='e8c99a42-f3ca-45a2-9197-567cfffa1146', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Acceleration caused by gravity'),
    '2.12': dict(topic='f2b48a0f-392d-4e95-bbe4-c2ee1de168d9', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Determining g'),
    '2.13': dict(topic='22a42568-867c-5245-91eb-c50c73e0ecb6', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Motion in two dimensions: projectiles'),
    '2.14': dict(topic='71e8bd3f-97fc-4cc7-9864-8ce994d6e5b6', chapter='ec015167-65fb-47df-b565-1055132ab4f3', title='Understanding projectiles'),
}

TIER_DIFF = {'F': 1, 'I': 2, 'C': 3, 'S': 4}
TIER_RANGE = {'F': range(1, 7), 'I': range(7, 14), 'C': range(14, 19), 'S': range(19, 21)}

questions = []  # one dict per question
diagrams = {}   # bare key (no "diagram:" prefix) -> {kind, props}
counters = {}   # code -> next question number


def fig(code, key_suffix, diagram_kind, **props):
    """Registers a parametric figure and returns its question_image_url value."""
    key = f'kin-{code}-{key_suffix}'
    diagrams[key] = dict(kind=diagram_kind, props=props)
    return f'diagram:{key}'


def add(code, tier, text, explanation, answer=None, unit=None, figure=None,
        kind='numeric', options=None, correct_idx=None, tolerance=None,
        sign_sensitive=False, unit_required=False, alternates=None, marks=None):
    """Registers one question. tier: 'F'|'I'|'C'|'S'. figure must be built with fig() using this same code."""
    L = LESSONS[code]
    n = counters[code] = counters.get(code, 0) + 1
    assert n in TIER_RANGE[tier], f'{code} #{n}: tier {tier} does not cover slot {n}'
    diff = TIER_DIFF[tier]
    default_marks = {'F': 1, 'I': 2, 'C': 4, 'S': 6}[tier]
    row = dict(
        id=uid(f'problem/as/kin-accel-2026-10-09/{L["topic"]}/{n}'),
        topic=L['topic'], chapter=L['chapter'], code=code,
        cite=f"9702 {code} {L['title']}", number=n, text=text, figure=figure,
        kind=kind, difficulty=diff, marks=marks if marks is not None else default_marks,
        explanation=explanation,
    )
    if kind == 'numeric':
        assert answer is not None, f'{code} #{n}: numeric question needs an answer'
        # A student typing the answer to 2 s.f. (as Cambridge mark schemes do) must
        # still grade correct. The default 2% tolerance is too tight for that whenever
        # the 2-s.f. rounding error itself exceeds ~1.8%, so bump it to 5% there.
        if tolerance is None and answer != 0:
            rel_error = abs(round_sf(answer, 2) - answer) / abs(answer)
            if rel_error > 0.018:
                tolerance = 0.05
        # The grader resolves a handful of prefixed units (km, cm, mm...) down to
        # their SI base unit via a real unit-conversion factor, so a bare stored
        # value in one of THOSE units (rather than already in the base unit) would
        # grade wrong against a student who typed the unit. Embedding the unit into
        # the stored string itself (parsed the same way a student's own answer is)
        # sidesteps this: the grader then scales it correctly either way, and
        # unit=None avoids double-printing the unit in the displayed answer.
        stored_answer = stored(answer)
        stored_unit = unit
        if unit in ('km', 'cm', 'mm'):
            stored_answer = f'{stored_answer} {unit}'
            stored_unit = None
        row.update(answer=stored_answer, unit=stored_unit, tolerance=tolerance, sign=sign_sensitive,
                    unit_required=unit_required, alternates=alternates or [], value=answer)
    else:
        assert options and correct_idx is not None
        assert len(options) == 4, f'{code} #{n}: MCQ needs exactly 4 options'
        row.update(options=options, correct_idx=correct_idx, answer=options[correct_idx])
    questions.append(row)
    return row


# ════════════════════════════════════════════════════════════════════════
# 1.1 Speed
# ════════════════════════════════════════════════════════════════════════
add('1.1', 'F',
    'Which of these is the correct definition of average speed?',
    'Speed is a scalar: average speed = total distance travelled ÷ total time taken. It does not need a direction, unlike velocity, which uses displacement instead of distance. Common mistake: confusing this with the definition of velocity.',
    kind='multiple_choice',
    options=['distance travelled divided by the time taken', 'displacement divided by the time taken',
             'the rate of change of velocity', 'distance travelled multiplied by the time taken'],
    correct_idx=0)

v_f2 = 90 / 1.5
add('1.1', 'F', 'A car travels 90 km in 1.5 h at a constant speed. Calculate its speed, in km/h.',
    f'speed = distance ÷ time = 90 ÷ 1.5 = {sf(v_f2)} km/h. Common mistake: dividing time by distance instead of distance by time.',
    answer=v_f2, unit='km/h', figure=fig('1.1', 'q2', 'path', legs=[{'distance': 90, 'dir': 1, 'label': '90 km'}], unit='km'))

v_f3 = 400 / 50
add('1.1', 'F', "A runner completes a 400 m race in 50 s at a constant pace. Calculate the runner's average speed, in m/s.",
    f'speed = distance ÷ time = 400 ÷ 50 = {sf(v_f3)} m/s. Common mistake: thinking you need the pace at one instant — the AVERAGE speed over the whole race only needs the total distance and total time.',
    answer=v_f3, unit='m/s', figure=fig('1.1', 'q3', 'path', legs=[{'distance': 400, 'dir': 1, 'label': '400 m'}], unit='m'))

v_f4 = 20 * 3.6
add('1.1', 'F', 'Convert a speed of 20 m/s into km/h.',
    f'1 m/s = 3.6 km/h, since 1000 m = 1 km and 1 h = 3600 s. 20 × 3.6 = {sf(v_f4)} km/h. Common mistake: multiplying by 3.6 when converting the other way (km/h → m/s), where you should divide.',
    answer=v_f4, unit='km/h')

v_f5 = 108 / 3.6
add('1.1', 'F', 'Convert a speed of 108 km/h into m/s.',
    f'To convert km/h to m/s, divide by 3.6: 108 ÷ 3.6 = {sf(v_f5)} m/s. Common mistake: dividing by 3.6 the wrong way round, or using 1000/60 instead of 1000/3600.',
    answer=v_f5, unit='m/s')

t_f6 = 1000 / 3.0e8
add('1.1', 'F', 'Light travels at 3.0 × 10⁸ m/s in a vacuum. Calculate the time taken for light to travel 1.00 km.',
    f't = distance ÷ speed = 1000 ÷ (3.0 × 10⁸) = {sf(t_f6)} s. Common mistake: forgetting to convert 1.00 km to 1000 m before dividing by a speed given in m/s.',
    answer=t_f6, unit='s')

t1_q7, t2_q7 = 40 / 60, 20 / 60
v_q7 = 20 / (t1_q7 + t2_q7)
add('1.1', 'I', 'A cyclist rides 12 km in 40 minutes, then a further 8 km in 20 minutes, both in the same direction. Calculate the average speed for the whole 20 km journey, in km/h.',
    f'Total distance = 12 + 8 = 20 km. Total time = 40 + 20 = 60 min = {sf(t1_q7 + t2_q7)} h. Average speed = 20 ÷ {sf(t1_q7 + t2_q7)} = {sf(v_q7)} km/h. Common mistake: averaging the two leg speeds (18 km/h and 24 km/h gives 21 km/h) instead of using total distance ÷ total time — these only agree when both legs take equal time.',
    answer=v_q7, unit='km/h',
    figure=fig('1.1', 'q7', 'path', legs=[{'distance': 12, 'dir': 1, 'label': '12 km, 40 min'}, {'distance': 8, 'dir': 1, 'label': '8 km, 20 min'}], unit='km'))

add('1.1', 'I', "A car's speedometer reads 54 km/h as it passes a checkpoint, but police radar measures its average speed over the previous 10 km at only 40 km/h. Which statement best explains this?",
    'Instantaneous speed (what a speedometer shows) is the speed at one moment; average speed is total distance ÷ total time over a stretch of road, which is pulled down by any slower sections (traffic, bends, hills). The two need not match. Common mistake: assuming a single instantaneous reading must equal a calculated average.',
    kind='multiple_choice',
    options=['The speedometer gives the instantaneous speed at that moment, which can be higher than the average speed over a slower stretch of road',
             'The speedometer must be faulty', 'Average speed is always higher than instantaneous speed', 'Speed and distance cannot be compared this way'],
    correct_idx=0)

mean_v_q9 = (20 + 50) / 2
d_q9 = mean_v_q9 * 30
add('1.1', 'I', "A train's speed increases steadily from 20 m/s to 50 m/s over 30 s. Using the fact that for a steady increase the average speed equals the mean of the initial and final speeds, calculate the distance travelled.",
    f'Because the speed increases steadily, the average speed is the mean of the two values: (20 + 50) ÷ 2 = {sf(mean_v_q9)} m/s. Distance = average speed × time = {sf(mean_v_q9)} × 30 = {sf(d_q9)} m. Common mistake: using only the final speed (giving 1500 m, too high) or only the initial speed (giving 600 m, too low).',
    answer=d_q9, unit='m',
    figure=fig('1.1', 'q9', 'motion', kind='velocity',
               points=[{'t': 0, 'y': 20}, {'t': 30, 'y': 50}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s',
               shade={'t0': 0, 't1': 30, 'label': 'distance = area'}))

total_q10 = 340 * 0.50
d_q10 = total_q10 / 2
add('1.1', 'I', 'You shout towards a cliff and hear the echo 0.50 s later. Taking the speed of sound in air as 340 m/s, calculate your distance from the cliff.',
    f'The sound travels to the cliff and back in 0.50 s, so the total path length is 340 × 0.50 = {sf(total_q10)} m. The distance to the cliff is half of this: {sf(total_q10)} ÷ 2 = {sf(d_q10)} m. Common mistake: forgetting the sound makes a round trip, and using the full {sf(total_q10)} m as the distance to the cliff.',
    answer=d_q10, unit='m',
    figure=fig('1.1', 'q10', 'path', legs=[{'distance': d_q10, 'dir': 1, 'label': f'{sf(d_q10)} m, shout'}, {'distance': d_q10, 'dir': -1, 'label': 'echo returns'}], unit='m'))

v_q11 = 100 / 9.58
add('1.1', 'I', "Usain Bolt's 100 m world record is 9.58 s. Calculate his average speed over the race, in m/s, to 3 significant figures.",
    f'speed = 100 ÷ 9.58 = {sf(v_q11)} m/s. This is his AVERAGE speed over the whole race — his peak instantaneous speed partway through is higher, close to 12 m/s, because he is still accelerating during the first couple of seconds. Common mistake: rounding the time too early and losing a significant figure the question asks for.',
    answer=v_q11, unit='m/s',
    figure=fig('1.1', 'q11', 'path', legs=[{'distance': 100, 'dir': 1, 'label': '100 m in 9.58 s'}], unit='m'))

t_q12_s = 5.0 / 0.014
t_q12_min = t_q12_s / 60
add('1.1', 'I', 'A garden snail moves at a constant 0.014 m/s. Calculate the time, in minutes, for it to cross a 5.0 m path.',
    f't = distance ÷ speed = 5.0 ÷ 0.014 = {sf(t_q12_s)} s. Converting to minutes: {sf(t_q12_s)} ÷ 60 = {sf(t_q12_min)} min. Common mistake: leaving the answer in seconds when the question asks for minutes.',
    answer=t_q12_min, unit='min',
    figure=fig('1.1', 'q12', 'path', legs=[{'distance': 5.0, 'dir': 1, 'label': '5.0 m'}], unit='m'))

t_q13_s = 1.50e11 / 1.2e4
t_q13_h = t_q13_s / 3600
add('1.1', 'I', 'A spacecraft travels at a constant 1.2 × 10⁴ m/s. Calculate the time, in hours, for it to travel one astronomical unit (1 AU = 1.50 × 10¹¹ m).',
    f't = distance ÷ speed = (1.50 × 10¹¹) ÷ (1.2 × 10⁴) = {sf(t_q13_s)} s. In hours: {sf(t_q13_s)} ÷ 3600 = {sf(t_q13_h)} h (about {sf(t_q13_h / 24, 2)} days). Common mistake: mishandling the powers of ten when dividing two numbers in standard form.',
    answer=t_q13_h, unit='h')

t1_q14, t2_q14 = 4.0 / 8.0, 4.0 / 12.0
avg_q14 = 8.0 / (t1_q14 + t2_q14)
add('1.1', 'C', 'A ferry crosses a 4.0 km wide channel. (a) Calculate the time for the outward crossing at an average speed of 8.0 km/h. (b) Calculate the time for the return crossing, along the same route, at an average speed of 12 km/h. (c) Calculate the average speed for the whole round trip. Give only the answer to (c).',
    f'(a) t₁ = 4.0 ÷ 8.0 = {sf(t1_q14)} h. (b) t₂ = 4.0 ÷ 12 = {sf(t2_q14)} h. (c) Average speed = total distance ÷ total time = 8.0 ÷ ({sf(t1_q14)} + {sf(t2_q14)}) = 8.0 ÷ {sf(t1_q14 + t2_q14)} = {sf(avg_q14)} km/h. Common mistake: simply averaging 8.0 and 12 km/h to get 10 km/h — valid only if the two legs take equal TIME, not equal distance; the slower leg here takes longer, pulling the true average below the simple mean.',
    answer=avg_q14, unit='km/h',
    figure=fig('1.1', 'q14', 'path', legs=[{'distance': 4.0, 'dir': 1, 'label': '4.0 km @ 8.0 km/h'}, {'distance': 4.0, 'dir': -1, 'label': '4.0 km @ 12 km/h'}], unit='km'))

t1_q15, t2_q15 = 30 / 90, 15 / 30
avg_q15 = 45 / (t1_q15 + t2_q15)
add('1.1', 'C', 'A 45 km train journey is covered as follows: (a) the first 30 km at a constant 90 km/h, then (b) the remaining 15 km at a constant 30 km/h due to a speed restriction. (c) Calculate the average speed for the whole 45 km journey.',
    f'(a) t₁ = 30 ÷ 90 = {sf(t1_q15)} h. (b) t₂ = 15 ÷ 30 = {sf(t2_q15)} h. (c) Average speed = total distance ÷ total time = 45 ÷ ({sf(t1_q15)} + {sf(t2_q15)}) = 45 ÷ {sf(t1_q15 + t2_q15)} = {sf(avg_q15)} km/h. Common mistake: averaging 90 and 30 km/h to get 60 km/h — wrong, because the slow leg lasts longer (0.50 h vs 0.33 h) and so counts for more of the journey.',
    answer=avg_q15, unit='km/h',
    figure=fig('1.1', 'q15', 'path', legs=[{'distance': 30, 'dir': 1, 'label': '30 km @ 90 km/h'}, {'distance': 15, 'dir': 1, 'label': '15 km @ 30 km/h'}], unit='km'))

t1_q16 = 560000 / 306
t2_q16 = 5.0e6 / 680
total_q16_s = t1_q16 + t2_q16
total_q16_h = total_q16_s / 3600
add('1.1', 'C', 'Concorde flew the 5560 km from London to New York, covering 560 km total during climb and descent at an average 306 m/s, and the remaining distance at a cruising speed of 680 m/s. Calculate the total flight time, in hours, to 3 significant figures.',
    f'(a) Climb/descent: t₁ = 560 000 ÷ 306 = {sf(t1_q16)} s. (b) Cruise distance = 5560 − 560 = 5000 km = 5.0 × 10⁶ m; t₂ = (5.0 × 10⁶) ÷ 680 = {sf(t2_q16)} s. (c) Total time = {sf(t1_q16)} + {sf(t2_q16)} = {sf(total_q16_s)} s = {sf(total_q16_h)} h. Common mistake: forgetting to convert km to m before dividing by a speed given in m/s.',
    answer=total_q16_h, unit='h',
    figure=fig('1.1', 'q16', 'path', legs=[{'distance': 560, 'dir': 1, 'label': '560 km @ 306 m/s'}, {'distance': 5000, 'dir': 1, 'label': '5000 km @ 680 m/s'}], unit='km'))

t1_q17, nap_q17, t3_q17 = 100 / 8.0, 1800, 900 / 10
hare_total_q17 = t1_q17 + nap_q17 + t3_q17
tortoise_total_q17 = 1000 / 0.60
diff_q17 = hare_total_q17 - tortoise_total_q17
add('1.1', 'C', 'In a 1000 m race: the hare runs the first 100 m at 8.0 m/s, then stops for a 1800 s nap, then sprints the final 900 m at 10 m/s. The tortoise walks the whole 1000 m at a steady 0.60 m/s. (a) Calculate the hare’s total time. (b) Calculate the tortoise’s total time. (c) By how many seconds does the tortoise win?',
    f'(a) Hare: t₁ = 100 ÷ 8.0 = {sf(t1_q17)} s running, plus the 1800 s nap, plus t₃ = 900 ÷ 10 = {sf(t3_q17)} s sprinting. Total = {sf(t1_q17)} + 1800 + {sf(t3_q17)} = {sf(hare_total_q17)} s. (b) Tortoise: t = 1000 ÷ 0.60 = {sf(tortoise_total_q17)} s. (c) The tortoise wins by {sf(hare_total_q17)} − {sf(tortoise_total_q17)} = {sf(diff_q17)} s. Common mistake: forgetting that the nap counts towards the hare’s total time even though no distance is covered during it.',
    answer=diff_q17, unit='s',
    figure=fig('1.1', 'q17', 'table', headers=['Stage', 'Hare', 'Tortoise'],
               rows=[['Leg 1', '100 m @ 8.0 m/s', '1000 m @ 0.60 m/s'], ['Pause', '1800 s nap', '—'], ['Leg 2', '900 m @ 10 m/s', '—'],
                     ['Total time', f'{sf(hare_total_q17)} s', f'{sf(tortoise_total_q17)} s']]))

speed1_q18 = 18.0 / (24 / 60)
speed2_q18 = 14.0 / (36 / 60)
avg_q18 = (18.0 + 14.0) / 1.00
add('1.1', 'C', "A ship's GPS log shows: in the first 24 minutes it covers 18.0 km on one heading; it then changes course, and over the following 36 minutes it covers a further 14.0 km on the new heading. (a) Calculate the speed on the first leg, in km/h. (b) Calculate the speed on the second leg, in km/h. (c) Calculate the average speed for the whole hour.",
    f'(a) Leg 1: time = 24 min = 0.400 h, speed = 18.0 ÷ 0.400 = {sf(speed1_q18)} km/h. (b) Leg 2: time = 36 min = 0.600 h, speed = 14.0 ÷ 0.600 = {sf(speed2_q18)} km/h. (c) The two legs total exactly 60 minutes, so the average speed for the hour is simply the total distance covered in it: (18.0 + 14.0) ÷ 1.00 = {sf(avg_q18)} km/h. Common mistake: averaging the two leg speeds instead of using total distance ÷ total time — they only agree here because the legs happen to total exactly 60 minutes.',
    answer=avg_q18, unit='km/h',
    figure=fig('1.1', 'q18', 'path', legs=[{'distance': 18.0, 'dir': 1, 'label': '18.0 km, 24 min'}, {'distance': 14.0, 'dir': 1, 'label': '14.0 km, 36 min'}], unit='km'))

avg_q19 = 2 * 40 * 60 / (40 + 60)
add('1.1', 'S', 'A journey is split into two equal DISTANCES d, travelled at constant speeds v₁ and v₂ respectively. Show that the average speed for the whole journey is 2v₁v₂/(v₁+v₂) — the harmonic mean, NOT the simple mean (v₁+v₂)/2. Then calculate this average speed for v₁ = 40 km/h and v₂ = 60 km/h.',
    f'Time for each leg: t₁ = d/v₁, t₂ = d/v₂. Total distance = 2d. Total time = d/v₁ + d/v₂ = d(v₁+v₂)/(v₁v₂). Average speed = total distance ÷ total time = 2d ÷ [d(v₁+v₂)/(v₁v₂)] = 2v₁v₂/(v₁+v₂) — the d cancels, so the result depends only on the two speeds. For v₁ = 40, v₂ = 60: average = (2 × 40 × 60) ÷ 100 = {sf(avg_q19)} km/h. Common mistake: quoting the simple mean (40+60)/2 = 50 km/h, which is only the correct average when the two legs take equal TIME, not equal distance — more time is spent at the slower speed when the distances match, which pulls the true average below 50.',
    answer=avg_q19, unit='km/h',
    figure=fig('1.1', 'q19', 'path', legs=[{'distance': 50, 'dir': 1, 'label': 'd @ v₁ = 40 km/h'}, {'distance': 50, 'dir': 1, 'label': 'd @ v₂ = 60 km/h'}], unit=''))

year_s_q20 = 365.25 * 24 * 3600
ly_q20 = 2.998e8 * year_s_q20
ratio_q20 = ly_q20 / 1.496e11
add('1.1', 'S', 'Taking the speed of light as exactly 2.998 × 10⁸ m/s and one year as 365.25 days, calculate the distance represented by one light-year, in metres. Then estimate, to the nearest order of magnitude, how many Earth–Sun distances (1 AU = 1.496 × 10¹¹ m) this represents.',
    f'1 year = 365.25 × 24 × 3600 = {sf(year_s_q20)} s. 1 light-year = c × t = (2.998 × 10⁸) × {sf(year_s_q20)} = {sf(ly_q20)} m. Comparing to 1 AU: {sf(ly_q20)} ÷ (1.496 × 10¹¹) = {sf(ratio_q20)} — of order 10⁵ AU. Common mistake: quoting the AU comparison as the final answer instead of the light-year distance the question actually asks for, or using 365 whole days (a small error here, but bad practice generally).',
    answer=ly_q20, unit='m')


# ════════════════════════════════════════════════════════════════════════
# 1.2 Distance and displacement, scalar and vector
# ════════════════════════════════════════════════════════════════════════
add('1.2', 'F', 'Which pair correctly classifies distance and displacement?',
    'Distance is a scalar (size only, no direction). Displacement is a vector (size AND direction, measured in a straight line from start to finish). Common mistake: assuming both are vectors because both are "lengths".',
    kind='multiple_choice', options=['Distance is a scalar; displacement is a vector', 'Both are scalars', 'Both are vectors', 'Distance is a vector; displacement is a scalar'], correct_idx=0)

add('1.2', 'F', 'A person walks 300 m east, then walks 300 m back west to their starting point. Calculate the magnitude of their displacement.',
    'Displacement is measured from the start to the final position in a straight line. The walker ends up exactly where they started, so the displacement is 0 m, even though the total distance walked is 300 + 300 = 600 m. Common mistake: giving the distance (600 m) instead of the displacement.',
    answer=0, unit='m',
    figure=fig('1.2', 'q2', 'path', legs=[{'distance': 300, 'dir': 1, 'label': '300 m east'}, {'distance': 300, 'dir': -1, 'label': '300 m west'}], unit='m'))

add('1.2', 'F', 'A cyclist rides 500 m along a straight road without changing direction. State the magnitude of the displacement.',
    'When the whole journey is in a straight line with no reversal, distance and displacement have the same magnitude: 500 m. Common mistake: thinking displacement must always be smaller than distance — they are equal whenever the path never turns back on itself.',
    answer=500, unit='m')

add('1.2', 'F', 'Which of the following is a vector quantity?',
    'A vector needs both a size AND a direction. Displacement has both; mass, distance and time are scalars — each is fully described by a single number with a unit. Common mistake: calling distance a vector because it has units of length, like displacement.',
    kind='multiple_choice', options=['displacement', 'mass', 'distance', 'time'], correct_idx=0)

add('1.2', 'F', 'An object moves 8 m east, then a further 6 m east. Calculate the magnitude of its total displacement.',
    'Both legs are in the same direction, so they add directly: 8 + 6 = 14 m east. Common mistake: treating this like a right-angle problem and using Pythagoras, when the two legs are actually parallel.',
    answer=14, unit='m', figure=fig('1.2', 'q5', 'path', legs=[{'distance': 8, 'dir': 1, 'label': '8 m east'}, {'distance': 6, 'dir': 1, 'label': '6 m east'}], unit='m'))

d_q6 = 4.0 + 3.0 + 2.0
add('1.2', 'F', 'A hiker walks 4.0 m north, then 3.0 m further north, then 2.0 m south. Calculate the total distance walked.',
    f'Distance just adds up every length covered, regardless of direction: 4.0 + 3.0 + 2.0 = {sf(d_q6)} m. (The displacement is smaller, 5.0 m north, since the final 2.0 m southward partly cancels the earlier northward motion — but distance does not care about direction.) Common mistake: subtracting the southward leg to get 5.0 m, which is the displacement, not the distance.',
    answer=d_q6, unit='m',
    figure=fig('1.2', 'q6', 'path', legs=[{'distance': 4.0, 'dir': 1, 'label': '4.0 m N'}, {'distance': 3.0, 'dir': 1, 'label': '3.0 m N'}, {'distance': 2.0, 'dir': -1, 'label': '2.0 m S'}], unit='m'))

mag_q7 = hypot(300, 400)
add('1.2', 'I', 'A delivery drone flies 300 m east, then 400 m north. Calculate the magnitude of its total displacement.',
    f'The two legs are perpendicular, so the resultant displacement is the hypotenuse of a right triangle: magnitude = √(300² + 400²) = √(90000 + 160000) = √250000 = {sf(mag_q7)} m. Common mistake: adding the two distances directly (300 + 400 = 700 m) instead of combining them as vectors at right angles.',
    answer=mag_q7, unit='m',
    figure=fig('1.2', 'q7', 'vector', vectors=[{'magnitude': 300, 'angleDeg': 0, 'label': '300 m E'}, {'magnitude': 400, 'angleDeg': 90, 'label': '400 m N'}], mode='tipToTail', resultant={'label': 'resultant'}))

add('1.2', 'I', 'A runner completes one full lap of a 400 m circular track, finishing at the exact point where they started. Which statement is correct?',
    'Distance is the total length of the path actually covered: 400 m, the full circumference. Displacement is the straight-line separation between start and finish, which is 0 m because the runner returns to the starting point. Common mistake: assuming the distance must also be 0 because the runner "didn’t go anywhere" overall.',
    kind='multiple_choice',
    options=['Distance = 400 m, displacement = 0 m', 'Distance = 0 m, displacement = 400 m', 'Both distance and displacement are 400 m', 'Both distance and displacement are 0 m'],
    correct_idx=0)

disp_q9 = 3.0 + 4.0 - 2.0
add('1.2', 'I', 'A car travels 3.0 km east, then 4.0 km further east, then 2.0 km west. Calculate the magnitude of the final displacement from the start.',
    f'Taking east as positive: 3.0 + 4.0 − 2.0 = {sf(disp_q9)} km east. (The total distance travelled is larger, 3.0 + 4.0 + 2.0 = 9.0 km, because distance ignores the cancellation from reversing direction.) Common mistake: adding all three legs regardless of direction, which gives the distance (9.0 km) rather than the displacement.',
    answer=disp_q9, unit='km',
    figure=fig('1.2', 'q9', 'path', legs=[{'distance': 3.0, 'dir': 1, 'label': '3.0 km E'}, {'distance': 4.0, 'dir': 1, 'label': '4.0 km E'}, {'distance': 2.0, 'dir': -1, 'label': '2.0 km W'}], unit='km'))

add('1.2', 'I', 'Which of these statements about distance and displacement is FALSE?',
    'Distance can never be less than the magnitude of displacement, because displacement is the most direct (shortest) way between two points — any real path can only be the same length or longer. The false statement here is the one claiming displacement can exceed distance. Common mistake: picking a true statement by not reading "FALSE" carefully.',
    kind='multiple_choice',
    options=['The magnitude of displacement can be greater than the distance travelled', 'Distance is always greater than or equal to the magnitude of displacement',
             'Displacement has a direction; distance does not', 'If a journey has no change of direction, distance equals the magnitude of displacement'],
    correct_idx=0)

disp_q11 = hypot(8.0, 8.0)
add('1.2', 'I', "An ant walks from one corner of a square plot of side 8.0 m, along two adjacent sides, to the opposite corner. Calculate the magnitude of the ant's displacement.",
    f'The two sides are perpendicular, so the displacement is the diagonal of the square: √(8.0² + 8.0²) = √128 = {sf(disp_q11)} m. (The distance walked is 8.0 + 8.0 = 16 m, almost 1.4 times the displacement — this ratio, √2, appears whenever a right-angle path is cut by its own diagonal.) Common mistake: giving the distance (16 m) instead of the diagonal displacement.',
    answer=disp_q11, unit='m',
    figure=fig('1.2', 'q11', 'vector', vectors=[{'magnitude': 8.0, 'angleDeg': 0, 'label': '8.0 m'}, {'magnitude': 8.0, 'angleDeg': 90, 'label': '8.0 m'}], mode='tipToTail', resultant={'label': 'displacement'}))

mag_q12 = hypot(40, 30)
add('1.2', 'I', 'A ship sails 40 km south, then 30 km west. Calculate the magnitude of the resultant displacement.',
    f'magnitude = √(40² + 30²) = √(1600 + 900) = √2500 = {sf(mag_q12)} m... careful with units: = {sf(mag_q12)} km. This is a 3–4–5 triangle scaled by 10. Common mistake: forgetting that south and west are perpendicular and simply adding 40 + 30 = 70 km.',
    answer=mag_q12, unit='km',
    figure=fig('1.2', 'q12', 'vector', vectors=[{'magnitude': 40, 'angleDeg': 270, 'label': '40 km S'}, {'magnitude': 30, 'angleDeg': 180, 'label': '30 km W'}], mode='tipToTail', resultant={'label': 'resultant'}, compass=True))

add('1.2', 'I', 'Why can the magnitude of a displacement never be greater than the total distance travelled, but can be equal to it?',
    'The displacement is the length of the single straight line directly from the start to the finish — the shortest possible route between those two points. Any real path (the distance) can only match that straight line (if it never changes direction) or be longer (if it curves, loops back, or reverses at all). Common mistake: thinking a very winding path could somehow produce a displacement exceeding the ground actually covered.',
    kind='multiple_choice',
    options=['A straight line between two points is the shortest possible path, so distance (the actual path) is always at least as long as displacement (the straight-line separation)',
             'Displacement always measures only half of the distance travelled', 'Distance and displacement measure completely unrelated things with no general relationship',
             'Displacement is always exactly the distance divided by two'],
    correct_idx=0)

diag_q14 = hypot(6.0, 8.0)
total_q14 = 6.0 + 8.0 + diag_q14
add('1.2', 'C', 'A robot vacuum starts at a corner of a rectangular room 6.0 m by 8.0 m. It travels along one wall to the next corner (6.0 m), then along the adjacent wall to the far corner (8.0 m), then travels in a straight line directly back to its start. (a) Calculate the length of the straight diagonal return leg. (b) Calculate the total distance for the whole trip. Give only the answer to (b).',
    f'(a) The two walls are perpendicular, so the diagonal is the hypotenuse: √(6.0² + 8.0²) = √(36+64) = √100 = {sf(diag_q14)} m (a 3-4-5 triangle scaled by 2). (b) Total distance = 6.0 + 8.0 + {sf(diag_q14)} = {sf(total_q14)} m. Common mistake: using the diagonal as the room’s displacement from the START, forgetting the robot returns to its start, so its overall displacement for the whole trip is actually zero even though the distance is 24 m.',
    answer=total_q14, unit='m',
    figure=fig('1.2', 'q14', 'vector', vectors=[{'magnitude': 6.0, 'angleDeg': 0, 'label': '6.0 m'}, {'magnitude': 8.0, 'angleDeg': 90, 'label': '8.0 m'}], mode='tipToTail', resultant={'label': 'diagonal, 10 m'}))

north_q15 = sqrt(13.0**2 - 5.0**2)
total_q15 = 5.0 + north_q15
diff_q15 = total_q15 - 13.0
add('1.2', 'C', 'A sailor travels 5.0 km due east, then a further distance X due north. The magnitude of the resulting displacement is measured as 13.0 km. (a) Use Pythagoras to find X. (b) Hence find the total distance sailed. (c) By how much does the total distance exceed the magnitude of the displacement? Give only the answer to (c).',
    f'(a) The eastward leg, northward leg X and the 13.0 km displacement form a right triangle: 5.0² + X² = 13.0², so X² = 169 − 25 = 144 and X = {sf(north_q15)} km (a 5-12-13 triangle). (b) Total distance = 5.0 + {sf(north_q15)} = {sf(total_q15)} km. (c) Excess = {sf(total_q15)} − 13.0 = {sf(diff_q15)} km. Common mistake: adding 5.0 and 13.0 directly, or forgetting X is found from the DIFFERENCE of squares, not their sum.',
    answer=diff_q15, unit='km',
    figure=fig('1.2', 'q15', 'vector', vectors=[{'magnitude': 5.0, 'angleDeg': 0, 'label': '5.0 km E'}, {'magnitude': 12.0, 'angleDeg': 90, 'label': 'X (north)'}], mode='tipToTail', resultant={'label': '13.0 km'}))

netN_q16, netE_q16 = 300 - 100, 400 - 100
mag_q16 = hypot(netN_q16, netE_q16)
add('1.2', 'C', 'An orienteer runs 300 m north, then 400 m east, then 100 m south, then 100 m west. (a) Calculate the net north-south component of the displacement. (b) Calculate the net east-west component. (c) Calculate the magnitude of the resultant displacement. Give only the answer to (c), to 3 significant figures.',
    f'(a) North-south: taking north as positive, 300 − 100 = {sf(netN_q16)} m north. (b) East-west: taking east as positive, 400 − 100 = {sf(netE_q16)} m east. (c) These two components are perpendicular, so the resultant magnitude is √({sf(netN_q16)}² + {sf(netE_q16)}²) = {sf(mag_q16)} m. Common mistake: adding all four leg lengths (300+400+100+100 = 900 m, the total distance) instead of first finding the net N-S and E-W components.',
    answer=mag_q16, unit='m',
    figure=fig('1.2', 'q16', 'vector', vectors=[{'magnitude': 300, 'angleDeg': 90, 'label': '300 m N'}, {'magnitude': 400, 'angleDeg': 0, 'label': '400 m E'}, {'magnitude': 100, 'angleDeg': 270, 'label': '100 m S'}, {'magnitude': 100, 'angleDeg': 180, 'label': '100 m W'}], mode='tipToTail', resultant={'label': 'resultant'}))

t_q17_h = 12.0 / 10.0
t_q17_min = t_q17_h * 60
add('1.2', 'C', "A runner's GPS watch records a total distance of 12.0 km for a looped route with a shortcut, covered at an average speed of 10.0 km/h. The runner's displacement from start to finish is only 500 m, because the loop almost closes. (a) Calculate the time taken, in minutes. (b) Explain why the displacement is so much smaller than the distance. Give only the numerical answer to (a).",
    f'(a) time = distance ÷ speed = 12.0 ÷ 10.0 = {sf(t_q17_h)} h = {sf(t_q17_min)} minutes. (b) The route loops around and nearly returns to the start, so most of the distance covered cancels out vectorially, leaving only a small net straight-line separation (500 m) between the start and finish points. Common mistake: using the displacement (500 m) instead of the distance (12.0 km) when finding the time from the average speed — average speed is always distance ÷ time, never displacement ÷ time (that combination defines average velocity instead).',
    answer=t_q17_min, unit='min')

dist_q18 = 2.0 + 2.0 + 2.0
disp_q18 = 2.0
pct_q18 = (dist_q18 - disp_q18) / disp_q18 * 100
add('1.2', 'C', 'A hiker walks 2.0 km on a bearing of 000° (due north), then 2.0 km on a bearing of 090° (due east), then 2.0 km on a bearing of 180° (due south). (a) Calculate the total distance walked. (b) Calculate the magnitude of the final displacement. (c) By what percentage does the distance exceed the displacement? Give only the answer to (c).',
    f'(a) Distance = 2.0 + 2.0 + 2.0 = {sf(dist_q18)} km. (b) The first and third legs are due north and due south — equal and opposite, so they cancel completely, leaving only the eastward leg: displacement = {sf(disp_q18)} km east. (c) Percentage excess = ({sf(dist_q18)} − {sf(disp_q18)}) ÷ {sf(disp_q18)} × 100% = {sf(pct_q18)}%. Common mistake: forgetting that the north and south legs cancel exactly (they are equal in size and opposite in direction), and instead adding all three legs as if they all pointed the same way.',
    answer=pct_q18, unit='%',
    figure=fig('1.2', 'q18', 'vector', vectors=[{'magnitude': 2.0, 'angleDeg': 90, 'label': '2.0 km N'}, {'magnitude': 2.0, 'angleDeg': 0, 'label': '2.0 km E'}, {'magnitude': 2.0, 'angleDeg': 270, 'label': '2.0 km S'}], mode='tipToTail', resultant={'label': 'displacement'}))

netx_q19, nety_q19 = 40 - 40, 30 - 10
mag_q19 = hypot(netx_q19, nety_q19)
dist_q19 = 40 + 30 + 40 + 10
add('1.2', 'S', "A robotic arm's gripper traces a path described by four successive displacement vectors, in cm: (+40, 0), (0, +30), (−40, 0), (0, −10), where the first number is the horizontal (x) component and the second is the vertical (y) component. (a) Calculate the total distance travelled by the gripper. (b) Calculate the magnitude of the net displacement from its starting point. Give only the answer to (b).",
    f'(a) Distance sums the LENGTH of every leg regardless of sign: 40 + 30 + 40 + 10 = {sf(dist_q19)} cm. (b) Displacement sums each direction’s components algebraically: net x = 40 − 40 = {sf(netx_q19)} cm, net y = 30 − 10 = {sf(nety_q19)} cm. Since net x is zero, the net displacement is purely vertical: magnitude = {sf(mag_q19)} cm. Common mistake: treating the return leg of −40 cm in x as adding to the distance in the same direction as the first leg, rather than recognising it reverses that component (it still adds 40 cm to the DISTANCE, but subtracts 40 cm from the x-DISPLACEMENT).',
    answer=mag_q19, unit='cm',
    figure=fig('1.2', 'q19', 'vector', vectors=[{'magnitude': 40, 'angleDeg': 0, 'label': '+40 cm'}, {'magnitude': 30, 'angleDeg': 90, 'label': '+30 cm'}, {'magnitude': 40, 'angleDeg': 180, 'label': '−40 cm'}, {'magnitude': 10, 'angleDeg': 270, 'label': '−10 cm'}], mode='tipToTail', resultant={'label': 'net displacement'}))

dist_q20 = 2500 * 2 * 0.015
add('1.2', 'S', 'A point on a vibrating guitar string oscillates back and forth between two extreme positions a distance L apart, completing a whole number of full return trips so that it starts and finishes at the same point (zero overall displacement). Write an expression for the total distance travelled after n complete return trips, in terms of n and L, and evaluate it for n = 2500 and L = 0.015 m.',
    f'One complete return trip covers the gap twice (there and back), so it covers a distance of 2L. After n such trips, total distance = 2nL. For n = 2500 and L = 0.015 m: distance = 2 × 2500 × 0.015 = {sf(dist_q20)} m — a surprisingly large total distance for a string vibrating over a span of only 1.5 cm, even though the net displacement after a whole number of trips is exactly zero. Common mistake: writing nL instead of 2nL — each return trip is TWO crossings of the gap, not one.',
    answer=dist_q20, unit='m')


# ════════════════════════════════════════════════════════════════════════
# 1.3 Speed and velocity
# ════════════════════════════════════════════════════════════════════════
add('1.3', 'F', 'Which statement correctly distinguishes velocity from speed?',
    'Velocity is the rate of change of DISPLACEMENT — a vector, with a direction as well as a size. Speed is the rate of change of DISTANCE — a scalar, size only. Common mistake: using the two words interchangeably, which is fine in everyday speech but not in physics.',
    kind='multiple_choice',
    options=['Velocity has a direction and is the rate of change of displacement; speed has no direction and is the rate of change of distance',
             'Velocity and speed are always numerically different', 'Speed has a direction but velocity does not', 'Velocity and speed are two names for exactly the same thing in every context'],
    correct_idx=0)

add('1.3', 'F', 'An object moves 20 m in a straight line, without reversing, in 4.0 s. Calculate its velocity.',
    'Since the motion is in a straight line with no reversal, velocity = displacement ÷ time = 20 ÷ 4.0 = 5.0 m/s, in the direction of travel. Common mistake: forgetting that a velocity answer should (in principle) carry a direction, even though here there is only one direction available.',
    answer=5.0, unit='m/s')

add('1.3', 'F', 'Taking rightward as positive, a particle moves at a constant −3.0 m/s (i.e. to the left) for 5.0 s. Calculate its displacement.',
    'Displacement = velocity × time = (−3.0) × 5.0 = −15 m — the negative sign shows the particle ends up 15 m to the LEFT of where it started. Common mistake: dropping the negative sign and giving +15 m, which would describe motion to the right instead.',
    answer=-15, unit='m', sign_sensitive=True,
    figure=fig('1.3', 'q3', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 5.0, 'y': -15}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

add('1.3', 'F', "A car's velocity changes from +20 m/s to −5 m/s. What has happened to the car's direction of travel?",
    'The sign of a 1-D velocity shows its direction relative to the chosen positive direction. Going from +20 m/s to −5 m/s means the car has reversed direction — it is now travelling the opposite way, and more slowly than before. Common mistake: thinking the car has simply slowed down without changing direction, ignoring what the sign change means.',
    kind='multiple_choice', options=['The car has reversed direction', 'The car has sped up in the same direction', "The car's direction is unaffected", 'The car has stopped'], correct_idx=0)

add('1.3', 'F', 'A parked car is stationary. State its velocity.',
    'A stationary object has zero rate of change of displacement, so its velocity is 0 m/s. (Its speed is also 0 m/s — when an object is at rest, speed and velocity agree, since there is no direction to specify.) Common mistake: leaving the answer blank because "nothing is happening" — zero is a perfectly valid, specific value.',
    answer=0, unit='m/s')

add('1.3', 'F', "Taking rightward as positive, a particle's displacement changes by −40 m over 8.0 s at a constant rate. Calculate its velocity.",
    'velocity = displacement ÷ time = (−40) ÷ 8.0 = −5.0 m/s — negative, so the motion is to the left. Common mistake: reporting the magnitude only (5.0 m/s) and losing the direction information the negative sign carries.',
    answer=-5.0, unit='m/s', sign_sensitive=True,
    figure=fig('1.3', 'q6', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 8.0, 'y': -40}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

d1_q7, d2_q7 = 4 * 10, -2 * 5
avg_q7 = (d1_q7 + d2_q7) / (10 + 5)
add('1.3', 'I', 'Taking rightward as positive, a particle moves at +4.0 m/s for 10 s, then reverses to −2.0 m/s for a further 5.0 s. Calculate its average velocity for the whole 15 s.',
    f'Displacement in phase 1: 4.0 × 10 = {sf(d1_q7)} m. Displacement in phase 2: (−2.0) × 5.0 = {sf(d2_q7)} m. Total displacement = {sf(d1_q7)} + ({sf(d2_q7)}) = {sf(d1_q7 + d2_q7)} m over 15 s, so average velocity = {sf(d1_q7 + d2_q7)} ÷ 15 = {sf(avg_q7)} m/s. Common mistake: averaging the two velocities, (4.0 + (−2.0))/2 = 1.0 m/s, instead of using total displacement ÷ total time (they only agree when both phases last equally long).',
    answer=avg_q7, unit='m/s', sign_sensitive=True,
    figure=fig('1.3', 'q7', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 10, 'y': 40}, {'t': 15, 'y': 30}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

add('1.3', 'I', "A car's speedometer reads 60 km/h as it drives around a bend at a steady speed. Is the car's velocity also constant?",
    "No — even though the SPEED is constant (the speedometer reading never changes), the car's direction is continuously changing as it goes round the bend, so its velocity (which depends on direction too) is constantly changing. Common mistake: assuming constant speed automatically means constant velocity — it only does for motion in a straight line.",
    kind='multiple_choice',
    options=['No, because velocity also depends on direction, which is changing around the bend', 'Yes, because speed and velocity are always equal in magnitude',
             'Yes, because the speedometer measures velocity directly', 'No, because the car must be accelerating its speed as well'],
    correct_idx=0)

add('1.3', 'I', 'A swimmer swims 50 m along a straight pool, then swims back 50 m to the start, taking 40 s for each length. Calculate the average VELOCITY for the whole 80 s swim.',
    'The swimmer finishes exactly where they started, so the total displacement is 0 m, and average velocity = 0 ÷ 80 = 0 m/s. (Their average SPEED is very different: total distance 100 m ÷ 80 s = 1.25 m/s — speed and velocity can disagree sharply for a there-and-back journey.) Common mistake: calculating the average speed (1.25 m/s) when the question specifically asks for average velocity.',
    answer=0, unit='m/s',
    figure=fig('1.3', 'q9', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 40, 'y': 50}, {'t': 80, 'y': 0}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

v_q10 = (-8 - 12) / 5.0
add('1.3', 'I', "Taking the starting direction as positive, a particle's displacement decreases uniformly from +12 m to −8 m over 5.0 s. Calculate its velocity.",
    f'Because the change is uniform (a steady rate), the velocity is constant and equals the overall rate of change: velocity = ((−8) − (+12)) ÷ 5.0 = (−20) ÷ 5.0 = {sf(v_q10)} m/s. The negative sign shows the particle moves in the negative direction throughout. Common mistake: computing (12 − (−8)) instead of ((−8) − 12), which flips the sign of the answer.',
    answer=v_q10, unit='m/s', sign_sensitive=True,
    figure=fig('1.3', 'q10', 'motion', kind='displacement', points=[{'t': 0, 'y': 12}, {'t': 5.0, 'y': -8}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

add('1.3', 'I', 'Which of these could describe an object moving with truly constant velocity?',
    'Constant velocity needs BOTH constant speed AND constant direction — motion in a straight line at an unchanging speed. An object going around a circular track at constant speed is NOT at constant velocity, because its direction is continuously changing, even though its speed never does. Common mistake: picking the circular-track option because its speed is described as constant, overlooking the changing direction.',
    kind='multiple_choice',
    options=['A car moving along a straight, flat road at a steady 60 km/h', 'A car moving at a steady 60 km/h around a circular track',
             'A ball thrown vertically upward and falling back down', 'A pendulum swinging back and forth'],
    correct_idx=0)

v_q12 = -18 / 9.0
add('1.3', 'I', 'Taking upward as positive, a lift descends 18 m in 9.0 s at a constant rate. Calculate its velocity.',
    f'Since the lift moves downward, its displacement is negative: velocity = (−18) ÷ 9.0 = {sf(v_q12)} m/s. Common mistake: giving +2.0 m/s by forgetting that "descends" means the displacement (and hence the velocity) is negative with upward taken as positive.',
    answer=v_q12, unit='m/s', sign_sensitive=True,
    figure=fig('1.3', 'q12', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 9.0, 'y': -18}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

net_q13 = 300 - 100
avg_q13 = net_q13 / 100
add('1.3', 'I', 'Taking the outbound direction as positive, a train travels +300 m in 60 s, then reverses and travels −100 m in the next 40 s. Calculate its average velocity for the whole 100 s.',
    f'Total displacement = 300 + (−100) = {sf(net_q13)} m over a total time of 60 + 40 = 100 s. Average velocity = {sf(net_q13)} ÷ 100 = {sf(avg_q13)} m/s. Common mistake: using only one of the two phases, or adding the TIMES with the wrong sign instead of the displacements.',
    answer=avg_q13, unit='m/s', sign_sensitive=True,
    figure=fig('1.3', 'q13', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 60, 'y': 300}, {'t': 100, 'y': 200}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

net_q14 = 15 - 9
total_t_q14 = 10 + 20 + 6
avg_q14b = net_q14 / total_t_q14
add('1.3', 'C', 'Taking upward as positive, a lift rises 15 m in 10 s, waits at that floor for 20 s, then descends 9.0 m in 6.0 s. (a) Calculate the net displacement for the whole trip. (b) Calculate the total time taken. (c) Calculate the average velocity for the whole trip. Give only the answer to (c).',
    f'(a) Net displacement = 15 + (−9.0) = {sf(net_q14)} m. (b) Total time = 10 + 20 + 6.0 = {sf(total_t_q14)} s (the 20 s wait counts, even though no displacement happens during it). (c) Average velocity = {sf(net_q14)} ÷ {sf(total_t_q14)} = {sf(avg_q14b)} m/s. Common mistake: leaving out the 20 s waiting time, which would badly overstate the average velocity.',
    answer=avg_q14b, unit='m/s', sign_sensitive=True,
    figure=fig('1.3', 'q14', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 10, 'y': 15}, {'t': 30, 'y': 15}, {'t': 36, 'y': 6}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

d1_q15 = 8.0 * 4.0
d2_q15 = -2.0 * 6.0
avg_q15b = (d1_q15 + d2_q15) / 10.0
add('1.3', 'C', 'Taking rightward as positive, a particle moves with velocity +8.0 m/s for the first 4.0 s of a journey, then with velocity −2.0 m/s for the next 6.0 s. (a) Calculate the displacement during the first part. (b) Calculate the displacement during the second part. (c) Calculate the average velocity for the whole 10 s. Give only the answer to (c).',
    f'(a) Displacement 1 = 8.0 × 4.0 = {sf(d1_q15)} m. (b) Displacement 2 = (−2.0) × 6.0 = {sf(d2_q15)} m. (c) Total displacement = {sf(d1_q15)} + ({sf(d2_q15)}) = {sf(d1_q15 + d2_q15)} m over 10 s, so average velocity = {sf(d1_q15 + d2_q15)} ÷ 10 = {sf(avg_q15b)} m/s. Common mistake: averaging +8.0 and −2.0 to get +3.0 m/s, which ignores that the two phases last different amounts of time.',
    answer=avg_q15b, unit='m/s', sign_sensitive=True,
    figure=fig('1.3', 'q15', 'motion', kind='velocity', points=[{'t': 0, 'y': 8.0}, {'t': 4.0, 'y': 8.0}, {'t': 4.0, 'y': -2.0}, {'t': 10.0, 'y': -2.0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', hRefLines=[0]))

v1_q16 = 120 / 5.0
v2_q16 = 30 / 3.0
avg_q16 = (120 + 30) / 8.0
add('1.3', 'C', "A rocket sled's displacement increases by +120 m during a 5.0 s launch phase, then by a further +30 m during a 3.0 s braking phase before it stops. (a) Calculate the velocity during the launch phase. (b) Calculate the velocity during the braking phase. (c) Calculate the average velocity for the whole 8.0 s. Give only the answer to (c).",
    f'(a) Launch: velocity = 120 ÷ 5.0 = {sf(v1_q16)} m/s. (b) Braking: velocity = 30 ÷ 3.0 = {sf(v2_q16)} m/s. (c) Both displacements are in the same direction, so total displacement = 120 + 30 = 150 m over 8.0 s: average velocity = 150 ÷ 8.0 = {sf(avg_q16)} m/s. Common mistake: averaging the two phase velocities, ({sf(v1_q16)}+{sf(v2_q16)})/2 = 17 m/s, instead of using total displacement ÷ total time (the phases last different lengths of time, so this simple mean is wrong).',
    answer=avg_q16, unit='m/s',
    figure=fig('1.3', 'q16', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 5.0, 'y': 120}, {'t': 8.0, 'y': 150}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

avg_q17 = (36 - 0) / 20
add('1.3', 'C', 'The table shows a cyclist’s displacement from a fixed point at various times. Calculate the average velocity between t = 0 s and t = 20 s.',
    f'Average velocity only needs the two end values, not what happens in between: average velocity = (displacement at 20 s − displacement at 0 s) ÷ (20 − 0) = (36 − 0) ÷ 20 = {sf(avg_q17)} m/s. (Between t = 10 s and t = 15 s the displacement does not change at all — the cyclist was stationary — but this does not affect the average over the full 20 s, since only the two endpoints matter.) Common mistake: trying to average the individual readings in the table (0, 8, 20, 20, 36) instead of using only the first and last values together with the total time.',
    answer=avg_q17, unit='m/s',
    figure=fig('1.3', 'q17', 'table', headers=['t / s', '0', '5', '10', '15', '20'], rows=[['x / m', '0', '8', '20', '20', '36']]))

disp1_q18 = 250 * 2.0 * 3600
disp2_q18 = 180 * 1.5 * 3600
avg_q18b = (disp1_q18 + disp2_q18) / (3.5 * 3600)
add('1.3', 'C', "A plane's ground velocity is +250 m/s (due east) for 2.0 hours, then the wind shifts and its ground velocity becomes +180 m/s (still due east) for a further 1.5 hours. (a) Calculate the displacement during each phase, in km. (b) Calculate the average velocity for the whole 3.5 hour flight, in m/s. Give only the answer to (b).",
    f'(a) Phase 1: displacement = 250 × (2.0 × 3600) = {sf(disp1_q18)} m = {sf(disp1_q18 / 1000)} km. Phase 2: displacement = 180 × (1.5 × 3600) = {sf(disp2_q18)} m = {sf(disp2_q18 / 1000)} km. (b) Total displacement = {sf(disp1_q18 + disp2_q18)} m over a total time of 3.5 × 3600 = {sf(3.5 * 3600)} s: average velocity = {sf(avg_q18b)} m/s. Common mistake: averaging 250 and 180 m/s to get 215 m/s — wrong here too, because the two phases last different lengths of time (2.0 h vs 1.5 h).',
    answer=avg_q18b, unit='m/s',
    figure=fig('1.3', 'q18', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 2.0, 'y': disp1_q18 / 1000}, {'t': 3.5, 'y': (disp1_q18 + disp2_q18) / 1000}], xLabel='time', yLabel='displacement', xUnit='h', yUnit='km'))

v_q19 = (11.8 - 12.4) / 0.10
add('1.3', 'S', 'Taking upward as positive, a ball’s displacement is +12.4 m at one instant, and +11.8 m exactly 0.10 s later. Estimate the ball’s instantaneous velocity at that first instant, and explain why this calculation only gives an ESTIMATE of the true instantaneous velocity.',
    f'Estimated velocity ≈ change in displacement ÷ time interval = (11.8 − 12.4) ÷ 0.10 = {sf(v_q19)} m/s. This is only an estimate because the ball’s velocity is actually changing continuously (it is accelerating under gravity), so the AVERAGE velocity over this short 0.10 s interval is close to, but not exactly equal to, the TRUE instantaneous velocity at the first instant — the shorter the time interval used, the better the estimate becomes, approaching the true instantaneous value as the interval shrinks towards zero (this is exactly the idea of a gradient at a single point on a graph). Common mistake: treating a calculation like this as giving an exact instantaneous value rather than an estimate, however small the time interval.',
    answer=v_q19, unit='m/s', sign_sensitive=True,
    figure=fig('1.3', 'q19', 'motion', kind='displacement', points=[{'t': 0, 'y': 12.4}, {'t': 0.10, 'y': 11.8}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m', markers=[{'t': 0, 'y': 12.4, 'label': 't'}, {'t': 0.10, 'y': 11.8, 'label': 't+0.10s'}]))

t_q20 = 12.0
add('1.3', 'S', 'Runner A starts from a start line and runs at a constant +5.0 m/s. Runner B starts from the same line, 2.0 s after A, and runs at a constant +6.0 m/s in the same direction. Measuring time t from the moment A starts, derive an expression for the time at which B catches up with A, and evaluate it.',
    f"A's position at time t is x_A = 5.0t. B starts 2.0 s later, so B's position for t ≥ 2.0 s is x_B = 6.0(t − 2.0). B catches A when x_A = x_B: 5.0t = 6.0(t − 2.0) = 6.0t − 12.0, so 12.0 = 6.0t − 5.0t = t, giving t = {sf(t_q20)} s after A started (which is {sf(t_q20 - 2.0)} s after B started). Common mistake: measuring t from when B starts instead of from when A starts (or vice versa) and substituting into the wrong equation, which gives an answer with the wrong origin.",
    answer=t_q20, unit='s')


# ════════════════════════════════════════════════════════════════════════
# 1.4 Displacement-time graphs
# ════════════════════════════════════════════════════════════════════════
add('1.4', 'F', 'On a displacement-time graph, what physical quantity does the gradient represent?',
    'Gradient = (change in displacement) ÷ (change in time), which is exactly the definition of velocity. A steeper gradient means a larger velocity (faster motion); a negative gradient means velocity in the negative direction. Common mistake: thinking the gradient gives speed or acceleration instead of velocity.',
    kind='multiple_choice', options=['velocity', 'speed only, never direction', 'acceleration', 'distance travelled'], correct_idx=0)

add('1.4', 'F', 'A displacement-time graph is a horizontal straight line. State the velocity of the object.',
    'A horizontal line has zero gradient, and gradient = velocity, so the velocity is 0 m/s — the object is at rest (its displacement is not changing with time). Common mistake: confusing a horizontal line (at rest) with a line through the origin (moving at constant velocity, starting from zero displacement).',
    answer=0, unit='m/s',
    figure=fig('1.4', 'q2', 'motion', kind='displacement', points=[{'t': 0, 'y': 8}, {'t': 10, 'y': 8}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

v_q3 = 20 / 5
add('1.4', 'F', 'A displacement-time graph is a straight line from the origin to the point (5.0 s, 20 m). Calculate the velocity it represents.',
    f'velocity = gradient = change in displacement ÷ change in time = (20 − 0) ÷ (5.0 − 0) = {sf(v_q3)} m/s. Common mistake: dividing time by displacement instead of displacement by time.',
    answer=v_q3, unit='m/s',
    figure=fig('1.4', 'q3', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 5.0, 'y': 20}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

add('1.4', 'F', 'Two displacement-time graphs are both straight lines through the origin. Line P rises more steeply than line Q. Which object is moving faster?',
    'A steeper straight line on a displacement-time graph means a larger gradient, and gradient = velocity, so line P represents the faster-moving object. Common mistake: assuming the LONGER line (reaching a larger displacement) must represent the faster object, rather than comparing gradients.',
    kind='multiple_choice', options=['The object represented by line P', 'The object represented by line Q', 'They must be moving at the same speed', 'There is not enough information'], correct_idx=0)

v_q5 = (-6 - 10) / 4
add('1.4', 'F', 'A displacement-time graph is a straight line from (0 s, +10 m) to (4.0 s, −6.0 m). Calculate the velocity it represents.',
    f'velocity = gradient = ((−6.0) − (+10)) ÷ (4.0 − 0) = (−16) ÷ 4.0 = {sf(v_q5)} m/s. The negative sign shows the object is moving in the negative direction throughout. Common mistake: subtracting in the wrong order, (10 − (−6))/4 = +4.0 m/s, which has the wrong sign.',
    answer=v_q5, unit='m/s', sign_sensitive=True,
    figure=fig('1.4', 'q5', 'motion', kind='displacement', points=[{'t': 0, 'y': 10}, {'t': 4.0, 'y': -6}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

add('1.4', 'F', 'A displacement-time graph is a straight line through the origin, reaching (6.0 s, 24 m). Read off the displacement at t = 3.0 s.',
    'The line passes through the origin with a constant gradient of 24 ÷ 6.0 = 4.0 m/s, so at t = 3.0 s the displacement is 4.0 × 3.0 = 12 m — exactly half of the displacement at t = 6.0 s, since the line is straight and 3.0 s is exactly halfway along it. Common mistake: trying to read this directly off a sketch without using the straight-line proportionality, and misjudging the halfway value.',
    answer=12, unit='m',
    figure=fig('1.4', 'q6', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 6.0, 'y': 24}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m', markers=[{'t': 3.0, 'y': 12, 'label': 't=3.0s'}]))

v_q7 = (2 - 8) / (12 - 9)
add('1.4', 'I', 'A displacement-time graph has three sections: rising from (0 s, 0 m) to (4 s, 8 m), then flat until (9 s, 8 m), then falling to (12 s, 2 m). Calculate the velocity during the final (falling) section.',
    f'During the final section, gradient = (2 − 8) ÷ (12 − 9) = (−6) ÷ 3 = {sf(v_q7)} m/s. The negative sign shows the object is moving back towards its starting point. Common mistake: using the overall start and end points of the WHOLE graph (0 to 12 s) instead of just the final section’s own two endpoints.',
    answer=v_q7, unit='m/s', sign_sensitive=True,
    figure=fig('1.4', 'q7', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 4, 'y': 8}, {'t': 9, 'y': 8}, {'t': 12, 'y': 2}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

add('1.4', 'I', 'A displacement-time graph is a curve that becomes steeper and steeper as time increases. What does this indicate about the motion?',
    "A continuously increasing gradient means the velocity is continuously increasing — the object is accelerating (speeding up). Common mistake: describing this as 'constant speed' because the curve looks smooth, without checking how the gradient itself is changing along the curve.",
    kind='multiple_choice', options=['The velocity is increasing — the object is accelerating', 'The velocity is constant', 'The velocity is decreasing', 'The object is stationary'], correct_idx=0)

y_q9 = 5 + 3 * 4
add('1.4', 'I', 'A displacement-time graph is a straight line from (0 s, 5.0 m) to (10 s, 35 m). Read off the displacement at t = 4.0 s.',
    f'The line has gradient (35 − 5.0) ÷ 10 = 3.0 m/s and a starting value of 5.0 m, so displacement at any time t is 5.0 + 3.0t. At t = 4.0 s: 5.0 + 3.0 × 4.0 = {sf(y_q9)} m. Common mistake: forgetting the non-zero starting displacement (5.0 m) and just computing 3.0 × 4.0 = 12 m.',
    answer=y_q9, unit='m',
    figure=fig('1.4', 'q9', 'motion', kind='displacement', points=[{'t': 0, 'y': 5.0}, {'t': 10, 'y': 35}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m', markers=[{'t': 4.0, 'y': y_q9, 'label': 't=4.0s'}]))

y3_q10 = 3 * 3
y12_q10 = 18 + (2 - 18) / (14 - 10) * (12 - 10)
avg_q10 = (y12_q10 - y3_q10) / (12 - 3)
add('1.4', 'I', 'A displacement-time graph rises in a straight line from (0 s, 0 m) to (6 s, 18 m), stays flat until (10 s, 18 m), then falls in a straight line to (14 s, 2 m). Calculate the average velocity between t = 3.0 s and t = 12 s.',
    f'Reading the graph: at t = 3.0 s (on the rising section, gradient 18/6 = 3.0 m/s) the displacement is 3.0 × 3.0 = {sf(y3_q10)} m. At t = 12 s (on the falling section, gradient (2−18)/(14−10) = −4.0 m/s) the displacement is 18 + (−4.0) × (12−10) = {sf(y12_q10)} m. Average velocity = ({sf(y12_q10)} − {sf(y3_q10)}) ÷ (12 − 3) = {sf(avg_q10)} m/s. Common mistake: using the gradient of either the rising or falling section as the average, instead of the two actual displacement VALUES at the two times asked about.',
    answer=avg_q10, unit='m/s',
    figure=fig('1.4', 'q10', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 6, 'y': 18}, {'t': 10, 'y': 18}, {'t': 14, 'y': 2}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m', markers=[{'t': 3.0, 'y': y3_q10, 'label': 'A'}, {'t': 12, 'y': y12_q10, 'label': 'B'}]))

add('1.4', 'I', 'A displacement-time graph is a smooth curve that keeps rising but becomes LESS steep as time goes on. What does this indicate?',
    'A gradient that is positive but steadily decreasing means the velocity is positive but decreasing in magnitude — the object is still moving in the same direction, but slowing down (decelerating). Common mistake: concluding the object has stopped or reversed, when a decreasing-but-still-positive gradient only means it is slowing, not that it has stopped.',
    kind='multiple_choice', options=['The object is moving forward but decelerating', 'The object has stopped', 'The object has reversed direction', 'The object is accelerating'], correct_idx=0)

a_q12 = 2 * (40 - 0 * 10) / (10**2)
slope5_q12 = a_q12 * 5
add('1.4', 'I', 'A displacement-time graph is a curve starting at rest at the origin and reaching (10 s, 40 m), with a continuously increasing gradient. By drawing a tangent at t = 5.0 s, the gradient there is found to be consistent with a constant acceleration throughout. Calculate the gradient (instantaneous velocity) of that tangent.',
    f'Starting from rest with constant acceleration a, displacement follows x = ½at². Using the point (10 s, 40 m): 40 = ½ × a × 10², so a = 80/100 = {sf(a_q12)} m/s². The instantaneous velocity (tangent gradient) at any time is v = at, so at t = 5.0 s: v = {sf(a_q12)} × 5.0 = {sf(slope5_q12)} m/s. Common mistake: using the AVERAGE gradient over the whole 10 s (40/10 = 4.0 m/s) instead of the gradient of the TANGENT at the one instant t = 5.0 s, which is different for a curved graph.',
    answer=slope5_q12, unit='m/s',
    figure=fig('1.4', 'q12', 'motion', kind='displacement', points=[{'t': 0, 'y': 0, 'slopeIn': 0}, {'t': 10, 'y': 40}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m', curved=True, tangentAt=5.0))

add('1.4', 'I', 'A displacement-time graph rises in a straight line from (0 s, 0 m) to (6 s, 18 m), then falls in a straight line back to (12 s, 0 m). Read off the time at which the object returns to its starting displacement.',
    'The graph shows the displacement reaching 0 m again exactly at t = 12 s, where the falling section meets the time axis. This is a direct graph-reading skill, not a calculation: the symmetric triangle shape shows the object moving away and then returning at the same average rate. Common mistake: reading off t = 6 s (the time of maximum displacement) instead of the time it returns to zero.',
    answer=12, unit='s',
    figure=fig('1.4', 'q13', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 6, 'y': 18}, {'t': 12, 'y': 0}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

dist_q14 = abs(20 - 0) + abs(20 - 20) + abs(-10 - 20)
add('1.4', 'C', 'A displacement-time graph has three straight sections: (0 s, 0 m) to (4 s, 20 m); then flat to (7 s, 20 m); then (7 s, 20 m) to (10 s, −10 m). (a) Calculate the velocity during the first section. (b) Calculate the velocity during the third section. (c) Calculate the total DISTANCE travelled over the whole 10 s (not the displacement). Give only the answer to (c).',
    f'(a) Velocity 1 = (20−0)/(4−0) = {sf(20 / 4)} m/s. (b) Velocity 3 = (−10−20)/(10−7) = {sf((-10 - 20) / 3)} m/s. (c) Distance adds the SIZE of the change in each section, ignoring sign: |20−0| + |20−20| + |−10−20| = 20 + 0 + 30 = {sf(dist_q14)} m. Common mistake: finding the final displacement instead (−10 m, or magnitude 10 m) rather than adding up the distance covered in each separate section.',
    answer=dist_q14, unit='m',
    figure=fig('1.4', 'q14', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 4, 'y': 20}, {'t': 7, 'y': 20}, {'t': 10, 'y': -10}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

dist_q15 = abs(15 - 0) + abs(15 - 15) + abs(-5 - 15)
add('1.4', 'C', "A delivery van's displacement-time graph from its depot: (0 min, 0 km) to (10 min, 15 km) [drives to shop A]; flat to (25 min, 15 km) [parked, delivering]; then (25 min, 15 km) to (40 min, −5 km) [drives on to shop B, past the depot's position]. (a) Calculate how long the van is parked. (b) Calculate the velocity while driving to shop B. (c) Calculate the total distance driven over the whole 40 minutes. Give only the answer to (c).",
    f'(a) Parked from t = 10 min to t = 25 min: duration = {sf(25 - 10)} min. (b) Velocity to shop B = (−5−15)/(40−25) = {sf((-5 - 15) / 15)} km/min. (c) Distance = |15−0| + |15−15| + |−5−15| = 15 + 0 + 20 = {sf(dist_q15)} km. Common mistake: using the final displacement (−5 km from the depot) as the distance driven, instead of adding up the length of every leg actually covered.',
    answer=dist_q15, unit='km',
    figure=fig('1.4', 'q15', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 10, 'y': 15}, {'t': 25, 'y': 15}, {'t': 40, 'y': -5}], xLabel='time', yLabel='displacement', xUnit='min', yUnit='km'))

dist_q16 = abs(10 - 0) + abs(-10 - 10) + abs(0 - -10)
avgspeed_q16 = dist_q16 / 15
add('1.4', 'C', 'A particle’s displacement-time graph has straight sections: (0 s, 0 m) to (5 s, 10 m); then (5 s, 10 m) to (10 s, −10 m); then (10 s, −10 m) to (15 s, 0 m). (a) Calculate the velocity of the middle section. (b) Calculate the total distance travelled over the 15 s. (c) Calculate the average SPEED for the whole 15 s. Give only the answer to (c).',
    f'(a) Middle section velocity = (−10−10)/(10−5) = {sf((-10 - 10) / 5)} m/s. (b) Distance = |10−0| + |−10−10| + |0−(−10)| = 10 + 20 + 10 = {sf(dist_q16)} m. (c) Average speed = total distance ÷ total time = {sf(dist_q16)} ÷ 15 = {sf(avgspeed_q16)} m/s. Common mistake: using the final displacement (0 m, since the particle ends up back at the origin) and concluding the average speed must also be zero — average SPEED uses distance, which is 40 m here, not displacement.',
    answer=avgspeed_q16, unit='m/s',
    figure=fig('1.4', 'q16', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 5, 'y': 10}, {'t': 10, 'y': -10}, {'t': 15, 'y': 0}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))

dy_q17 = 42.0 - 2.0
avg_q17b = dy_q17 / 20
unc_q17 = (0.5 + 0.5) / dy_q17 * 100
add('1.4', 'C', 'A displacement-time graph is plotted from readings accurate to only ±0.5 m at each point. The first reading is (0 s, 2.0 ± 0.5 m) and the last is (20 s, 42.0 ± 0.5 m). (a) Calculate the average velocity using these two readings. (b) The two reading errors combine by simple addition when you subtract the readings. Calculate the percentage uncertainty in this average velocity. Give only the answer to (b).',
    f'(a) Average velocity = (42.0 − 2.0) ÷ 20 = {sf(dy_q17 / 20)} m/s. (b) The absolute uncertainty in the DIFFERENCE of the two readings is the sum of their individual uncertainties: 0.5 + 0.5 = 1.0 m, out of a change of {sf(dy_q17)} m. Percentage uncertainty = 1.0 ÷ {sf(dy_q17)} × 100% = {sf(unc_q17)}% (the time interval is normally taken as exact, so it contributes no extra uncertainty here). Common mistake: using only one reading’s ±0.5 m uncertainty instead of adding the uncertainties from BOTH readings used in the subtraction.',
    answer=unc_q17, unit='%')

v_q18 = (65 - 25) / (9 - 5)
add('1.4', 'C', 'A displacement-time graph curves smoothly (starting from rest at the origin) up to (5.0 s, 25 m), and then continues as a STRAIGHT line to (9.0 s, 65 m). (a) State what feature of the graph after t = 5.0 s shows the object is moving at constant velocity. (b) Calculate that constant velocity. (c) State the displacement at t = 9.0 s. Give only the numerical answer to (b).',
    f'(a) A STRAIGHT section of a displacement-time graph always means constant velocity, because a straight line has one unchanging gradient throughout. (b) velocity = (65−25)/(9.0−5.0) = {sf(v_q18)} m/s. (c) The displacement at t = 9.0 s is read directly from the graph as 65 m. Common mistake: assuming a graph must be curved everywhere just because it started out curved, rather than checking each section’s shape separately.',
    answer=v_q18, unit='m/s',
    figure=fig('1.4', 'q18', 'motion', kind='displacement', points=[{'t': 0, 'y': 0, 'slopeIn': 0}, {'t': 5.0, 'y': 25, 'slopeIn': 10}, {'t': 9.0, 'y': 65}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m', curved=True))

g2_q19 = 1.5 * 2
g6_q19 = 1.5 * 6
a_q19 = (g6_q19 - g2_q19) / (6 - 2)
add('1.4', 'S', 'A displacement-time graph curves smoothly from rest at the origin, consistent with a constant acceleration a. The gradient of the tangent at t = 2.0 s is found to be 3.0 m/s, and the gradient of the tangent at t = 6.0 s is found to be 9.0 m/s. Show that these two gradients are consistent with a constant acceleration, and calculate its value.',
    f'For constant acceleration from rest, the instantaneous velocity (tangent gradient) at time t is v = at, so the gradient should be directly proportional to t. Check: at t = 2.0 s, v/t = 3.0/2.0 = 1.5; at t = 6.0 s, v/t = 9.0/6.0 = 1.5 — the same value both times, confirming a constant acceleration. Calculating it directly from the change between the two tangents: a = Δv ÷ Δt = (9.0 − 3.0) ÷ (6.0 − 2.0) = {sf(a_q19)} m/s². Common mistake: dividing a single gradient value by its own time (e.g. 3.0/2.0) and treating that as "the acceleration" directly, rather than using the CHANGE in velocity over the CHANGE in time between the two tangents (both methods agree here only because the object starts from rest).',
    answer=a_q19, unit='m/s²',
    figure=fig('1.4', 'q19', 'motion', kind='displacement', points=[{'t': 0, 'y': 0, 'slopeIn': 0}, {'t': 8, 'y': 0.5 * 1.5 * 64}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m', curved=True, tangentAt=2.0))

v1_q20 = 0.024 / 0.40
v2_q20 = -0.024 / 0.10
add('1.4', 'S', "A seismometer's displacement-time trace during an aftershock is approximately two straight sections: the ground moves +0.024 m in 0.40 s, then snaps back −0.024 m (returning to zero) in the next 0.10 s. (a) Calculate the velocity during each phase. (b) Explain which phase is more likely to cause structural damage, given that engineers care about peak velocity (and acceleration) rather than the size of the displacement itself. Give only the magnitude of the larger velocity, in m/s.",
    f'(a) Phase 1: velocity = 0.024 ÷ 0.40 = {sf(v1_q20)} m/s. Phase 2: velocity = (−0.024) ÷ 0.10 = {sf(v2_q20)} m/s. (b) Even though both phases cover the SAME size of displacement (0.024 m), phase 2 happens four times faster, so its velocity (and the forces associated with such a rapid change of motion) are much larger in magnitude — this sudden "jolt back" is the more dangerous part of the motion for structures. Common mistake: assuming the two phases are equally severe because the displacement involved is the same size in each.',
    answer=abs(v2_q20), unit='m/s',
    figure=fig('1.4', 'q20', 'motion', kind='displacement', points=[{'t': 0, 'y': 0}, {'t': 0.40, 'y': 0.024}, {'t': 0.50, 'y': 0}], xLabel='time', yLabel='displacement', xUnit='s', yUnit='m'))


# ════════════════════════════════════════════════════════════════════════
# 1.5 Combining displacements
# ════════════════════════════════════════════════════════════════════════
add('1.5', 'F', 'What is the standard method for finding the resultant of two displacement vectors?',
    "Draw the vectors tip-to-tail (the second vector starting where the first one ends), in order and to scale; the resultant is the single straight-line vector from the very start to the very end. Common mistake: drawing both vectors from the SAME starting point and trying to read a resultant directly, rather than joining them tip-to-tail (or using components, which gives the same answer algebraically).",
    kind='multiple_choice',
    options=['Draw them tip-to-tail, to scale; the resultant runs from the start of the first to the end of the second',
             'Simply add their magnitudes, regardless of direction', 'Always use Pythagoras, whatever the angle between them', 'Multiply their magnitudes together'],
    correct_idx=0)

add('1.5', 'F', 'Two displacements, 6.0 m and 4.0 m, act in the SAME direction. Calculate the magnitude of their resultant.',
    'When two vectors point in exactly the same direction, they add directly like scalars: 6.0 + 4.0 = 10 m, still in that same direction. Common mistake: using Pythagoras here, which only applies when the two vectors are at an angle to each other, not when they are parallel.',
    answer=10, unit='m', figure=fig('1.5', 'q2', 'vector', vectors=[{'magnitude': 6.0, 'angleDeg': 0, 'label': '6.0 m'}, {'magnitude': 4.0, 'angleDeg': 0, 'label': '4.0 m'}], mode='tipToTail', resultant={'label': 'resultant'}))

mag_q3 = hypot(6.0, 8.0)
add('1.5', 'F', 'Two displacements, 6.0 m east and 8.0 m north, act at right angles to each other. Calculate the magnitude of their resultant.',
    f'Since the two vectors are perpendicular, Pythagoras applies directly: magnitude = √(6.0² + 8.0²) = √(36+64) = √100 = {sf(mag_q3)} m (a 3-4-5 triangle scaled by 2). Common mistake: simply adding 6.0 + 8.0 = 14 m, which ignores that the two vectors point in different directions.',
    answer=mag_q3, unit='m', figure=fig('1.5', 'q3', 'vector', vectors=[{'magnitude': 6.0, 'angleDeg': 0, 'label': '6.0 m E'}, {'magnitude': 8.0, 'angleDeg': 90, 'label': '8.0 m N'}], mode='tipToTail', resultant={'label': 'resultant'}))

hx_q4 = 10 * cos(radians(30))
add('1.5', 'F', 'A displacement of 10 m acts at 30° above the horizontal. Calculate the horizontal component of this displacement.',
    f'Horizontal component = magnitude × cos(angle from horizontal) = 10 × cos30° = 10 × {sf(cos(radians(30)))} = {sf(hx_q4)} m. Common mistake: using sin30° instead of cos30° for the horizontal component — cos goes with the component ALONG the direction the angle is measured from.',
    answer=hx_q4, unit='m', figure=fig('1.5', 'q4', 'vector', vectors=[{'magnitude': 10, 'angleDeg': 30, 'label': '10 m'}], mode='fromOrigin'))

hy_q5 = 10 * sin(radians(30))
add('1.5', 'F', 'The same displacement of 10 m acts at 30° above the horizontal. Calculate the vertical component of this displacement.',
    f'Vertical component = magnitude × sin(angle from horizontal) = 10 × sin30° = 10 × {sf(sin(radians(30)))} = {sf(hy_q5)} m. Common mistake: swapping sin and cos, which would give the vertical component as 8.66 m (the horizontal value) instead.',
    answer=hy_q5, unit='m', figure=fig('1.5', 'q5', 'vector', vectors=[{'magnitude': 10, 'angleDeg': 30, 'label': '10 m'}], mode='fromOrigin'))

add('1.5', 'F', 'Two equal and opposite displacements, each of magnitude 12 m, act on an object. State the magnitude of their resultant.',
    "Equal and opposite vectors cancel completely: the resultant is 0 m. Common mistake: adding the two magnitudes (12 + 12 = 24 m) without accounting for the fact that 'opposite' means they point in opposite directions, so they subtract rather than add.",
    answer=0, unit='m')

v1_q7 = (50, 0)
v2_q7 = (50 * cos(radians(60)), 50 * sin(radians(60)))
sum_q7 = (v1_q7[0] + v2_q7[0], v1_q7[1] + v2_q7[1])
mag_q7b = hypot(*sum_q7)
add('1.5', 'I', 'Two displacements of 50 m each act with an angle of 60° between their directions. Calculate the magnitude of their resultant by resolving each into components along and perpendicular to the first vector.',
    f'Take the first vector along the x-axis: (50, 0). Resolve the second (50 m at 60°) into components: ({sf(v2_q7[0])}, {sf(v2_q7[1])}). Adding component by component: x = 50 + {sf(v2_q7[0])} = {sf(sum_q7[0])}, y = 0 + {sf(v2_q7[1])} = {sf(sum_q7[1])}. Magnitude = √({sf(sum_q7[0])}² + {sf(sum_q7[1])}²) = {sf(mag_q7b)} m. Common mistake: adding the two magnitudes directly (50+50=100 m), which would only be correct if the angle between them were 0°.',
    answer=mag_q7b, unit='m',
    figure=fig('1.5', 'q7', 'vector', vectors=[{'magnitude': 50, 'angleDeg': 0, 'label': '50 m'}, {'magnitude': 50, 'angleDeg': 60, 'label': '50 m'}], mode='tipToTail', resultant={'label': 'resultant'}))

add('1.5', 'I', 'A displacement vector points into the second quadrant (up and to the left of the origin, between 90° and 180° measured from the positive x-axis). What are the signs of its x- and y-components?',
    'In the second quadrant, the x-component is NEGATIVE (pointing left) and the y-component is POSITIVE (pointing up). This is why resolving a vector always needs the angle measured consistently from a fixed axis — cos and sin automatically produce the correct sign as long as the angle convention is applied consistently. Common mistake: assuming components are always positive and just reading off magnitudes without tracking which way each component actually points.',
    kind='multiple_choice', options=['x-component negative, y-component positive', 'x-component positive, y-component positive', 'x-component negative, y-component negative', 'x-component positive, y-component negative'],
    correct_idx=0)

x_q9 = 25 * cos(radians(150))
add('1.5', 'I', 'A displacement of 25 m acts at 150°, measured anticlockwise from the positive x-axis. Calculate the x-component of this displacement.',
    f'x-component = 25 × cos150° = 25 × ({sf(cos(radians(150)))}) = {sf(x_q9)} m. The component is negative because 150° is past 90°, so the vector points partly in the negative x-direction. Common mistake: dropping the negative sign because "a length can’t be negative" — a COMPONENT can be negative; only the overall magnitude of a vector cannot.',
    answer=x_q9, unit='m', sign_sensitive=True, figure=fig('1.5', 'q9', 'vector', vectors=[{'magnitude': 25, 'angleDeg': 150, 'label': '25 m'}], mode='fromOrigin'))

sumx_q10, sumy_q10 = 10 + 0 - 4, 0 + 15 + 3
mag_q10 = hypot(sumx_q10, sumy_q10)
add('1.5', 'I', 'Three displacement vectors have components (in metres): (10, 0), (0, 15) and (−4, 3). Calculate the magnitude of their resultant.',
    f'Add the x-components together, and separately add the y-components: x = 10 + 0 + (−4) = {sf(sumx_q10)} m; y = 0 + 15 + 3 = {sf(sumy_q10)} m. Resultant magnitude = √({sf(sumx_q10)}² + {sf(sumy_q10)}²) = {sf(mag_q10)} m. Common mistake: adding all six numbers together indiscriminately instead of keeping the x- and y-components separate until the final Pythagoras step.',
    answer=mag_q10, unit='m',
    figure=fig('1.5', 'q10', 'vector', vectors=[{'magnitude': 10, 'angleDeg': 0, 'label': '(10,0)'}, {'magnitude': 15, 'angleDeg': 90, 'label': '(0,15)'}, {'magnitude': 5, 'angleDeg': degrees(atan2(3, -4)), 'label': '(−4,3)'}], mode='tipToTail', resultant={'label': 'resultant'}))

add('1.5', 'I', 'Two vectors of magnitude 5.0 and 3.0 are combined. Which of these values could NOT be the magnitude of their resultant?',
    'The resultant of two vectors can range from the difference of their magnitudes (when they point in exactly opposite directions, |5.0−3.0| = 2.0) up to their sum (when they point in exactly the same direction, 5.0+3.0 = 8.0), and anything in between depending on the angle. A resultant of 1.0 is smaller than this minimum of 2.0, so it is impossible. Common mistake: assuming any value could be a valid resultant, without checking it falls between the minimum and maximum possible magnitudes.',
    kind='multiple_choice', options=['1.0', '2.0', '4.0', '7.0'], correct_idx=0)

angle_q12 = degrees(atan2(6, 8))
add('1.5', 'I', 'A resultant displacement has components (8.0 m, 6.0 m). Calculate the angle this resultant makes above the x-axis.',
    f'angle = tan⁻¹(y-component ÷ x-component) = tan⁻¹(6.0 ÷ 8.0) = {sf(angle_q12)}°. (This is a 3-4-5 triangle scaled by 2, so the magnitude is √(8.0²+6.0²) = 10 m.) Common mistake: computing tan⁻¹(8.0/6.0) instead — the ORDER matters: it is always y-component over x-component for the angle measured from the x-axis.',
    answer=angle_q12, unit='°',
    figure=fig('1.5', 'q12', 'vector', vectors=[{'magnitude': 10, 'angleDeg': angle_q12, 'label': '(8,6)'}], mode='fromOrigin'))

mag_q13 = hypot(120, 50)
add('1.5', 'I', "A hiker's displacement from camp has an eastward component of 120 m and a northward component of 50 m. Calculate the magnitude of the total displacement.",
    f'magnitude = √(120² + 50²) = √(14400+2500) = √16900 = {sf(mag_q13)} m. Common mistake: adding the two components directly (120+50=170 m) instead of combining them with Pythagoras, since they act at right angles to each other.',
    answer=mag_q13, unit='m',
    figure=fig('1.5', 'q13', 'vector', vectors=[{'magnitude': 120, 'angleDeg': 0, 'label': '120 m E'}, {'magnitude': 50, 'angleDeg': 90, 'label': '50 m N'}], mode='tipToTail', resultant={'label': 'resultant'}, compass=True))

n1_q14, e1_q14 = 8.0 * cos(radians(60)), 8.0 * sin(radians(60))
n2_q14, e2_q14 = 5.0 * cos(radians(150)), 5.0 * sin(radians(150))
netN_q14, netE_q14 = n1_q14 + n2_q14, e1_q14 + e2_q14
mag_q14 = hypot(netN_q14, netE_q14)
add('1.5', 'C', 'A ship sails 8.0 km on a bearing of 060°, then 5.0 km on a bearing of 150°. (a) Resolve the first leg into north and east components. (b) Resolve the second leg into north and east components. (c) Calculate the magnitude of the resultant displacement. Give only the answer to (c), to 3 significant figures.',
    f'(a) Leg 1: north = 8.0cos60° = {sf(n1_q14)} km, east = 8.0sin60° = {sf(e1_q14)} km. (b) Leg 2: north = 5.0cos150° = {sf(n2_q14)} km, east = 5.0sin150° = {sf(e2_q14)} km. (c) Net north = {sf(n1_q14)} + ({sf(n2_q14)}) = {sf(netN_q14)} km; net east = {sf(e1_q14)} + {sf(e2_q14)} = {sf(netE_q14)} km. Magnitude = √({sf(netN_q14)}² + {sf(netE_q14)}²) = {sf(mag_q14)} km. Common mistake: using sin for the north (bearing) component and cos for east — for a BEARING (measured clockwise from north), it is north = cos and east = sin, the opposite convention to an angle measured from the x-axis.',
    answer=mag_q14, unit='km',
    figure=fig('1.5', 'q14', 'vector', vectors=[{'magnitude': 8.0, 'angleDeg': 90 - 60, 'label': '8.0 km, 060°'}, {'magnitude': 5.0, 'angleDeg': 90 - 150, 'label': '5.0 km, 150°'}], mode='tipToTail', resultant={'label': 'resultant'}, compass=True))

Rx_q15, Ry_q15 = 25 * 0.8, 25 * 0.6
Bx_q15, By_q15 = Rx_q15 - 15, Ry_q15 - 0
magB_q15 = hypot(Bx_q15, By_q15)
add('1.5', 'C', 'Vector A (15 m, along 0°) and an unknown vector B combine to give a resultant of 25 m at 36.9° above the x-axis. (a) Resolve the resultant into x- and y-components. (b) Hence find the components of vector B. (c) Calculate the magnitude of vector B. Give only the answer to (c).',
    f'(a) Resultant components: x = 25cos36.9° = {sf(Rx_q15)} m, y = 25sin36.9° = {sf(Ry_q15)} m (a 3-4-5 triangle scaled by 5). (b) Since A + B = resultant, and A = (15, 0): B_x = {sf(Rx_q15)} − 15 = {sf(Bx_q15)} m, B_y = {sf(Ry_q15)} − 0 = {sf(By_q15)} m. (c) Magnitude of B = √({sf(Bx_q15)}² + {sf(By_q15)}²) = {sf(magB_q15)} m. Common mistake: adding A to the resultant instead of SUBTRACTING it to isolate B (since A + B = R means B = R − A).',
    answer=magB_q15, unit='m',
    figure=fig('1.5', 'q15', 'vector', vectors=[{'magnitude': 15, 'angleDeg': 0, 'label': 'A = 15 m'}, {'magnitude': magB_q15, 'angleDeg': degrees(atan2(By_q15, Bx_q15)), 'label': 'B = ?', 'dashed': True}], mode='fromOrigin', resultant={'label': 'R = 25 m, 36.9°'}))

n1_q16, e1_q16 = 300 * 0, 300 * 1
n2_q16, e2_q16 = 400 * cos(radians(30)), 400 * sin(radians(30))
n3_q16, e3_q16 = -200, 0
netN_q16b = n1_q16 + n2_q16 + n3_q16
netE_q16b = e1_q16 + e2_q16 + e3_q16
mag_q16b = hypot(netN_q16b, netE_q16b)
add('1.5', 'C', 'An orienteering course has three legs: 300 m due east, then 400 m on a bearing of 030°, then 200 m due south. (a) Resolve each leg into north and east components. (b) Find the net north and east components of the overall displacement. (c) Calculate the magnitude of the resultant displacement, to 3 significant figures. Give only the answer to (c).',
    f'(a) Leg 1 (due east): north = 0, east = 300 m. Leg 2 (bearing 030°): north = 400cos30° = {sf(n2_q16)} m, east = 400sin30° = {sf(e2_q16)} m. Leg 3 (due south): north = −200 m, east = 0. (b) Net north = 0 + {sf(n2_q16)} + (−200) = {sf(netN_q16b)} m. Net east = 300 + {sf(e2_q16)} + 0 = {sf(netE_q16b)} m. (c) Magnitude = √({sf(netN_q16b)}² + {sf(netE_q16b)}²) = {sf(mag_q16b)} m. Common mistake: forgetting the negative sign on the southward leg’s north-component, which would overstate the net northward progress.',
    answer=mag_q16b, unit='m',
    figure=fig('1.5', 'q16', 'vector', vectors=[{'magnitude': 300, 'angleDeg': 0, 'label': '300 m E'}, {'magnitude': 400, 'angleDeg': 60, 'label': '400 m, 030°'}, {'magnitude': 200, 'angleDeg': 270, 'label': '200 m S'}], mode='tipToTail', resultant={'label': 'resultant'}, compass=True))

n1_q17, e1_q17 = 0, 200
n2_q17, e2_q17 = 150, 0
n3_q17, e3_q17 = 100 * cos(radians(200)), 100 * sin(radians(200))
sumN_q17 = n1_q17 + n2_q17 + n3_q17
sumE_q17 = e1_q17 + e2_q17 + e3_q17
need_q17 = (-sumN_q17, -sumE_q17)
mag_q17 = hypot(*need_q17)
add('1.5', 'C', "A surveyor's traverse must close back exactly on its own starting point. Three legs have already been walked: 200 m due east, 150 m due north, and 100 m on a bearing of 200°. Calculate the length of the fourth leg needed to return exactly to the start.",
    f'Running totals so far: north = 150 + 100cos200° = {sf(sumN_q17)} m; east = 200 + 100sin200° = {sf(sumE_q17)} m. To close the traverse (return all totals to zero), the fourth leg must have components ({sf(need_q17[0])} m north, {sf(need_q17[1])} m east) — the exact negative of the running total. Its length is √({sf(need_q17[0])}² + {sf(need_q17[1])}²) = {sf(mag_q17)} m. Common mistake: trying to close the traverse by adjusting only one of the three existing legs, instead of finding one single new leg whose components cancel the combined total of all three.',
    answer=mag_q17, unit='m',
    figure=fig('1.5', 'q17', 'vector', vectors=[{'magnitude': 200, 'angleDeg': 0, 'label': '200 m E'}, {'magnitude': 150, 'angleDeg': 90, 'label': '150 m N'}, {'magnitude': 100, 'angleDeg': 90 - 200, 'label': '100 m, 200°'}], mode='tipToTail', resultant=None))

add('1.5', 'C', "A robot's planned path is three legs of equal length, each 10 m: on bearings 000°, 120° and 240° — spaced exactly 120° apart. Calculate the magnitude of the resultant displacement.",
    'Resolving each leg: leg 1 (10, 0), leg 2 10(cos120°, sin120°) = (−5.0, 8.66), leg 3 10(cos240°, sin240°) = (−5.0, −8.66) [components here taken from the x-axis for clarity]. Adding: x = 10−5.0−5.0 = 0, y = 0+8.66−8.66 = 0. The resultant is exactly ZERO — three equal vectors spaced evenly 120° apart always cancel completely, whatever their common magnitude. Common mistake: assuming three nonzero vectors can never sum to zero, and trying to force a nonzero numerical answer instead of checking the symmetry.',
    answer=0, unit='m',
    figure=fig('1.5', 'q18', 'table', headers=['Leg', 'Magnitude', 'Bearing'], rows=[['1', '10 m', '000°'], ['2', '10 m', '120°'], ['3', '10 m', '240°']]))

R_q19 = 2 * 10 * cos(radians(40))
add('1.5', 'S', 'Two displacement vectors of equal magnitude A have an angle θ between their directions (drawn tail-to-tail). Show, using components, that the magnitude of their resultant is R = 2A cos(θ/2). Then evaluate R for A = 10 m and θ = 80°.',
    f'Place the two vectors symmetrically about the x-axis, each at θ/2 from it: vector 1 = (Acos(θ/2), Asin(θ/2)), vector 2 = (Acos(θ/2), −Asin(θ/2)). Adding: x = 2Acos(θ/2), y = Asin(θ/2) − Asin(θ/2) = 0 — the y-components cancel by the symmetry of the setup, leaving the resultant entirely along the bisector, with magnitude R = 2Acos(θ/2). For A = 10 m, θ = 80°: R = 2 × 10 × cos40° = {sf(R_q19)} m. Common mistake: using the full angle θ instead of half of it (θ/2) inside the cosine — the formula only works because each vector is θ/2 away from the bisector, not θ away.',
    answer=R_q19, unit='m',
    figure=fig('1.5', 'q19', 'vector', vectors=[{'magnitude': 10, 'angleDeg': 40, 'label': 'A'}, {'magnitude': 10, 'angleDeg': -40, 'label': 'A'}], mode='fromOrigin', resultant={'label': 'R'}))

sumE_q20, sumN_q20 = 1.2 + 0.5 - 0.9, 0.8 - 1.5 + 0.3
mag_q20 = hypot(sumE_q20, sumN_q20)
add('1.5', 'S', "A hiker's GPS-tracked displacement from basecamp, in (east, north) km, updates each hour: Hour 1 (+1.2, +0.8), Hour 2 (+0.5, −1.5), Hour 3 (−0.9, +0.3). Their rescue beacon has a range of 2.0 km from basecamp. Calculate their distance from basecamp after these three hours, and state whether they remain in range.",
    f'Net east component = 1.2 + 0.5 + (−0.9) = {sf(sumE_q20)} km. Net north component = 0.8 + (−1.5) + 0.3 = {sf(sumN_q20)} km. Distance from basecamp = √({sf(sumE_q20)}² + {sf(sumN_q20)}²) = {sf(mag_q20)} km, which is well within the 2.0 km beacon range. Common mistake: adding the magnitudes of the three hourly displacements directly (which would overestimate the distance, since several components partly cancel) instead of summing the east and north components separately first.',
    answer=mag_q20, unit='km',
    figure=fig('1.5', 'q20', 'vector', vectors=[{'magnitude': hypot(1.2, 0.8), 'angleDeg': degrees(atan2(0.8, 1.2)), 'label': 'Hr 1'}, {'magnitude': hypot(0.5, 1.5), 'angleDeg': degrees(atan2(-1.5, 0.5)), 'label': 'Hr 2'}, {'magnitude': hypot(0.9, 0.3), 'angleDeg': degrees(atan2(0.3, -0.9)), 'label': 'Hr 3'}], mode='tipToTail', resultant={'label': 'net'}, compass=True))


# ════════════════════════════════════════════════════════════════════════
# 1.6 Combining velocities
# ════════════════════════════════════════════════════════════════════════
add('1.6', 'F', 'A boat moves relative to the water, and the water itself flows relative to the ground. How is the boat’s resultant velocity relative to the ground found?',
    "Velocities combine as vectors, exactly like displacements: the boat's velocity relative to the water and the water's velocity relative to the ground are added tip-to-tail (or by components) to give the boat's resultant velocity relative to the ground. Common mistake: trying to average the two velocities instead of adding them as vectors.",
    kind='multiple_choice',
    options=['They are added as vectors (tip-to-tail, or by components)', 'They are averaged', 'Only the larger of the two velocities matters', 'They are multiplied together'],
    correct_idx=0)

add('1.6', 'F', "A swimmer swims at 5.0 m/s relative to the water, in the same direction as a current flowing at 2.0 m/s. Calculate the swimmer's resultant velocity relative to the ground.",
    'Both velocities act in the same direction, so they add directly: 5.0 + 2.0 = 7.0 m/s. Common mistake: using Pythagoras here, which is only needed when the two velocities are NOT in the same direction.',
    answer=7.0, unit='m/s', figure=fig('1.6', 'q2', 'vector', vectors=[{'magnitude': 5.0, 'angleDeg': 0, 'label': 'swimmer, 5.0 m/s'}, {'magnitude': 2.0, 'angleDeg': 0, 'label': 'current, 2.0 m/s'}], mode='tipToTail', resultant={'label': 'resultant'}))

add('1.6', 'F', 'Taking the swimmer’s intended direction as positive, a swimmer swims at +2.0 m/s relative to the water, directly against a current flowing at −3.0 m/s. Calculate the swimmer’s resultant velocity relative to the ground.',
    'The two velocities are in opposite directions, so they are added with their signs: 2.0 + (−3.0) = −1.0 m/s. The negative sign shows the swimmer is actually being swept backwards overall, despite swimming forwards relative to the water. Common mistake: giving +1.0 m/s, which would mean the swimmer is making forward progress — the opposite of what is actually happening.',
    answer=-1.0, unit='m/s', sign_sensitive=True,
    figure=fig('1.6', 'q3', 'vector', vectors=[{'magnitude': 2.0, 'angleDeg': 0, 'label': 'swimmer, +2.0 m/s'}, {'magnitude': 3.0, 'angleDeg': 180, 'label': 'current, −3.0 m/s'}], mode='tipToTail', resultant={'label': 'resultant'}))

mag_q4 = hypot(3.0, 4.0)
add('1.6', 'F', 'A boat heads straight across a river at 3.0 m/s relative to the water, while the current flows at 4.0 m/s along the river. Calculate the magnitude of the boat’s resultant velocity relative to the ground.',
    f'These two velocities are perpendicular, so Pythagoras applies: magnitude = √(3.0² + 4.0²) = √(9+16) = √25 = {sf(mag_q4)} m/s (a 3-4-5 triangle). Common mistake: adding 3.0 + 4.0 = 7.0 m/s directly, ignoring that the two velocities act at right angles.',
    answer=mag_q4, unit='m/s', figure=fig('1.6', 'q4', 'vector', vectors=[{'magnitude': 3.0, 'angleDeg': 90, 'label': 'boat, 3.0 m/s'}, {'magnitude': 4.0, 'angleDeg': 0, 'label': 'current, 4.0 m/s'}], mode='tipToTail', resultant={'label': 'resultant'}))

head_q5 = 20 * cos(radians(30))
add('1.6', 'F', 'A headwind of 20 m/s blows at 30° to a plane’s direction of travel. Calculate the component of the wind acting directly against the plane’s motion.',
    f'Component along the direction of travel = 20 × cos30° = 20 × {sf(cos(radians(30)))} = {sf(head_q5)} m/s. Common mistake: using the full 20 m/s as the headwind component, ignoring that only part of an angled wind acts directly against the direction of travel.',
    answer=head_q5, unit='m/s', figure=fig('1.6', 'q5', 'vector', vectors=[{'magnitude': 20, 'angleDeg': 150, 'label': 'wind, 20 m/s'}], mode='fromOrigin'))

add('1.6', 'F', "A plane's airspeed (velocity relative to the air) is 200 m/s, and the air itself is perfectly still (zero wind). State the plane's ground speed.",
    "With no wind, the air's velocity relative to the ground is zero, so the plane's velocity relative to the ground equals its velocity relative to the air: 200 m/s. Common mistake: assuming ground speed and airspeed must always differ — they are only different when there is wind to add or subtract.",
    answer=200, unit='m/s')

mag_q7 = hypot(2.0, 1.5)
add('1.6', 'I', 'A boat is steered straight across a river at 2.0 m/s relative to the water, while the current flows along the river at 1.5 m/s. Calculate the magnitude of the boat’s resultant velocity over the ground.',
    f'magnitude = √(2.0² + 1.5²) = √(4.0+2.25) = √6.25 = {sf(mag_q7)} m/s. Common mistake: forgetting that "steered straight across" describes the boat’s velocity relative to the WATER, not its actual path over the ground, which is diverted downstream by the current.',
    answer=mag_q7, unit='m/s',
    figure=fig('1.6', 'q7', 'vector', vectors=[{'magnitude': 2.0, 'angleDeg': 90, 'label': 'boat, 2.0 m/s'}, {'magnitude': 1.5, 'angleDeg': 0, 'label': 'current, 1.5 m/s'}], mode='tipToTail', resultant={'label': 'resultant'}))

add('1.6', 'I', 'To cross a river by the shortest possible path (travelling straight across, perpendicular to the banks), in which direction should a boat be steered relative to the water, if the current flows along the river?',
    "The boat must be steered at an angle upstream (angled against the current), so that the upstream component of the boat's own velocity exactly cancels the current's downstream push, leaving only a resultant velocity straight across. Common mistake: steering straight across relative to the WATER, which actually results in a path that drifts downstream, not a straight-across path over the ground.",
    kind='multiple_choice',
    options=['Angled upstream, so the current’s effect is exactly cancelled', 'Straight across, relative to the water', 'Angled downstream, to arrive sooner', 'Directly against the current, facing fully upstream'],
    correct_idx=0)

theta_q9 = degrees(asin(3.0 / 5.0))
add('1.6', 'I', 'A boat’s speed relative to the water is 5.0 m/s. It must be steered at an angle θ upstream from the straight-across direction to travel directly across a current flowing at 3.0 m/s. Calculate θ.',
    f'The upstream component of the boat’s velocity must exactly cancel the current: 5.0sinθ = 3.0, so sinθ = 3.0/5.0 = 0.60 and θ = sin⁻¹(0.60) = {sf(theta_q9)}° (this is a 3-4-5 triangle). Common mistake: using cos instead of sin, which would use the wrong side of the triangle for this angle.',
    answer=theta_q9, unit='°',
    figure=fig('1.6', 'q9', 'vector', vectors=[{'magnitude': 5.0, 'angleDeg': 90 + theta_q9, 'label': 'boat, 5.0 m/s'}, {'magnitude': 3.0, 'angleDeg': 0, 'label': 'current, 3.0 m/s'}], mode='tipToTail', resultant={'label': 'straight across'}))

mag_q10 = hypot(300, 60)
add('1.6', 'I', "A plane's airspeed is 300 km/h due north, and a wind of 60 km/h blows due east. Calculate the magnitude of the plane's ground speed.",
    f'ground speed = √(300² + 60²) = √(90000+3600) = √93600 = {sf(mag_q10)} km/h. Common mistake: adding 300 + 60 = 360 km/h, treating the perpendicular wind as if it were blowing along the plane’s own direction.',
    answer=mag_q10, unit='km/h',
    figure=fig('1.6', 'q10', 'vector', vectors=[{'magnitude': 300, 'angleDeg': 90, 'label': 'airspeed, 300 km/h'}, {'magnitude': 60, 'angleDeg': 0, 'label': 'wind, 60 km/h'}], mode='tipToTail', resultant={'label': 'ground track'}, compass=True))

add('1.6', 'I', "In the previous scenario (airspeed 300 km/h due north, wind 60 km/h due east), is the plane's actual track over the ground exactly due north?",
    "No — the eastward wind pushes the plane's resultant track slightly east of due north. The plane's NOSE points due north (that is its heading relative to the air), but its actual path over the ground (its track) is deflected towards the east by the crosswind, by an angle of tan⁻¹(60/300) ≈ 11° east of north. Common mistake: confusing the plane's heading (where it points) with its track (the path it actually follows over the ground) — these are only the same when there is no crosswind.",
    kind='multiple_choice',
    options=['No, the crosswind deflects the ground track east of due north', 'Yes, the track is always the same as the heading', 'No, the plane is blown due east instead', 'Yes, because airspeed is larger than the wind speed'],
    correct_idx=0)

mag_q12 = hypot(1.2, 0.8)
add('1.6', 'I', "A swimmer's velocity relative to the water is 1.2 m/s straight across a current flowing at 0.80 m/s. Calculate the magnitude of the swimmer's resultant velocity.",
    f'magnitude = √(1.2² + 0.80²) = √(1.44+0.64) = √2.08 = {sf(mag_q12)} m/s. Common mistake: rounding 1.2 and 0.80 too early and losing precision before combining them.',
    answer=mag_q12, unit='m/s',
    figure=fig('1.6', 'q12', 'vector', vectors=[{'magnitude': 1.2, 'angleDeg': 90, 'label': 'swimmer, 1.2 m/s'}, {'magnitude': 0.80, 'angleDeg': 0, 'label': 'current, 0.80 m/s'}], mode='tipToTail', resultant={'label': 'resultant'}))

t_q13 = 50 / 2.0
add('1.6', 'I', 'A river is 50 m wide. A boat’s velocity component perpendicular to the banks (straight across) is 2.0 m/s, regardless of any current along the river. Calculate the time taken to cross.',
    f'The time to cross depends ONLY on the component of velocity perpendicular to the banks: t = width ÷ perpendicular component = 50 ÷ 2.0 = {sf(t_q13)} s. The along-river current affects where the boat lands, but not how long the crossing takes. Common mistake: trying to use the boat’s resultant speed (including the current) rather than just its cross-river component.',
    answer=t_q13, unit='s')

t_q14 = 120 / 2.0
drift_q14 = 1.5 * t_q14
resultant_q14 = hypot(2.0, 1.5)
add('1.6', 'C', 'A river 120 m wide has a current of 1.5 m/s. A boat is steered straight across (relative to the water) at 2.0 m/s. (a) Calculate the time taken to cross. (b) Calculate how far downstream the boat drifts during the crossing. (c) Calculate the magnitude of the resultant speed over the ground. Give only the answer to (b).',
    f'(a) Crossing time depends only on the cross-river component: t = 120 ÷ 2.0 = {sf(t_q14)} s. (b) Downstream drift = current speed × crossing time = 1.5 × {sf(t_q14)} = {sf(drift_q14)} m. (c) Resultant speed = √(2.0²+1.5²) = {sf(resultant_q14)} m/s. Common mistake: using the resultant speed (2.5 m/s) instead of the current’s own speed (1.5 m/s) when finding the drift — the drift is caused by the current alone, over the time the crossing actually takes.',
    answer=drift_q14, unit='m',
    figure=fig('1.6', 'q14', 'vector', vectors=[{'magnitude': 2.0, 'angleDeg': 90, 'label': 'boat, 2.0 m/s'}, {'magnitude': 1.5, 'angleDeg': 0, 'label': 'current, 1.5 m/s'}], mode='tipToTail', resultant={'label': 'resultant, 2.5 m/s'}))

theta_q15 = degrees(asin(2.4 / 4.0))
cross_q15 = sqrt(4.0**2 - 2.4**2)
t_q15 = 200 / cross_q15
add('1.6', 'C', 'A boat’s speed relative to the water is 4.0 m/s, and the current flows at 2.4 m/s. (a) Calculate the angle upstream (from straight across) at which the boat must be steered to travel directly across. (b) Calculate the resultant cross-river speed in that case. (c) Calculate the time to cross a river 200 m wide. Give only the answer to (c).',
    f'(a) The upstream component must cancel the current: 4.0sinθ = 2.4, so sinθ = 0.60 and θ = {sf(theta_q15)}°. (b) The cross-river component is then √(4.0² − 2.4²) = √(16−5.76) = √10.24 = {sf(cross_q15)} m/s (the remaining side of the same 3-4-5-style triangle). (c) Time = 200 ÷ {sf(cross_q15)} = {sf(t_q15)} s. Common mistake: using the boat’s own speed relative to the water (4.0 m/s) to find the crossing time, instead of its smaller resultant cross-river component (3.2 m/s).',
    answer=t_q15, unit='s',
    figure=fig('1.6', 'q15', 'vector', vectors=[{'magnitude': 4.0, 'angleDeg': 90 + theta_q15, 'label': 'boat, 4.0 m/s'}, {'magnitude': 2.4, 'angleDeg': 0, 'label': 'current, 2.4 m/s'}], mode='tipToTail', resultant={'label': 'straight across'}))

theta_q16 = degrees(asin(40 / 250))
ground_q16 = sqrt(250.0**2 - 40.0**2)
add('1.6', 'C', 'A plane needs to fly due north. Its airspeed is 250 km/h, and a wind of 40 km/h blows from the west (pushing due east). (a) Calculate the angle west of north at which the pilot must point the plane. (b) Calculate the resultant ground speed. Give only the answer to (b), to 3 significant figures.',
    f'(a) The westward component of the airspeed must cancel the eastward wind: 250sinθ = 40, so sinθ = 0.16 and θ = {sf(theta_q16)}° west of north. (b) The resulting northward ground speed is √(250² − 40²) = √(62500−1600) = √60900 = {sf(ground_q16)} km/h. Common mistake: adding the airspeed and wind speed directly (250+40=290 km/h) instead of recognising the pilot must angle into the wind, which reduces the forward ground speed below the airspeed.',
    answer=ground_q16, unit='km/h',
    figure=fig('1.6', 'q16', 'vector', vectors=[{'magnitude': 250, 'angleDeg': 90 + theta_q16, 'label': 'airspeed, 250 km/h'}, {'magnitude': 40, 'angleDeg': 0, 'label': 'wind, 40 km/h'}], mode='tipToTail', resultant={'label': 'ground track, due N'}, compass=True))

relvel_q17 = 25 - 18
t_q17 = 500 / relvel_q17
add('1.6', 'C', 'Car A travels at +25 m/s and car B travels at +18 m/s, both in the same direction on a straight road, with B exactly 500 m ahead of A. (a) Calculate the velocity of A relative to B. (b) Calculate the time taken for A to catch up with B, assuming both velocities stay constant. Give only the answer to (b).',
    f'(a) Velocity of A relative to B = velocity of A − velocity of B = 25 − 18 = {sf(relvel_q17)} m/s — this is how fast the 500 m gap closes. (b) Time to close the gap = 500 ÷ {sf(relvel_q17)} = {sf(t_q17)} s. Common mistake: using car A’s own velocity (25 m/s) instead of its velocity RELATIVE TO B (7 m/s) when finding how quickly the gap between them closes.',
    answer=t_q17, unit='s')

relx_q18, rely_q18 = 0 - 6, -8 - 0
mag_q18 = hypot(relx_q18, rely_q18)
add('1.6', 'C', 'Rain falls vertically at 8.0 m/s relative to the ground. A cyclist travels horizontally at 6.0 m/s. (a) Write the velocity of the rain relative to the ground as a vector, and the cyclist’s velocity as a vector, using the cyclist’s direction of travel as the horizontal axis and "up" as positive vertical. (b) Calculate the magnitude of the rain’s velocity relative to the cyclist. Give only the answer to (b).',
    f'(a) Rain (relative to ground) = (0, −8.0) m/s [purely vertical, downward]. Cyclist (relative to ground) = (6.0, 0) m/s [purely horizontal]. (b) Velocity of rain relative to the cyclist = (rain’s velocity) − (cyclist’s velocity) = (0−6.0, −8.0−0) = ({sf(relx_q18)}, {sf(rely_q18)}) m/s. Magnitude = √({sf(abs(relx_q18))}² + {sf(abs(rely_q18))}²) = {sf(mag_q18)} m/s (a 3-4-5 triangle scaled by 2). Common mistake: adding the cyclist’s velocity to the rain’s instead of SUBTRACTING it — relative velocity of X with respect to Y is always (velocity of X) − (velocity of Y).',
    answer=mag_q18, unit='m/s',
    figure=fig('1.6', 'q18', 'vector', vectors=[{'magnitude': 8.0, 'angleDeg': 270, 'label': 'rain, 8.0 m/s'}, {'magnitude': 6.0, 'angleDeg': 180, 'label': '−cyclist, 6.0 m/s'}], mode='tipToTail', resultant={'label': 'rain rel. to cyclist'}))

theta_q19 = degrees(asin(3.0 / 5.0))
cross_q19 = sqrt(5.0**2 - 3.0**2)
t_q19 = 200 / cross_q19
add('1.6', 'S', 'A boat’s speed relative to the water is u, crossing a river of width w flowing at speed c (with c < u), steered at angle θ upstream from straight-across so that it lands exactly opposite its start. Derive expressions for θ and for the crossing time t, in terms of u, c and w. Evaluate t for u = 5.0 m/s, c = 3.0 m/s and w = 200 m.',
    f'The upstream component of u must cancel the current: u sinθ = c, so θ = sin⁻¹(c/u). The remaining (cross-river) component is then √(u² − c²) by Pythagoras, so the crossing time is t = w ÷ √(u² − c²). Evaluating: θ = sin⁻¹(3.0/5.0) = {sf(theta_q19)}°, cross-speed = √(5.0²−3.0²) = √16 = {sf(cross_q19)} m/s, and t = 200 ÷ {sf(cross_q19)} = {sf(t_q19)} s. Common mistake: using u itself (5.0 m/s) in the time formula instead of the smaller cross-river component √(u²−c²) (4.0 m/s) — steering upstream to counter the current always costs some of the boat’s own forward progress.',
    answer=t_q19, unit='s')

eastA_q20, northA_q20 = 12 * sin(radians(45)), 12 * cos(radians(45))
eastB_q20, northB_q20 = 9.0 * sin(radians(315)), 9.0 * cos(radians(315))
relE_q20 = eastB_q20 - eastA_q20
closing_q20 = abs(relE_q20)
add('1.6', 'S', 'Ship B is 20 km due east of ship A. Ship A sails at 12 km/h on a course (bearing) of 045°, and ship B sails at 9.0 km/h on a course of 315°. Calculate the component of B’s velocity relative to A that lies along the original A–B line (due east–west), and hence state the rate at which the separation between the ships is changing.',
    f'Resolve each course into east/north components using east = speed × sin(bearing), north = speed × cos(bearing): A = ({sf(eastA_q20)}, {sf(northA_q20)}) km/h, B = ({sf(eastB_q20)}, {sf(northB_q20)}) km/h. Velocity of B relative to A has east-component = {sf(eastB_q20)} − {sf(eastA_q20)} = {sf(relE_q20)} km/h. Since the ships’ initial separation lies purely east-west, this east-component alone tells us how the separation is changing: it is negative, meaning B is moving towards A (westward relative to A) at {sf(closing_q20)} km/h — the ships are getting closer. Common mistake: using the full magnitude of B’s relative velocity (which also has a north-south part) instead of only the component ALONG the line joining the two ships, which is the only part that affects their separation distance.',
    answer=closing_q20, unit='km/h')


# ════════════════════════════════════════════════════════════════════════
# 1.7 Subtracting vectors
# ════════════════════════════════════════════════════════════════════════
add('1.7', 'F', 'How is the vector subtraction A − B carried out?',
    'A − B is found by reversing the direction of B (keeping its magnitude the same) to get −B, and then adding A + (−B) using the usual tip-to-tail (or component) method for vector addition. Common mistake: subtracting the magnitudes of A and B as if they were ordinary numbers, ignoring their directions.',
    kind='multiple_choice',
    options=['Reverse the direction of B, then add A + (−B)', 'Subtract the magnitude of B from the magnitude of A, ignoring direction',
             'Add A and B as normal, then halve the result', 'Rotate A by 90° and add B'],
    correct_idx=0)

dv_q2 = 4 - 10
add('1.7', 'F', 'Taking the direction of travel as positive, a car’s velocity changes from +10 m/s to +4 m/s. Calculate the change in velocity, Δv.',
    f'Δv = final velocity − initial velocity = 4 − 10 = {sf(dv_q2)} m/s. The negative sign shows the velocity has decreased (the car has decelerated), even though it never changes direction. Common mistake: computing initial − final (10−4=+6 m/s) instead of final − initial — Δ always means "final minus initial".',
    answer=dv_q2, unit='m/s', sign_sensitive=True)

dv_q3 = -3 - 5
add('1.7', 'F', 'Taking rightward as positive, an object’s velocity changes from +5.0 m/s to −3.0 m/s. Calculate Δv.',
    f'Δv = final − initial = (−3.0) − (+5.0) = {sf(dv_q3)} m/s. Common mistake: adding the two velocities (5.0 + (−3.0) = 2.0 m/s) instead of subtracting — a CHANGE is always found by subtraction, not addition.',
    answer=dv_q3, unit='m/s', sign_sensitive=True,
    figure=fig('1.7', 'q3', 'vector', vectors=[{'magnitude': 5.0, 'angleDeg': 180, 'label': '−v₁'}, {'magnitude': 3.0, 'angleDeg': 180, 'label': 'v₂'}], mode='tipToTail', resultant={'label': 'Δv'}))

add('1.7', 'F', 'Given a vector B, how do you find −B?',
    'Keep the same magnitude, but reverse the direction by 180°. Common mistake: making the magnitude negative instead (which is meaningless for a vector’s size) rather than reversing the direction.',
    kind='multiple_choice', options=['Keep the magnitude the same; reverse the direction', 'Double the magnitude; keep the same direction', 'Halve the magnitude; keep the same direction', 'Keep the magnitude the same; rotate it by 90°'], correct_idx=0)

add('1.7', 'F', 'Vector A is 10 m east and vector B is 6 m east. Calculate A − B.',
    'Since A and B point in the same direction, A − B = A + (−B) simplifies to 10 − 6 = 4 m east. Common mistake: treating this like a right-angle subtraction and reaching for Pythagoras, when the two vectors are actually parallel.',
    answer=4, unit='m', figure=fig('1.7', 'q5', 'vector', vectors=[{'magnitude': 10, 'angleDeg': 0, 'label': 'A = 10 m'}, {'magnitude': 6, 'angleDeg': 180, 'label': '−B'}], mode='tipToTail', resultant={'label': 'A−B'}))

add('1.7', 'F', 'Vector A is 10 m north and vector B is 10 m north (equal to A). State the magnitude of A − B.',
    'Subtracting an equal vector from itself always gives zero: A − B = 0 m. Common mistake: thinking a subtraction of two nonzero vectors must itself be nonzero — it is exactly zero whenever the two vectors are identical.',
    answer=0, unit='m')

dvx_q7, dvy_q7 = 0 - 6, 6 - 0
mag_q7 = hypot(dvx_q7, dvy_q7)
add('1.7', 'I', "An object's velocity changes from (6.0, 0) m/s to (0, 6.0) m/s (components in m/s). Calculate the magnitude of the change in velocity, Δv.",
    f'Δv = v₂ − v₁ = (0−6.0, 6.0−0) = ({sf(dvx_q7)}, {sf(dvy_q7)}) m/s. Magnitude = √({sf(abs(dvx_q7))}² + {sf(abs(dvy_q7))}²) = {sf(mag_q7)} m/s. Common mistake: computing |v₂| − |v₁| = 6.0 − 6.0 = 0, which compares only the SIZES of the two velocities and completely ignores that their directions are different.',
    answer=mag_q7, unit='m/s',
    figure=fig('1.7', 'q7', 'vector', vectors=[{'magnitude': 6.0, 'angleDeg': 180, 'label': '−v₁'}, {'magnitude': 6.0, 'angleDeg': 90, 'label': 'v₂'}], mode='tipToTail', resultant={'label': 'Δv'}))

add('1.7', 'I', 'An object moves in a circle at a perfectly constant SPEED. Does its velocity change?',
    'Yes — velocity is a vector, and even though the speed (magnitude) never changes, the DIRECTION is continuously changing as the object goes around the circle. Since velocity depends on both size and direction, a changing direction means a changing velocity, so Δv is nonzero at every instant, even though |v| stays exactly the same throughout. Common mistake: concluding there is no change in velocity because the speedometer reading (speed) never changes.',
    kind='multiple_choice',
    options=['Yes — its direction keeps changing, so velocity (a vector) keeps changing even though speed does not', 'No — constant speed always means constant velocity',
             'No — velocity only changes if the speed changes', 'Yes, but only because the object is also slowing down'],
    correct_idx=0)

dvx_q9, dvy_q9 = 0 - 8, 8 - 0
mag_q9 = hypot(dvx_q9, dvy_q9)
add('1.7', 'I', 'An object moving in a circle at constant speed 8.0 m/s has velocity 8.0 m/s at 0° at one instant, and 8.0 m/s at 90° a quarter-revolution later. Calculate the magnitude of Δv between these two instants.',
    f'Δv = v₂ − v₁ = 8.0(cos90°,sin90°) − 8.0(cos0°,sin0°) = (0,8.0) − (8.0,0) = ({sf(dvx_q9)}, {sf(dvy_q9)}) m/s. Magnitude = √({sf(abs(dvx_q9))}²+{sf(abs(dvy_q9))}²) = {sf(mag_q9)} m/s. Common mistake: assuming Δv must be zero because the speed before and after is identical (8.0 m/s both times) — only the SPEED is unchanged; the direction (and hence the velocity vector) is not.',
    answer=mag_q9, unit='m/s',
    figure=fig('1.7', 'q9', 'vector', vectors=[{'magnitude': 8.0, 'angleDeg': 180, 'label': '−v₁'}, {'magnitude': 8.0, 'angleDeg': 90, 'label': 'v₂'}], mode='tipToTail', resultant={'label': 'Δv'}))

dv_q10 = 2 * 20 * sin(radians(30))
add('1.7', 'I', 'Two velocity vectors have equal magnitude 20 m/s, with an angle of 60° between their directions. Using the fact that for equal magnitudes v, |Δv| = 2v sin(θ/2), calculate |Δv|.',
    f'|Δv| = 2v sin(θ/2) = 2 × 20 × sin(30°) = 2 × 20 × {sf(sin(radians(30)))} = {sf(dv_q10)} m/s. Common mistake: using the full angle θ = 60° inside the sine instead of half of it (30°) — the formula only works with half the angle between the two vectors.',
    answer=dv_q10, unit='m/s')

add('1.7', 'I', 'For two velocity vectors of EQUAL magnitude v, with an angle θ between their directions, which expression correctly gives the magnitude of their difference, |Δv|?',
    'For equal magnitudes, the two vectors and their difference form an isosceles triangle; splitting it down the middle gives |Δv| = 2v sin(θ/2). Common mistake: picking 2v sinθ (using the full angle, not half of it) or vθ (confusing this with the ARC LENGTH formula from circular motion, which is a different quantity).',
    kind='multiple_choice', options=['2v sin(θ/2)', '2v sinθ', 'vθ', '2v cosθ'], correct_idx=0)

dvx_q12, dvy_q12 = 1 - 4, 7 - 3
mag_q12 = hypot(dvx_q12, dvy_q12)
add('1.7', 'I', 'A velocity changes from (4.0, 3.0) m/s to (1.0, 7.0) m/s. Calculate the magnitude of Δv.',
    f'Δv = (1.0−4.0, 7.0−3.0) = ({sf(dvx_q12)}, {sf(dvy_q12)}) m/s. Magnitude = √({sf(abs(dvx_q12))}² + {sf(abs(dvy_q12))}²) = {sf(mag_q12)} m/s (a 3-4-5 triangle). Common mistake: subtracting the magnitudes of the two velocity vectors (|v₂|−|v₁|) instead of subtracting their COMPONENTS first and then finding the magnitude of the result.',
    answer=mag_q12, unit='m/s',
    figure=fig('1.7', 'q12', 'vector', vectors=[{'magnitude': 5.0, 'angleDeg': 180 + degrees(atan2(3, 4)), 'label': '−v₁'}, {'magnitude': hypot(1, 7), 'angleDeg': degrees(atan2(7, 1)), 'label': 'v₂'}], mode='tipToTail', resultant={'label': 'Δv'}))

dv_q13 = -6 - 6
add('1.7', 'I', 'Taking the direction towards the wall as positive, a ball hits a wall at +6.0 m/s and bounces straight back at −6.0 m/s (an elastic, head-on bounce). Calculate Δv.',
    f'Δv = final − initial = (−6.0) − (+6.0) = {sf(dv_q13)} m/s. Common mistake: giving +12 m/s (using initial − final) or 0 m/s (wrongly assuming the speed is "the same" before and after, so nothing has changed — the DIRECTION has fully reversed, so the velocity has changed a great deal).',
    answer=dv_q13, unit='m/s', sign_sensitive=True,
    figure=fig('1.7', 'q13', 'vector', vectors=[{'magnitude': 6.0, 'angleDeg': 180, 'label': '−v₁'}, {'magnitude': 6.0, 'angleDeg': 180, 'label': 'v₂'}], mode='tipToTail', resultant={'label': 'Δv'}))

dvx_q14, dvy_q14 = 0 - 15, 15 - 0
mag_q14 = hypot(dvx_q14, dvy_q14)
a_q14 = mag_q14 / 0.50
add('1.7', 'C', 'A ball bounces off the corner of a wall: its velocity changes from 15 m/s at 0° to 15 m/s at 90° over a time of 0.50 s. (a) Calculate the components of Δv. (b) Calculate the magnitude of Δv. (c) Calculate the magnitude of the average acceleration during the bounce. Give only the answer to (c).',
    f'(a) Δv = 15(cos90°,sin90°) − 15(cos0°,sin0°) = (0,15) − (15,0) = ({sf(dvx_q14)}, {sf(dvy_q14)}) m/s. (b) |Δv| = √({sf(abs(dvx_q14))}²+{sf(abs(dvy_q14))}²) = {sf(mag_q14)} m/s. (c) average acceleration = Δv ÷ Δt = {sf(mag_q14)} ÷ 0.50 = {sf(a_q14)} m/s². Common mistake: using |v₂|−|v₁| = 0 for part (b), since the SPEED does not change in this bounce — only Δv, the vector difference, correctly captures the large change caused by the 90° redirection.',
    answer=a_q14, unit='m/s²',
    figure=fig('1.7', 'q14', 'vector', vectors=[{'magnitude': 15, 'angleDeg': 180, 'label': '−v₁'}, {'magnitude': 15, 'angleDeg': 90, 'label': 'v₂'}], mode='tipToTail', resultant={'label': 'Δv'}))

dv_q15 = 12 * sqrt(2)
add('1.7', 'C', 'An object moves in a circle at constant speed v. (a) Using |Δv| = 2v sin(θ/2), write an expression for |Δv| after exactly a quarter revolution (θ = 90°), in terms of v. (b) Evaluate it for v = 12 m/s.',
    f'(a) With θ = 90°: |Δv| = 2v sin(45°) = 2v × (√2/2) = v√2. (b) For v = 12 m/s: |Δv| = 12√2 = {sf(dv_q15)} m/s. Common mistake: assuming |Δv| should equal v itself after a quarter turn (since the two velocities look "equally spaced") — the correct factor is √2 ≈ 1.41, not 1.',
    answer=dv_q15, unit='m/s')

dvx_q16, dvy_q16 = 8 - 8, 4 - (-6)
mag_q16 = hypot(dvx_q16, dvy_q16)
add('1.7', 'C', 'A ball’s velocity just before bouncing off the ground is (8.0, −6.0) m/s, and just after is (8.0, +4.0) m/s (components in m/s, taking up as positive). (a) Calculate the components of Δv. (b) Calculate the magnitude of Δv. Give only the answer to (b).',
    f'(a) Δv = (8.0−8.0, 4.0−(−6.0)) = ({sf(dvx_q16)}, {sf(dvy_q16)}) m/s — the horizontal component is unchanged by the bounce (no horizontal force acts), while the vertical component reverses and loses some size (the bounce is not perfectly elastic). (b) |Δv| = √({sf(abs(dvx_q16))}²+{sf(abs(dvy_q16))}²) = {sf(mag_q16)} m/s. Common mistake: including the unchanged horizontal component (8.0 m/s) as if it contributed to Δv — a component that does not change contributes exactly zero to the difference.',
    answer=mag_q16, unit='m/s',
    figure=fig('1.7', 'q16', 'table', headers=['', 'vx / m/s', 'vy / m/s'], rows=[['before', '8.0', '−6.0'], ['after', '8.0', '+4.0']]))

dv_q17 = hypot(5 - 5, 12 - 0)
a_q17 = dv_q17 / 4.0
add('1.7', 'C', 'The table shows a particle’s velocity components at two times. (a) Calculate the magnitude of Δv between t = 0 s and t = 4.0 s. (b) Calculate the magnitude of the average acceleration over this interval. Give only the answer to (b).',
    f'(a) Δv = (5.0−5.0, 12−0) = (0, 12) m/s, so |Δv| = {sf(dv_q17)} m/s. (b) average acceleration = |Δv| ÷ Δt = {sf(dv_q17)} ÷ 4.0 = {sf(a_q17)} m/s². Common mistake: forgetting that the x-component (5.0 m/s) is unchanged here, and mistakenly including it in the magnitude of Δv, which would give the wrong (too large) value.',
    answer=a_q17, unit='m/s²',
    figure=fig('1.7', 'q17', 'table', headers=['t / s', 'vx / m/s', 'vy / m/s'], rows=[['0', '5.0', '0'], ['4.0', '5.0', '12']]))

relx_q18, rely_q18 = 20 - 12, 0 - 16
mag_q18 = hypot(relx_q18, rely_q18)
add('1.7', 'C', "Car A's velocity is (20, 0) m/s and car B's velocity is (12, 16) m/s (components in m/s). Calculate the magnitude of the velocity of A relative to B, v_A − v_B.",
    f'v_A − v_B = (20−12, 0−16) = ({sf(relx_q18)}, {sf(rely_q18)}) m/s. Magnitude = √({sf(abs(relx_q18))}² + {sf(abs(rely_q18))}²) = {sf(mag_q18)} m/s. Common mistake: computing v_B − v_A instead of v_A − v_B — the order matters, and reversing it would give a vector in exactly the opposite direction (the magnitude here happens to come out the same, but the direction would be wrong).',
    answer=mag_q18, unit='m/s',
    figure=fig('1.7', 'q18', 'vector', vectors=[{'magnitude': 20, 'angleDeg': 0, 'label': 'vₐ'}, {'magnitude': hypot(12, 16), 'angleDeg': 180 + degrees(atan2(16, 12)), 'label': '−v_B'}], mode='tipToTail', resultant={'label': 'vₐ−v_B'}))

dv_q19 = 2 * 15 * sin(radians(25))
add('1.7', 'S', 'For two vectors of equal magnitude v with an angle θ between their directions, show (using the isosceles triangle formed by v₁, v₂ and Δv) that |Δv| = 2v sin(θ/2). Evaluate this for v = 15 m/s and θ = 50°.',
    f'Place v₁ and v₂ tail-to-tail, each v₁ and v₂ making angle θ/2 with their common bisector (by symmetry, since |v₁|=|v₂|). Δv = v₂ − v₁ runs from the tip of v₁ to the tip of v₂, perpendicular to that bisector. Splitting the isosceles triangle along the bisector gives a right triangle with hypotenuse v and opposite side |Δv|/2, so sin(θ/2) = (|Δv|/2)/v, giving |Δv| = 2v sin(θ/2). For v = 15 m/s, θ = 50°: |Δv| = 2 × 15 × sin25° = {sf(dv_q19)} m/s. Common mistake: treating the triangle of v₁, v₂ and Δv as right-angled at the wrong vertex — the right angle only appears after bisecting the isosceles triangle, not in the original triangle itself.',
    answer=dv_q19, unit='m/s')

dvx_q20, dvy_q20 = 120 - 0, 7795 - 7800
mag_q20 = hypot(dvx_q20, dvy_q20)
a_q20 = mag_q20 / 2.5
add('1.7', 'S', 'A spacecraft’s orbital velocity is (0, 7800) m/s just before a thruster burn, and (120, 7795) m/s just after (components in m/s). The burn lasts 2.5 s. (a) Calculate the components of Δv produced by the burn. (b) Calculate the magnitude of Δv. (c) Calculate the magnitude of the average acceleration produced by the thrusters. Give only the answer to (c).',
    f'(a) Δv = (120−0, 7795−7800) = ({sf(dvx_q20)}, {sf(dvy_q20)}) m/s — the burn mostly changes the velocity sideways (120 m/s), while barely slowing the main orbital component (only 5 m/s). (b) |Δv| = √({sf(dvx_q20)}²+{sf(abs(dvy_q20))}²) = {sf(mag_q20)} m/s. (c) average acceleration = {sf(mag_q20)} ÷ 2.5 = {sf(a_q20)} m/s². Common mistake: using only the large 7800-ish numbers to estimate Δv, which are nearly equal and mostly cancel — the SMALL sideways component (120 m/s) actually dominates the size of Δv here.',
    answer=a_q20, unit='m/s²')


# ════════════════════════════════════════════════════════════════════════
# 1.8 Other examples of scalar and vector quantities
# ════════════════════════════════════════════════════════════════════════
add('1.8', 'F', 'Which of these is a SCALAR quantity?',
    'Energy has a size (measured in joules) but no direction associated with it, so it is a scalar. Common mistake: assuming any quantity that can be positive or negative (like some energies) must be a vector — sign alone does not make something a vector; it needs a direction in space.',
    kind='multiple_choice', options=['energy', 'force', 'momentum', 'acceleration'], correct_idx=0)

add('1.8', 'F', 'Which of these is a VECTOR quantity?',
    'Force has both a size (magnitude) and a direction in which it acts, so it is a vector. Common mistake: thinking of force only as "how hard something pushes" (a number) without considering that the direction of the push is just as physically important.',
    kind='multiple_choice', options=['force', 'mass', 'time', 'energy'], correct_idx=0)

add('1.8', 'F', 'Which of the following is a VECTOR quantity?',
    "Momentum (mass × velocity) has a direction, inherited from the velocity's direction, so it is a vector. Common mistake: confusing momentum with kinetic energy (½mv²), which uses velocity SQUARED and so loses the direction information, making it a scalar.",
    kind='multiple_choice', options=['momentum', 'temperature', 'distance', 'speed'], correct_idx=0)

add('1.8', 'F', 'Which of the following is a SCALAR quantity?',
    'Temperature is fully described by a single number (with a unit) and has no associated direction, so it is a scalar. Common mistake: confusing temperature with heat flow, which does have a direction (from hot to cold) and would need vector treatment if direction mattered for a calculation.',
    kind='multiple_choice', options=['temperature', 'velocity', 'displacement', 'force'], correct_idx=0)

W_q5 = 5.0 * G
add('1.8', 'F', 'Weight is a vector quantity, always directed vertically downward (towards the centre of the Earth). Calculate the magnitude of the weight of a 5.0 kg object, taking g = 9.81 N/kg.',
    f'weight = mass × g = 5.0 × 9.81 = {sf(W_q5)} N, directed vertically downward. Common mistake: forgetting that weight (a force) is distinct from mass (a scalar) — mass alone, 5.0 kg, has no direction and is not itself a weight.',
    answer=W_q5, unit='N', figure=fig('1.8', 'q5', 'vector', vectors=[{'magnitude': W_q5, 'angleDeg': 270, 'label': f'weight = {sf(W_q5)} N'}], mode='fromOrigin'))

add('1.8', 'F', 'Which pair of quantities are BOTH vectors?',
    'Force and velocity both have a size and a direction, so both are vectors. Common mistake: pairing a vector with a scalar (for example force and energy) and assuming both are the same type just because they are both common physics quantities.',
    kind='multiple_choice', options=['force and velocity', 'energy and power', 'mass and time', 'distance and speed'], correct_idx=0)

hx_q7 = 50 * cos(radians(40))
add('1.8', 'I', 'A force of 50 N acts at 40° above the horizontal. Calculate the horizontal component of this force.',
    f'Like any vector, a force resolves using horizontal = magnitude × cos(angle from horizontal): 50 × cos40° = 50 × {sf(cos(radians(40)))} = {sf(hx_q7)} N. This is exactly the same technique used for resolving a displacement or velocity — the method for resolving any vector is identical, whatever physical quantity it represents. Common mistake: thinking force needs a different resolving technique from displacement or velocity, when the underlying vector mathematics is identical.',
    answer=hx_q7, unit='N', figure=fig('1.8', 'q7', 'vector', vectors=[{'magnitude': 50, 'angleDeg': 40, 'label': '50 N'}], mode='fromOrigin'))

add('1.8', 'I', 'Identify the SCALAR quantity in this list.',
    'Power (the rate of transfer of energy) is a single number with no direction, so it is a scalar. Common mistake: assuming power must be a vector because it is closely related to force and velocity (both vectors) in the formula P = Fv — a product of two vectors used this way (through the dot product) can still give a scalar result.',
    kind='multiple_choice', options=['power', 'momentum', 'force', 'acceleration'], correct_idx=0)

p_q9 = 2.0 * 6.0
add('1.8', 'I', "A 2.0 kg object moves at 6.0 m/s. Calculate the magnitude of its momentum.",
    f'momentum = mass × velocity = 2.0 × 6.0 = {sf(p_q9)} kg m/s, directed the same way as the velocity (since mass, a positive scalar, never changes a vector’s direction, only scales its size). Common mistake: forgetting that momentum’s direction is simply inherited from the velocity’s direction — no separate calculation of direction is needed here.',
    answer=p_q9, unit='kg m/s', figure=fig('1.8', 'q9', 'vector', vectors=[{'magnitude': p_q9, 'angleDeg': 0, 'label': f'p = {sf(p_q9)} kg m/s'}], mode='fromOrigin'))

R_q10 = hypot(30, 40)
add('1.8', 'I', 'Two forces act on an object: 30 N due east and 40 N due north. Calculate the magnitude of the resultant force.',
    f'Forces combine exactly like any other vector: magnitude = √(30²+40²) = √(900+1600) = √2500 = {sf(R_q10)} N (a 3-4-5 triangle scaled by 10). Common mistake: adding 30 + 40 = 70 N directly, forgetting the two forces act at right angles.',
    answer=R_q10, unit='N',
    figure=fig('1.8', 'q10', 'vector', vectors=[{'magnitude': 30, 'angleDeg': 0, 'label': '30 N E'}, {'magnitude': 40, 'angleDeg': 90, 'label': '40 N N'}], mode='tipToTail', resultant={'label': 'resultant'}, compass=True))

add('1.8', 'I', 'Identify the VECTOR quantity in this list.',
    'Acceleration (the rate of change of velocity) has both a size and a direction — the direction in which the velocity is changing — so it is a vector. Common mistake: thinking of acceleration only as "how quickly something speeds up", without considering it could also describe slowing down or changing direction, both of which need a direction to describe fully.',
    kind='multiple_choice', options=['acceleration', 'mass', 'energy', 'distance'], correct_idx=0)

ty_q12 = 25 * sin(radians(60))
add('1.8', 'I', 'An object’s weight is 20 N, acting vertically down. A rope pulls on it with tension 25 N, directed at 60° above the horizontal. Calculate the vertical component of the tension.',
    f'Vertical component = 25 × sin60° = 25 × {sf(sin(radians(60)))} = {sf(ty_q12)} N. Common mistake: using cos60° instead of sin60° — the vertical component uses sin when the angle is measured FROM the horizontal.',
    answer=ty_q12, unit='N', figure=fig('1.8', 'q12', 'vector', vectors=[{'magnitude': 20, 'angleDeg': 270, 'label': 'weight, 20 N'}, {'magnitude': 25, 'angleDeg': 60, 'label': 'tension, 25 N'}], mode='fromOrigin'))

add('1.8', 'I', 'Which of these statements about combining vector quantities is TRUE?',
    'Because vectors depend on direction as well as size, the resultant of two vectors of magnitude 3 N and 4 N could be anywhere from |4−3|=1 N (opposite directions) up to 4+3=7 N (same direction), depending on the angle between them — it is not simply fixed at one value. Common mistake: assuming two forces of given sizes must always combine to one fixed resultant, regardless of the angle between them.',
    kind='multiple_choice',
    options=['Two forces of 3 N and 4 N could combine to give a resultant anywhere from 1 N to 7 N, depending on the angle between them',
             'Two forces of 3 N and 4 N must always combine to give exactly 7 N', 'Two forces of 3 N and 4 N must always combine to give exactly 5 N',
             'The resultant of two vectors never depends on the angle between them'],
    correct_idx=0)

R_q14 = hypot(80, 60)
angle_q14 = degrees(atan2(60, 80))
add('1.8', 'C', 'Two forces act on an object: 80 N at 0° and 60 N at 90°. (a) Calculate the magnitude of the resultant force. (b) Calculate the angle the resultant makes above the x-axis. Give only the answer to (a).',
    f'(a) magnitude = √(80²+60²) = √(6400+3600) = √10000 = {sf(R_q14)} N (a 3-4-5 triangle scaled by 20). (b) angle = tan⁻¹(60/80) = {sf(angle_q14)}° above the x-axis. Common mistake: forgetting that the two given forces are already at right angles, and instead trying to use the general (and here unnecessary) component-resolution method for angled vectors.',
    answer=R_q14, unit='N',
    figure=fig('1.8', 'q14', 'vector', vectors=[{'magnitude': 80, 'angleDeg': 0, 'label': '80 N'}, {'magnitude': 60, 'angleDeg': 90, 'label': '60 N'}], mode='tipToTail', resultant={'label': 'resultant'}))

liftV_q15 = 45 * cos(radians(20))
liftH_q15 = 45 * sin(radians(20))
netV_q15 = liftV_q15 - 30
add('1.8', 'C', 'A delivery drone’s weight is 30 N (vertically down). Its rotors provide a lift force of 45 N, directed 20° from the vertical. (a) Calculate the vertical component of the lift. (b) Calculate the horizontal component of the lift. (c) Calculate the net vertical force on the drone (lift’s vertical component minus weight). Give only the answer to (c).',
    f'(a) Vertical component of lift = 45cos20° = {sf(liftV_q15)} N. (b) Horizontal component of lift = 45sin20° = {sf(liftH_q15)} N. (c) Net vertical force = {sf(liftV_q15)} − 30 = {sf(netV_q15)} N (upward, since it is positive), which is why the drone climbs. Common mistake: using the full 45 N lift (rather than just its vertical component) when finding the net vertical force, ignoring that the lift is tilted and so only part of it acts vertically.',
    answer=netV_q15, unit='N',
    figure=fig('1.8', 'q15', 'vector', vectors=[{'magnitude': 30, 'angleDeg': 270, 'label': 'weight, 30 N'}, {'magnitude': 45, 'angleDeg': 70, 'label': 'lift, 45 N'}], mode='fromOrigin'))

p_q16 = 1500 * 20
add('1.8', 'C', 'State whether each of the following is a scalar or a vector: (i) kinetic energy, (ii) electric field strength, (iii) momentum, (iv) pressure. Then calculate the magnitude of the momentum of a 1500 kg car travelling at 20 m/s.',
    f'(i) Kinetic energy: scalar (no direction). (ii) Electric field strength: vector (has a direction, the direction a positive charge would be pushed). (iii) Momentum: vector (direction of motion). (iv) Pressure: scalar (force per unit area in all directions at a point, not one single direction). Momentum = mass × velocity = 1500 × 20 = {sf(p_q16)} kg m/s. Common mistake: classifying pressure as a vector because it comes from force (a vector) divided by area — the directional information is lost because pressure acts equally in every direction at a point.',
    answer=p_q16, unit='kg m/s')

dp_q17 = -2.0 - 3.0
add('1.8', 'C', 'Taking the direction of approach to the wall as positive, a 0.50 kg ball has momentum +3.0 kg m/s just before hitting a wall, and −2.0 kg m/s just after bouncing back. (a) Calculate the change in momentum, Δp. (b) Explain why the fact that momentum is a VECTOR (not a scalar) matters for this calculation. Give only the numerical answer to (a).',
    f'(a) Δp = final − initial = (−2.0) − (+3.0) = {sf(dp_q17)} kg m/s. (b) Because momentum is a vector, the bounce (a reversal of direction) must be represented by a sign change, not just by comparing the SIZES of the momentum before and after (which would wrongly suggest only a 1.0 kg m/s decrease in "how much momentum" there is). Common mistake: calculating |p_after| − |p_before| = 2.0 − 3.0 = −1.0 kg m/s, which ignores the fact that the ball’s direction reversed.',
    answer=dp_q17, unit='kg m/s', sign_sensitive=True,
    figure=fig('1.8', 'q17', 'vector', vectors=[{'magnitude': 2.0, 'angleDeg': 180, 'label': '−pᵢ'}, {'magnitude': 2.0, 'angleDeg': 180, 'label': 'p_f'}], mode='tipToTail', resultant={'label': 'Δp'}))

R_q18 = hypot(500, 300)
add('1.8', 'C', 'State which of the following are vector quantities and which are scalar: mass, weight, electric field strength, charge, kinetic energy, momentum, time. Then two electric field strength vectors, of magnitude 500 N/C and 300 N/C, act at right angles to each other at a point. Calculate the magnitude of the resultant field strength.',
    f'Vectors: weight, electric field strength, momentum (each has a direction). Scalars: mass, charge, kinetic energy, time (each is fully described by a single number). The same combination rule that applies to displacement or velocity applies here too: magnitude = √(500²+300²) = √(250000+90000) = √340000 = {sf(R_q18)} N/C. Common mistake: thinking electric field strength needs a completely different combination technique from "mechanical" vectors like displacement or force — the vector mathematics is identical for every vector quantity, whatever it physically represents.',
    answer=R_q18, unit='N/C',
    figure=fig('1.8', 'q18', 'vector', vectors=[{'magnitude': 500, 'angleDeg': 0, 'label': '500 N/C'}, {'magnitude': 300, 'angleDeg': 90, 'label': '300 N/C'}], mode='tipToTail', resultant={'label': 'resultant'}))

Rx_q19, Ry_q19 = 150 * cos(radians(40)), 150 * sin(radians(40))
Fx_q19, Fy_q19 = Rx_q19 - 120, Ry_q19 - 0
magF_q19 = hypot(Fx_q19, Fy_q19)
add('1.8', 'S', 'A rod experiences a known force of 120 N at 0° and an unknown force F. The resultant of the two forces is 150 N, directed at 40° above the x-axis. (a) Resolve the resultant into x- and y-components. (b) Hence find the components of F. (c) Calculate the magnitude of F. Give only the answer to (c).',
    f'(a) Resultant components: x = 150cos40° = {sf(Rx_q19)} N, y = 150sin40° = {sf(Ry_q19)} N. (b) Since the 120 N force + F = resultant: F_x = {sf(Rx_q19)} − 120 = {sf(Fx_q19)} N, F_y = {sf(Ry_q19)} − 0 = {sf(Fy_q19)} N. (c) Magnitude of F = √({sf(Fx_q19)}² + {sf(Fy_q19)}²) = {sf(magF_q19)} N. Common mistake: adding the 120 N force to the resultant instead of SUBTRACTING it to isolate the unknown F (since 120 N + F = resultant means F = resultant − 120 N).',
    answer=magF_q19, unit='N',
    figure=fig('1.8', 'q19', 'vector', vectors=[{'magnitude': 120, 'angleDeg': 0, 'label': '120 N'}, {'magnitude': magF_q19, 'angleDeg': degrees(atan2(Fy_q19, Fx_q19)), 'label': 'F = ?', 'dashed': True}], mode='fromOrigin', resultant={'label': 'R = 150 N, 40°'}))

sumx_q20, sumy_q20 = 6 + 0 - 2, 0 + 8 - 1
mag_q20 = hypot(sumx_q20, sumy_q20)
add('1.8', 'S', 'The method used to combine vectors (by components, or tip-to-tail) is identical no matter which physical quantity the vectors represent. Demonstrate this by finding the magnitude of the resultant of three momentum vectors, in kg m/s: (6, 0), (0, 8) and (−2, −1).',
    f'Exactly as with displacement or velocity, add the x-components together and the y-components together: x = 6 + 0 + (−2) = {sf(sumx_q20)} kg m/s; y = 0 + 8 + (−1) = {sf(sumy_q20)} kg m/s. Magnitude = √({sf(sumx_q20)}² + {sf(sumy_q20)}²) = {sf(mag_q20)} kg m/s. This confirms the point of this topic: the mathematics of vectors does not care whether the quantity being combined is a displacement, a velocity, a force, or (as here) a momentum — only the type of quantity, which must match for a sum to make physical sense, changes. Common mistake: thinking a "new" rule is needed to combine momentum vectors specifically, rather than reusing the exact component method already learned for displacement and velocity.',
    answer=mag_q20, unit='kg m/s',
    figure=fig('1.8', 'q20', 'vector', vectors=[{'magnitude': 6, 'angleDeg': 0, 'label': '(6,0)'}, {'magnitude': 8, 'angleDeg': 90, 'label': '(0,8)'}, {'magnitude': hypot(2, 1), 'angleDeg': 180 + degrees(atan2(1, 2)), 'label': '(−2,−1)'}], mode='tipToTail', resultant={'label': 'resultant'}))


# ════════════════════════════════════════════════════════════════════════
# 2.1 The meaning of acceleration
# ════════════════════════════════════════════════════════════════════════
add('2.1', 'F', 'Which statement correctly defines acceleration?',
    'Acceleration is the rate of change of velocity: a = Δv ÷ Δt. Like velocity, it is a vector, with a direction as well as a size. Common mistake: defining acceleration as "speeding up", which misses that acceleration also describes slowing down, and any change of direction.',
    kind='multiple_choice',
    options=['Acceleration is the rate of change of velocity', 'Acceleration is the rate of change of distance', 'Acceleration is velocity divided by mass', 'Acceleration only occurs when an object speeds up'],
    correct_idx=0)

add('2.1', 'F', 'A ball moving forward is slowing down. In which direction does its acceleration point, relative to its direction of motion?',
    "When an object slows down, its velocity is decreasing, so Δv (and hence the acceleration) points OPPOSITE to the direction of motion — this is what 'deceleration' means in vector terms. Common mistake: assuming acceleration must always point in the same direction as the velocity, which is only true while an object is speeding up.",
    kind='multiple_choice', options=['Opposite to the direction of motion', 'In the same direction as the motion', 'Perpendicular to the motion', 'Acceleration is undefined while slowing down'], correct_idx=0)

a_q3 = (16 - 10) / 3.0
add('2.1', 'F', "A car's velocity increases from 10 m/s to 16 m/s in 3.0 s. Calculate its acceleration.",
    f'acceleration = Δv ÷ Δt = (16−10) ÷ 3.0 = {sf(a_q3)} m/s². Common mistake: dividing the FINAL velocity (16 m/s) by the time instead of the CHANGE in velocity.',
    answer=a_q3, unit='m/s²',
    figure=fig('2.1', 'q3', 'motion', kind='velocity', points=[{'t': 0, 'y': 10}, {'t': 3.0, 'y': 16}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

add('2.1', 'F', 'What does "uniform acceleration" mean?',
    'Uniform acceleration means the velocity changes at a constant RATE — equal changes in velocity occur in equal time intervals, throughout the motion. Common mistake: confusing "uniform acceleration" with "uniform velocity" (constant speed, zero acceleration) — these describe very different motions.',
    kind='multiple_choice',
    options=['The velocity changes by equal amounts in equal time intervals', 'The velocity never changes', 'The object moves in a straight line at constant speed', 'The acceleration is always zero'],
    correct_idx=0)

add('2.1', 'F', 'An object moves at a constant velocity of 15 m/s in a straight line. State its acceleration.',
    "Since velocity is not changing at all, Δv = 0, so acceleration = 0 m/s². Common mistake: assuming a moving object must have a nonzero acceleration simply because it is moving — acceleration depends on whether the velocity is CHANGING, not on whether it is zero.",
    answer=0, unit='m/s²')

add('2.1', 'F', "A train's velocity is 20 m/s at the start of a time interval, and still 20 m/s at the end of it. Calculate its acceleration over that interval.",
    'Since the velocity is unchanged (Δv = 20−20 = 0), the acceleration is 0 m/s², whatever the length of the time interval. Common mistake: assuming a nonzero time interval must automatically give a nonzero acceleration — acceleration depends on the CHANGE in velocity, not on how much time has passed.',
    answer=0, unit='m/s²',
    figure=fig('2.1', 'f6', 'motion', kind='velocity', points=[{'t': 0, 'y': 20}, {'t': 6, 'y': 20}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a_q7 = (-3 - 5) / 2.0
add('2.1', 'I', "Taking the ball's initial direction as positive, a ball's velocity changes from +5.0 m/s to −3.0 m/s in 2.0 s (it bounces and reverses direction). Calculate its acceleration.",
    f'acceleration = Δv ÷ Δt = ((−3.0) − (+5.0)) ÷ 2.0 = (−8.0) ÷ 2.0 = {sf(a_q7)} m/s². Common mistake: using the SPEEDS before and after (5.0 and 3.0 m/s) instead of the signed velocities, which would miss that the direction has reversed.',
    answer=a_q7, unit='m/s²', sign_sensitive=True,
    figure=fig('2.1', 'q7', 'motion', kind='velocity', points=[{'t': 0, 'y': 5}, {'t': 2.0, 'y': -3}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', hRefLines=[0]))

add('2.1', 'I', 'A car moving in the negative direction (taking forward as positive) speeds up, becoming more negative. Is its acceleration positive or negative?',
    'The velocity is becoming MORE negative, so Δv is negative, meaning the acceleration itself is negative — even though the car is speeding up (not slowing down). Common mistake: assuming "negative acceleration" always means slowing down — it actually means the acceleration vector points in the negative direction, which can mean speeding up OR slowing down depending on which way the object is already moving.',
    kind='multiple_choice',
    options=['Negative — the acceleration points in the negative direction, in which the car is already moving and speeding up', 'Positive, because speeding up is always a positive acceleration',
             'Zero, because the direction has not changed', 'It is impossible to have acceleration while moving in the negative direction'],
    correct_idx=0)

decel_q9 = (40 - 0) / 20.0
add('2.1', 'I', 'A train decelerates uniformly from 40 m/s to rest in 20 s. Calculate the magnitude of its deceleration.',
    f'Deceleration is just the magnitude of a (negative) acceleration while slowing down: magnitude = Δv ÷ Δt = (40−0) ÷ 20 = {sf(decel_q9)} m/s². Common mistake: reporting this as "+2.0 m/s²" without recognising that, as an acceleration (not a deceleration magnitude), it would actually be −2.0 m/s² if forward is taken as positive.',
    answer=decel_q9, unit='m/s²',
    figure=fig('2.1', 'q9', 'motion', kind='velocity', points=[{'t': 0, 'y': 40}, {'t': 20, 'y': 0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

add('2.1', 'I', 'A ball is thrown straight up. At the very top of its path, its velocity is momentarily zero. Is its acceleration also zero at that instant?',
    "No — gravity continues to act on the ball throughout its flight, giving it a constant downward acceleration of about 9.81 m/s² at every instant, including the top, even though its velocity happens to be zero there for just that one instant. This is a classic case where velocity and acceleration are zero at DIFFERENT times. Common mistake: assuming zero velocity must always mean zero acceleration — they are independent quantities.",
    kind='multiple_choice',
    options=['No — its acceleration is still g, downward, even though its velocity is momentarily zero', 'Yes — zero velocity always means zero acceleration',
             'No — its acceleration briefly becomes infinite at the top', 'Yes, because the ball is not moving at that instant'],
    correct_idx=0)

a_q11 = 3.0 / 1.5
add('2.1', 'I', 'A lift accelerates uniformly upward from rest, reaching 3.0 m/s after 1.5 s. Calculate the magnitude of its acceleration.',
    f'acceleration = Δv ÷ Δt = (3.0−0) ÷ 1.5 = {sf(a_q11)} m/s². Common mistake: using the WRONG time (for example, confusing 1.5 s with a different stated time elsewhere in a multi-part problem).',
    answer=a_q11, unit='m/s²',
    figure=fig('2.1', 'q11', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 1.5, 'y': 3.0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

add('2.1', 'I', 'Which statement correctly distinguishes "uniform acceleration" from "uniform velocity"?',
    'Uniform velocity means the velocity itself stays constant (so acceleration is zero); uniform acceleration means the ACCELERATION stays constant, while the velocity itself is continuously changing at a steady rate. Common mistake: treating the two phrases as describing the same kind of motion, when they describe opposite situations for the velocity (constant vs continuously changing).',
    kind='multiple_choice',
    options=['Uniform velocity means velocity is constant (zero acceleration); uniform acceleration means acceleration is constant while velocity keeps changing steadily',
             'They both mean exactly the same thing', 'Uniform acceleration means the object is not moving', 'Uniform velocity means the acceleration is increasing steadily'],
    correct_idx=0)

a_q13 = (10 - 4) / 12.0
add('2.1', 'I', "A cyclist's velocity increases steadily from 4.0 m/s to 10 m/s over 12 s. Calculate the acceleration.",
    f'acceleration = Δv ÷ Δt = (10−4.0) ÷ 12 = {sf(a_q13)} m/s². Common mistake: dividing by the final velocity (10 m/s) rather than the time (12 s).',
    answer=a_q13, unit='m/s²',
    figure=fig('2.1', 'q13', 'motion', kind='velocity', points=[{'t': 0, 'y': 4.0}, {'t': 12, 'y': 10}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a1_q14 = (10 - 0) / 2.0
a2_q14 = 0
add('2.1', 'C', "A sprinter's velocity increases uniformly from 0 to 10 m/s in the first 2.0 s of a race, then stays constant at 10 m/s for the next 6.0 s. (a) Calculate the acceleration during the first 2.0 s. (b) State the acceleration during the next 6.0 s. (c) Explain why the acceleration in (b) is zero even though the sprinter is still moving quickly. Give only the numerical answer to (a).",
    f'(a) acceleration = (10−0) ÷ 2.0 = {sf(a1_q14)} m/s². (b) Since the velocity is no longer changing (it stays at exactly 10 m/s), acceleration = 0 m/s². (c) Acceleration depends on the RATE OF CHANGE of velocity, not on how fast the sprinter is actually moving — a high but unchanging velocity still gives zero acceleration. Common mistake: assuming a fast-moving object must also have a large acceleration — speed and acceleration are entirely separate quantities.',
    answer=a1_q14, unit='m/s²',
    figure=fig('2.1', 'q14', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 2.0, 'y': 10}, {'t': 8.0, 'y': 10}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

t_top_q15 = 15.0 / G
v_half_q15 = 15.0 - G * 0.5
add('2.1', 'C', 'A ball is thrown vertically upward at 15 m/s and returns to the thrower’s hand 2 × 15/9.81 s later (taking up as positive, g = 9.81 m/s² throughout the flight). (a) Calculate the time taken to reach the highest point. (b) Calculate the velocity 0.50 s after being thrown. (c) State whether the ball is still rising or already falling at that time. Give only the numerical answer to (b).',
    f'(a) At the highest point v = 0: 0 = 15 − 9.81t, so t = 15 ÷ 9.81 = {sf(t_top_q15)} s. (b) At t = 0.50 s: v = 15 − 9.81 × 0.50 = {sf(v_half_q15)} m/s. (c) Since this velocity is still positive (and 0.50 s is less than the {sf(t_top_q15)} s found in (a)), the ball is still RISING at this time. Common mistake: using g = +9.81 (instead of −9.81, since gravity decelerates the rise when up is positive), which would wrongly make the ball appear to speed up as it rises.',
    answer=v_half_q15, unit='m/s', sign_sensitive=True,
    figure=fig('2.1', 'q15', 'motion', kind='velocity', points=[{'t': 0, 'y': 15}, {'t': t_top_q15, 'y': 0}, {'t': 2 * t_top_q15, 'y': -15}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', hRefLines=[0], markers=[{'t': 0.5, 'y': v_half_q15, 'label': 't=0.5s'}]))

a_q16 = (16 - 6) / (5 - 2)
add('2.1', 'C', 'The table shows a trolley’s velocity at 1-second intervals: t = 0 s, 3.0 m/s; t = 1 s, 6.0 m/s; t = 2 s, 6.0 m/s; wait — use this data: t (s): 0, 1, 2, 3, 4, 5; v (m/s): 0, 3, 6, 9, 12, 16. Calculate the average acceleration between t = 2.0 s and t = 5.0 s.',
    f'Only the two endpoints matter for an average: acceleration = (16−6) ÷ (5−2) = {sf(a_q16)} m/s². (Between t = 0 s and t = 4 s the trolley’s acceleration looks uniform at 3.0 m/s², but the final second shows a bigger jump of 4.0 m/s², so the motion is not perfectly uniform overall — this average blends both parts of the interval asked about.) Common mistake: using the acceleration from the earlier, uniform-looking part of the table (3.0 m/s²) instead of recalculating using the actual two times given in the question.',
    answer=a_q16, unit='m/s²',
    figure=fig('2.1', 'q16', 'table', headers=['t / s', '0', '1', '2', '3', '4', '5'], rows=[['v / m/s', '0', '3', '6', '9', '12', '16']]))

dv_q17 = 6.4 - 2.0
a_q17 = dv_q17 / 2.0
unc_q17 = (0.1 + 0.1) / dv_q17 * 100
add('2.1', 'C', 'Velocity readings, each accurate to ±0.1 m/s, give 2.0 m/s at t = 0 and 6.4 m/s at t = 2.0 s (the time is measured precisely). (a) Calculate the acceleration. (b) Calculate the percentage uncertainty in this acceleration. Give only the answer to (b).',
    f'(a) acceleration = (6.4−2.0) ÷ 2.0 = {sf(a_q17)} m/s². (b) The two reading uncertainties combine by addition when the readings are subtracted: absolute uncertainty in Δv = 0.1 + 0.1 = 0.2 m/s, out of Δv = {sf(dv_q17)} m/s. Percentage uncertainty = 0.2 ÷ {sf(dv_q17)} × 100% = {sf(unc_q17)}% (the precisely-measured time contributes no extra uncertainty). Common mistake: using only ONE reading’s ±0.1 m/s uncertainty, instead of adding the uncertainties from both readings used in the subtraction.',
    answer=unc_q17, unit='%')

v1_q18, v2_q18, v3_q18 = 0 + 2.0 * 4.0, 8.0, 8.0 + (-4.0) * 2.0
add('2.1', 'C', "A car starts from rest. Its acceleration is +2.0 m/s² for 4.0 s (speeding up), then 0 m/s² for 10 s (constant velocity), then −4.0 m/s² for 2.0 s (braking). (a) Calculate the velocity at the end of the first phase. (b) Calculate the velocity at the end of the second phase. (c) Calculate the velocity at the end of the third (braking) phase. Give only the answer to (c).",
    f'(a) v = 0 + 2.0 × 4.0 = {sf(v1_q18)} m/s. (b) Unchanged during the constant-velocity phase: v = {sf(v2_q18)} m/s. (c) v = {sf(v2_q18)} + (−4.0) × 2.0 = {sf(v3_q18)} m/s — the braking phase exactly cancels the speeding-up phase, bringing the car back to rest. Common mistake: forgetting that the middle (zero-acceleration) phase leaves the velocity completely unchanged, and instead assuming it must also change the velocity because time has passed.',
    answer=v3_q18, unit='m/s',
    figure=fig('2.1', 'q18', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 4.0, 'y': v1_q18}, {'t': 14.0, 'y': v2_q18}, {'t': 16.0, 'y': v3_q18}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

add('2.1', 'S', "Explain why an object can have zero velocity but nonzero acceleration at one instant, and why an object can have zero acceleration but nonzero velocity at another instant. Then, for a ball thrown vertically upward at 20 m/s (taking up as positive, g = 9.81 m/s²), calculate its acceleration at the exact instant it is at the highest point of its path (where v = 0).",
    'Velocity and acceleration are independent quantities: velocity describes the CURRENT rate of change of displacement, while acceleration describes the rate of change of THAT velocity. A ball thrown upward has zero velocity at its highest point, but gravity is still acting on it at that exact instant, giving a nonzero (downward) acceleration — this is why it does not simply hover there, but immediately starts to fall. Conversely, an object moving at a constant velocity (e.g. a car cruising on a motorway) has a large, nonzero velocity but zero acceleration, since its velocity is not changing at all. For the ball: its acceleration is g = 9.81 m/s² directed downward AT EVERY INSTANT of its flight, including the top, so with up taken as positive, acceleration = −9.81 m/s². Common mistake: assuming the ball’s acceleration must also be zero at the top simply because its velocity is zero there.',
    answer=-G, unit='m/s²', sign_sensitive=True)

v_first_q20 = 5.0 - 0
a_2nd_q20 = (10.0 - 5.0) / 10.0
a_3rd_q20 = (20.0 - 10.0) / 10.0
add('2.1', 'S', 'A maglev train’s velocity doubles every 10 s while accelerating from rest: v = 5.0 m/s at t = 10 s, v = 10 m/s at t = 20 s, v = 20 m/s at t = 30 s. (a) Calculate the average acceleration between t = 10 s and t = 20 s. (b) Calculate the average acceleration between t = 20 s and t = 30 s. (c) Explain what this shows about whether the train’s acceleration is uniform. Give only the numerical answer to (b).',
    f'(a) Between t = 10 s and t = 20 s: average acceleration = (10−5.0) ÷ 10 = {sf(a_2nd_q20)} m/s². (b) Between t = 20 s and t = 30 s: average acceleration = (20−10) ÷ 10 = {sf(a_3rd_q20)} m/s². (c) The acceleration is NOT uniform — it is larger in the second 10 s interval ({sf(a_3rd_q20)} m/s²) than in the first ({sf(a_2nd_q20)} m/s²), which makes sense because a velocity that doubles every fixed time interval grows faster and faster in absolute terms as time goes on. Common mistake: assuming "doubling every 10 s" must describe uniform acceleration, just because the TIME intervals are equal — uniform acceleration needs equal CHANGES in velocity in equal times, not equal ratios.',
    answer=a_3rd_q20, unit='m/s²')


# ════════════════════════════════════════════════════════════════════════
# 2.2 Calculating acceleration
# ════════════════════════════════════════════════════════════════════════
v_f1 = 100 / 3.6
a_f1 = v_f1 / 10
add('2.2', 'F', 'A car accelerates uniformly from rest to 100 km/h in 10 s. Calculate its acceleration, in m/s².',
    f'First convert to m/s: 100 ÷ 3.6 = {sf(v_f1)} m/s. acceleration = Δv ÷ Δt = ({sf(v_f1)} − 0) ÷ 10 = {sf(a_f1)} m/s². Common mistake: substituting 100 (in km/h) directly into the formula without converting to m/s first, which gives an answer with the wrong units entirely.',
    answer=a_f1, unit='m/s²',
    figure=fig('2.2', 'f1', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 10, 'y': v_f1}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a_f2 = (0 - 400) / 0.020
add('2.2', 'F', 'A bullet decelerates from 400 m/s to rest in 0.020 s as it embeds in a block of wood. Calculate the magnitude of its acceleration.',
    f'magnitude = Δv ÷ Δt = (400−0) ÷ 0.020 = {sf(abs(a_f2))} m/s² — an enormous deceleration, typical of a rapid impact. Common mistake: mishandling the division by a very small time, e.g. multiplying by 0.020 instead of dividing by it.',
    answer=abs(a_f2), unit='m/s²',
    figure=fig('2.2', 'f2', 'motion', kind='velocity', points=[{'t': 0, 'y': 400}, {'t': 0.020, 'y': 0}], xLabel='time', yLabel='speed', xUnit='s', yUnit='m/s'))

add('2.2', 'F', 'Rearranging a = Δv ÷ Δt to make Δv the subject gives which equation?',
    'Multiplying both sides of a = Δv ÷ Δt by Δt isolates Δv: Δv = a × Δt. Common mistake: dividing instead of multiplying when rearranging, which would give Δv = a ÷ Δt — the wrong operation entirely.',
    kind='multiple_choice', options=['Δv = aΔt', 'Δv = a ÷ Δt', 'Δv = Δt ÷ a', 'Δv = a + Δt'], correct_idx=0)

v_f4 = 5 + 3 * 4
add('2.2', 'F', 'An object has initial velocity 5.0 m/s and a constant acceleration of 3.0 m/s² for 4.0 s. Calculate its final velocity.',
    f'v = u + at = 5.0 + 3.0 × 4.0 = {sf(v_f4)} m/s. Common mistake: forgetting to add the initial velocity (5.0 m/s), and giving just a × t = 12 m/s as the final velocity.',
    answer=v_f4, unit='m/s',
    figure=fig('2.2', 'f4', 'motion', kind='velocity', points=[{'t': 0, 'y': 5.0}, {'t': 4.0, 'y': v_f4}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

t_f5 = (30 - 0) / 6.0
add('2.2', 'F', 'An object starts from rest and accelerates at 6.0 m/s². Calculate the time taken to reach 30 m/s.',
    f't = Δv ÷ a = (30−0) ÷ 6.0 = {sf(t_f5)} s. Common mistake: multiplying 30 by 6.0 instead of dividing, which confuses the rearrangement of the acceleration formula.',
    answer=t_f5, unit='s',
    figure=fig('2.2', 'f5', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': t_f5, 'y': 30}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

u_f6 = 20 - (-2) * 5
add('2.2', 'F', 'An object has a final velocity of 20 m/s after accelerating at −2.0 m/s² for 5.0 s. Calculate its initial velocity.',
    f'v = u + at, so u = v − at = 20 − ((−2.0) × 5.0) = 20 − (−10) = {sf(u_f6)} m/s. Common mistake: computing 20 − (2.0 × 5.0) = 10 m/s, forgetting that the acceleration itself is negative, so subtracting it actually ADDS 10.',
    answer=u_f6, unit='m/s',
    figure=fig('2.2', 'f6', 'motion', kind='velocity', points=[{'t': 0, 'y': u_f6}, {'t': 5.0, 'y': 20}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

v_q7 = 0 + 0.80 * 15
add('2.2', 'I', 'A cyclist starts from rest and accelerates at 0.80 m/s² for 15 s. Calculate the final velocity.',
    f'v = u + at = 0 + 0.80 × 15 = {sf(v_q7)} m/s. Common mistake: forgetting that "starts from rest" means u = 0, and instead leaving u out of the formula entirely in a way that changes the structure of the calculation.',
    answer=v_q7, unit='m/s',
    figure=fig('2.2', 'q7', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 15, 'y': v_q7}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

add('2.2', 'I', 'Can the acceleration of a real object ever be non-uniform, so that "average acceleration" over an interval differs from its instantaneous value at any one moment within it?',
    'Yes — just as with velocity, acceleration can vary moment to moment (for example, a car’s engine may provide more thrust at some speeds than others). "Average acceleration" calculated from Δv ÷ Δt over an interval is then only the overall mean rate over that whole interval, which can disagree with the acceleration at any single instant within it. Common mistake: assuming every acceleration calculation using Δv ÷ Δt automatically describes a truly constant (uniform) acceleration throughout the interval.',
    kind='multiple_choice',
    options=['Yes, acceleration can be non-uniform, and an "average acceleration" calculation only gives the overall mean rate over the interval',
             'No, acceleration is always uniform in any real situation', 'No, average acceleration and instantaneous acceleration are mathematically identical by definition',
             'Yes, but only for objects moving in a circle'],
    correct_idx=0)

v1_q9 = 0 + 2.0 * 3.0
v2_q9 = v1_q9 + (-1.0) * 4.0
add('2.2', 'I', 'An object starts from rest, accelerates at +2.0 m/s² for 3.0 s, then decelerates at −1.0 m/s² for a further 4.0 s. Calculate its final velocity.',
    f'Phase 1: v₁ = 0 + 2.0×3.0 = {sf(v1_q9)} m/s. Phase 2: v₂ = {sf(v1_q9)} + (−1.0)×4.0 = {sf(v2_q9)} m/s. Common mistake: restarting from u = 0 for the second phase, instead of carrying forward the velocity reached at the end of the first phase as the new initial velocity.',
    answer=v2_q9, unit='m/s',
    figure=fig('2.2', 'q9', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 3.0, 'y': v1_q9}, {'t': 7.0, 'y': v2_q9}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

u_q10 = 100 / 3.6
a_q10 = (0 - u_q10) / 2.5
add('2.2', 'I', 'A car brakes from 100 km/h to rest in 2.5 s. Calculate its acceleration, in m/s².',
    f'Convert first: 100 ÷ 3.6 = {sf(u_q10)} m/s. acceleration = (0 − {sf(u_q10)}) ÷ 2.5 = {sf(a_q10)} m/s². Common mistake: forgetting the unit conversion, which would give a numerically very different (and wrong) result.',
    answer=a_q10, unit='m/s²', sign_sensitive=True,
    figure=fig('2.2', 'q10', 'motion', kind='velocity', points=[{'t': 0, 'y': u_q10}, {'t': 2.5, 'y': 0}], xLabel='time', yLabel='speed', xUnit='s', yUnit='m/s'))

add('2.2', 'I', 'Object A accelerates from 0 to 20 m/s in 4.0 s. Object B accelerates from 0 to 20 m/s in 8.0 s. Which has the greater acceleration?',
    'Both objects undergo the same change in velocity (20 m/s), but object A does it in a shorter time, so a = Δv ÷ Δt gives A a LARGER acceleration (5.0 m/s² vs 2.5 m/s² for B). Common mistake: assuming the one that reaches the higher velocity (here, they are equal) determines the greater acceleration, rather than considering the time taken too.',
    kind='multiple_choice', options=['Object A, because it reaches the same velocity change in less time', 'Object B, because it takes longer', 'They must have equal acceleration', 'Acceleration cannot be compared without knowing the mass'], correct_idx=0)

u_q12 = 15 - 2.5 * 6
add('2.2', 'I', 'An object reaches a final velocity of 15 m/s after accelerating at 2.5 m/s² for 6.0 s. Calculate its initial velocity.',
    f'u = v − at = 15 − (2.5 × 6.0) = 15 − 15 = {sf(u_q12)} m/s — it started from rest. Common mistake: adding at to v instead of subtracting it, which would give u = 30 m/s.',
    answer=u_q12, unit='m/s',
    figure=fig('2.2', 'q12', 'motion', kind='velocity', points=[{'t': 0, 'y': u_q12}, {'t': 6.0, 'y': 15}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

v_q13 = 0 + 1.2 * 2.0
add('2.2', 'I', 'A lift accelerates from rest at 1.2 m/s² for 2.0 s before reaching a constant speed. Calculate the velocity at the end of the accelerating phase.',
    f'v = u + at = 0 + 1.2 × 2.0 = {sf(v_q13)} m/s. Common mistake: using the total trip time instead of just the 2.0 s accelerating phase stated in the question.',
    answer=v_q13, unit='m/s',
    figure=fig('2.2', 'q13', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 2.0, 'y': v_q13}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

v1_q14 = 0 + 20 * 5.0
v2_q14 = v1_q14 + 10 * 10.0
v3_q14 = v2_q14 + 5 * 20.0
add('2.2', 'C', 'A rocket, starting from rest, accelerates at 20 m/s² for 5.0 s (stage 1), then at 10 m/s² for a further 10 s (stage 2), then at 5.0 m/s² for a further 20 s (stage 3). (a) Calculate the velocity at the end of stage 1. (b) Calculate the velocity at the end of stage 2. (c) Calculate the velocity at the end of stage 3. Give only the answer to (c).',
    f'(a) v₁ = 0 + 20×5.0 = {sf(v1_q14)} m/s. (b) v₂ = {sf(v1_q14)} + 10×10 = {sf(v2_q14)} m/s. (c) v₃ = {sf(v2_q14)} + 5.0×20 = {sf(v3_q14)} m/s. Common mistake: using the acceleration of each stage with the TOTAL elapsed time rather than just that stage’s own duration (e.g. using t = 35 s for stage 3 instead of its own 20 s).',
    answer=v3_q14, unit='m/s',
    figure=fig('2.2', 'q14', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 5.0, 'y': v1_q14}, {'t': 15.0, 'y': v2_q14}, {'t': 35.0, 'y': v3_q14}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a1_q15 = (10 - 30) / 4.0
a2_q15 = (0 - 10) / 5.0
add('2.2', 'C', 'A car decelerates from 30 m/s to 10 m/s in 4.0 s (phase 1), then continues decelerating from 10 m/s to rest in a further 5.0 s (phase 2). (a) Calculate the acceleration during phase 1. (b) Calculate the acceleration during phase 2. (c) State which phase has the greater MAGNITUDE of deceleration. Give only the magnitude for that phase.',
    f'(a) a₁ = (10−30) ÷ 4.0 = {sf(a1_q15)} m/s². (b) a₂ = (0−10) ÷ 5.0 = {sf(a2_q15)} m/s². (c) |a₁| = {sf(abs(a1_q15))} m/s² is greater than |a₂| = {sf(abs(a2_q15))} m/s², so phase 1 brakes more sharply. Common mistake: assuming the phase with the bigger velocity CHANGE (here, both are 20 m/s and 10 m/s respectively, so phase 1 has the bigger change) must automatically have the bigger acceleration — the TIME taken matters too.',
    answer=abs(a1_q15), unit='m/s²',
    figure=fig('2.2', 'q15', 'motion', kind='velocity', points=[{'t': 0, 'y': 30}, {'t': 4.0, 'y': 10}, {'t': 9.0, 'y': 0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a_q16 = (130 - 45) / (6.0 - 2.2)
add('2.2', 'C', 'A dragster’s velocity is recorded as: t = 0 s, v = 0; t = 2.2 s, v = 45 m/s; t = 4.1 s, v = 89 m/s; t = 6.0 s, v = 130 m/s. Calculate the average acceleration between t = 2.2 s and t = 6.0 s.',
    f'acceleration = (130−45) ÷ (6.0−2.2) = 85 ÷ 3.8 = {sf(a_q16)} m/s². Common mistake: using the reading at t = 0 s, which is outside the interval the question actually asks about.',
    answer=a_q16, unit='m/s²',
    figure=fig('2.2', 'q16', 'table', headers=['t / s', '0', '2.2', '4.1', '6.0'], rows=[['v / m/s', '0', '45', '89', '130']]))

dv_q17 = 18.0 - 12.0
a_q17 = dv_q17 / 2.0
uncdv_q17 = (0.3 + 0.3) / dv_q17 * 100
unct_q17 = 0.05 / 2.0 * 100
unca_q17 = uncdv_q17 + unct_q17
add('2.2', 'C', 'A velocity increases from 12.0 ± 0.3 m/s to 18.0 ± 0.3 m/s over a time of 2.0 ± 0.05 s. (a) Calculate the acceleration. (b) Calculate the percentage uncertainty in this acceleration, given that the percentage uncertainties in Δv and in t simply add together. Give only the answer to (b).',
    f'(a) acceleration = (18.0−12.0) ÷ 2.0 = {sf(a_q17)} m/s². (b) Percentage uncertainty in Δv: the two reading uncertainties add, giving 0.3+0.3 = 0.6 m/s out of {sf(dv_q17)} m/s, i.e. {sf(uncdv_q17)}%. Percentage uncertainty in t: 0.05 ÷ 2.0 × 100% = {sf(unct_q17)}%. Since a = Δv ÷ t is a DIVISION, the percentage uncertainties add: {sf(uncdv_q17)}% + {sf(unct_q17)}% = {sf(unca_q17)}%. Common mistake: forgetting to include the time’s own percentage uncertainty, and reporting only the uncertainty from Δv.',
    answer=unca_q17, unit='%')

a1_q18 = (25 - 5) / 8.0
a2_q18 = (25 - 5) / 4.0
add('2.2', 'C', "A roller coaster's speed increases from 5.0 m/s to 25 m/s while climbing a hill in 8.0 s. (a) Calculate the acceleration. (b) If the same speed change instead took only 4.0 s, state whether the acceleration would be larger or smaller, and by what factor. (c) Calculate that alternative acceleration. Give only the answer to (c).",
    f'(a) acceleration = (25−5.0) ÷ 8.0 = {sf(a1_q18)} m/s². (b) Halving the time for the SAME change in velocity doubles the acceleration (acceleration is inversely proportional to time, for a fixed Δv). (c) acceleration = (25−5.0) ÷ 4.0 = {sf(a2_q18)} m/s², exactly double the value from (a), confirming the factor predicted in (b). Common mistake: assuming halving the time must also halve the acceleration, rather than recognising the inverse relationship (halving the time DOUBLES the acceleration, for the same Δv).',
    answer=a2_q18, unit='m/s²',
    figure=fig('2.2', 'q18', 'motion', kind='velocity', points=[{'t': 0, 'y': 5.0}, {'t': 4.0, 'y': 25}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

t1_q19 = 12.0 / 3.5
t_total_q19 = 19.0 / 3.5
extra_q19 = t_total_q19 - t1_q19
add('2.2', 'S', 'Taking the car’s initial direction as positive, a car travelling at 12 m/s decelerates uniformly at 3.5 m/s². (a) Calculate the time taken for it to come to rest. (b) If the SAME constant acceleration continued to act after the car stops (for example, rolling backwards down a slope), calculate how much additional time it would take to reach a velocity of −7.0 m/s. Give only the answer to (b).',
    f'(a) Time to stop: 0 = 12 − 3.5t₁, so t₁ = 12 ÷ 3.5 = {sf(t1_q19)} s. (b) Time to reach −7.0 m/s from the start: −7.0 = 12 − 3.5t, so t = (12−(−7.0)) ÷ 3.5 = 19 ÷ 3.5 = {sf(t_total_q19)} s in total. The ADDITIONAL time beyond stopping is {sf(t_total_q19)} − {sf(t1_q19)} = {sf(extra_q19)} s — a clean, exact 2.0 s. Common mistake: computing the time to reach −7.0 m/s directly from the moment the car stops using only 7.0 ÷ 3.5, without checking this matches the difference between the two total-time calculations (it does here, since the acceleration is constant throughout).',
    answer=extra_q19, unit='s')

k_q20 = 6.0 / 2.0
avg_q20 = (6.0 + 15.0) / 2
add('2.2', 'S', 'A particle’s acceleration itself increases uniformly with time, following a = kt for some constant k (so the acceleration is not constant). At t = 2.0 s the acceleration is 6.0 m/s², and at t = 5.0 s it is 15 m/s². (a) Find k. (b) Since a(t) is itself a straight line in t, its average value over an interval equals the mean of its endpoint values. Estimate the average acceleration between t = 2.0 s and t = 5.0 s. Give only the answer to (b).',
    f'(a) k = a ÷ t = 6.0 ÷ 2.0 = {sf(k_q20)} m/s³ (check: at t = 5.0 s, a = {sf(k_q20)} × 5.0 = 15 m/s² ✔). (b) Since a(t) = kt is a straight line in t, its mean value over the interval is just the average of its two endpoint values: ({sf(6.0)} + {sf(15.0)}) ÷ 2 = {sf(avg_q20)} m/s². Common mistake: assuming "average acceleration" always means Δv ÷ Δt calculated from VELOCITY readings — here it is being estimated directly from the (linear) ACCELERATION function itself, a different route to a similar idea.',
    answer=avg_q20, unit='m/s²')


# ════════════════════════════════════════════════════════════════════════
# 2.3 Units of acceleration
# ════════════════════════════════════════════════════════════════════════
add('2.3', 'F', 'What is the SI base unit of acceleration?',
    'Acceleration = velocity ÷ time = (distance ÷ time) ÷ time = distance ÷ time², so its SI base unit is metres per second squared, written m s⁻². Common mistake: writing "m/s" (the unit of velocity) instead of "m/s²" for acceleration.',
    kind='multiple_choice', options=['m s⁻² (metres per second squared)', 'm s⁻¹ (metres per second)', 'kg m s⁻² (newtons)', 's⁻¹ (per second)'], correct_idx=0)

kmh_q2 = 5.0 * 3.6
add('2.3', 'F', 'An acceleration of 5.0 m/s² can also be written as "5.0 metres per second, per second". Express this acceleration in km/h per second.',
    f'Since 1 m/s = 3.6 km/h, the same conversion factor applies directly to an acceleration expressed this way: 5.0 × 3.6 = {sf(kmh_q2)} km/h per second — meaning the velocity increases by {sf(kmh_q2)} km/h with every second that passes. Common mistake: trying to convert the "per second" part of the unit as well, when only the velocity part (m/s → km/h) needs converting here.',
    answer=kmh_q2, unit='km/h/s')

g_q3 = 20 / G
add('2.3', 'F', "A car's acceleration is 20 m/s². Express this as a multiple of g (take g = 9.81 m/s²).",
    f'Number of g = acceleration ÷ g = 20 ÷ 9.81 = {sf(g_q3)}. Common mistake: multiplying by 9.81 instead of dividing, which would give a much larger (and wrong) number.',
    answer=g_q3, unit=None)

add('2.3', 'F', 'What does the compound unit "m s⁻²" actually mean, physically?',
    'It means the velocity changes by that many metres per second, for every second that passes — "metres per second, per second". Common mistake: reading m s⁻² as simply "metres, very fast" without appreciating that it is a RATE of a rate: how quickly the velocity itself is changing.',
    kind='multiple_choice',
    options=['The velocity changes by that many m/s, for every second that passes', 'The object travels that many metres every second', 'The object’s distance doubles every second', 'The object’s mass changes by that amount every second'],
    correct_idx=0)

ms2_q5 = 0.5 * G
add('2.3', 'F', 'Express an acceleration of 0.50g in m/s² (take g = 9.81 m/s²).',
    f'acceleration = 0.50 × 9.81 = {sf(ms2_q5)} m/s². Common mistake: dividing by 9.81 instead of multiplying, which is the reverse conversion.',
    answer=ms2_q5, unit='m/s²')

ms2_q6 = 7200 * (1000 / 3600**2)
add('2.3', 'F', 'Convert an acceleration of 7200 km/h² into m/s².',
    f'Convert km to m (×1000) and h² to s² (÷3600², since h² means the time unit is squared too): 7200 × 1000 ÷ 3600² = {sf(ms2_q6)} m/s². Common mistake: dividing by 3600 only once, forgetting that BOTH factors of time in "per hour squared" need converting to seconds.',
    answer=ms2_q6, unit='m/s²')

a_q7 = 6 * G
add('2.3', 'I', 'A fighter pilot experiences an acceleration of 6.0g during a tight turn. Calculate this acceleration in m/s².',
    f'acceleration = 6.0 × 9.81 = {sf(a_q7)} m/s². Common mistake: using g = 10 m/s² for this kind of precise aerospace figure, which loses accuracy that the question (quoting g to 3 significant figures) expects to be kept.',
    answer=a_q7, unit='m/s²')

add('2.3', 'I', 'Why is the unit of acceleration "per second SQUARED" rather than just "per second"?',
    'Velocity already has units of "distance per second" (m/s). Acceleration is the RATE OF CHANGE of velocity, so it is (m/s) per second — dividing by time a second time, which is where the second power of seconds (s⁻²) comes from. Common mistake: thinking "per second squared" means something is being squared physically, rather than recognising it as a consequence of dividing by time twice in a row.',
    kind='multiple_choice',
    options=['Because acceleration is a rate of change of velocity, which is itself already a rate (so time is divided by twice)',
             'Because distance is measured in square metres', 'It is simply a historical convention with no underlying reason', 'Because acceleration always involves circular motion'],
    correct_idx=0)

cm_q9 = 2.5 * 100
add('2.3', 'I', 'Convert an acceleration of 2.5 m/s² into cm/s².',
    f'1 m = 100 cm, so 2.5 × 100 = {sf(cm_q9)} cm/s² — only the DISTANCE part of the unit changes; the "per second squared" time part is unaffected. Common mistake: also multiplying the time part by 100, which does not need converting here.',
    answer=cm_q9, unit='cm/s²')

a_q10 = 3.5 * G
add('2.3', 'I', 'A roller coaster car briefly experiences a vertical acceleration of 3.5g. Calculate this in m/s².',
    f'acceleration = 3.5 × 9.81 = {sf(a_q10)} m/s². Common mistake: rounding g to 10 m/s² and losing precision the question’s 3-significant-figure multiplier (3.5g) expects to be kept.',
    answer=a_q10, unit='m/s²')

add('2.3', 'I', 'Starting from a = Δv/Δt, with velocity v = Δs/Δt (distance over time), which combination of SI base units correctly gives the unit of acceleration?',
    'Substituting: a = (Δs/Δt)/Δt = Δs/Δt², so in SI base units this is metres divided by seconds squared, i.e. m s⁻². Common mistake: substituting velocity’s unit (m/s) directly for v without then dividing by time AGAIN for the outer a = Δv/Δt step, which would leave the units at m/s rather than m/s².',
    kind='multiple_choice', options=['m s⁻²', 'm s⁻¹', 'm² s⁻¹', 's⁻²'], correct_idx=0)

ms2_q12 = 15000 / 1000
add('2.3', 'I', 'Convert an acceleration of 15 000 mm/s² into m/s².',
    f'1 m = 1000 mm, so 15 000 ÷ 1000 = {sf(ms2_q12)} m/s². Common mistake: dividing by 100 (confusing mm with cm) instead of by 1000.',
    answer=ms2_q12, unit='m/s²')

a_q13 = 45 / 3.6
add('2.3', 'I', 'A rocket sled’s acceleration is quoted as "gaining 45 km/h of speed every second". Convert this rate into m/s².',
    f'First convert the velocity part: 45 ÷ 3.6 = {sf(a_q13)} m/s, gained every second, so the acceleration is {sf(a_q13)} m/s². Common mistake: leaving the answer as "45 km/h per second" without converting it into the SI unit (m/s²) the question specifically asks for.',
    answer=a_q13, unit='m/s²')

a_q14 = 9 * G
t_q14 = 300 / a_q14
add('2.3', 'C', 'A fighter jet pilot can safely tolerate up to 9.0g before blacking out. (a) Convert 9.0g to m/s². (b) If the jet accelerated from rest at this maximum rate, calculate the time to reach 300 m/s. (c) Briefly comment on whether sustaining 9.0g for a full minute would be realistic. Give only the numerical answer to (b).',
    f'(a) acceleration = 9.0 × 9.81 = {sf(a_q14)} m/s². (b) t = Δv ÷ a = (300−0) ÷ {sf(a_q14)} = {sf(t_q14)} s. (c) In reality, 9.0g can only be tolerated briefly (a few seconds) even by trained, g-suited pilots before blacking out — sustaining it for a full minute is not physiologically realistic. Common mistake: using g = 9.81 m/s² itself as the acceleration in part (b), forgetting that the jet’s actual acceleration is 9 TIMES bigger than g.',
    answer=t_q14, unit='s',
    figure=fig('2.3', 'q14', 'vector', vectors=[{'magnitude': a_q14, 'angleDeg': 0, 'label': f'{sf(a_q14)} m/s² (9.0g)'}], mode='fromOrigin'))

a2_q15 = 2.60 * G
pctdiff_q15 = (26.0 - a2_q15) / a2_q15 * 100
add('2.3', 'C', "A dragster's acceleration is reported by two sources: 26.0 m/s² and 2.60g. (a) Convert 2.60g to m/s². (b) Calculate the percentage difference between the two reported values, relative to the 2.60g figure. Give only the answer to (b).",
    f'(a) 2.60 × 9.81 = {sf(a2_q15)} m/s². (b) Percentage difference = (26.0 − {sf(a2_q15)}) ÷ {sf(a2_q15)} × 100% = {sf(pctdiff_q15)}%. Common mistake: dividing by 26.0 instead of by the 2.60g figure the question specifies as the reference value, which would give a slightly different percentage.',
    answer=pctdiff_q15, unit='%')

a_rowA_q16 = 3.5 * G
add('2.3', 'C', 'The table lists the same kind of acceleration in three different units: Row A, 3.5g; Row B, 40 m/s²; Row C, 3600 km/h². Calculate the value of Row A in m/s², so it can be fairly compared with the others.',
    f'Row A: 3.5 × 9.81 = {sf(a_rowA_q16)} m/s². (For comparison: Row B is already 40 m/s², the largest of the three, and Row C converts to only 3600 × 1000 ÷ 3600² = 0.278 m/s², by far the smallest — all three "accelerations" look like comparable-sized numbers before conversion, but are wildly different once expressed in the same unit.) Common mistake: comparing the raw numbers in the table (3.5, 40, 3600) directly, without first converting them all into the same unit.',
    answer=a_rowA_q16, unit='m/s²',
    figure=fig('2.3', 'q16', 'table', headers=['Row', 'Value', 'Unit'], rows=[['A', '3.5', 'g'], ['B', '40', 'm/s²'], ['C', '3600', 'km/h²']]))

conv_q17 = 1000 / 3600
add('2.3', 'C', 'Starting from a = Δv/Δt with v = Δs/Δt, show that the SI base unit of acceleration is m s⁻². Then state how many m s⁻² there are in exactly 1 km h⁻¹ s⁻¹ (a velocity of 1 km/h, gained every second).',
    f'Substituting v = Δs/Δt into a = Δv/Δt gives a = Δs/Δt², so in SI base units acceleration is metres divided by seconds squared: m s⁻². For the conversion: 1 km/h = 1000 ÷ 3600 = {sf(conv_q17)} m/s, so 1 km h⁻¹ s⁻¹ = {sf(conv_q17)} m/s² (exactly 5/18). Common mistake: converting only the "km" to "m" and forgetting that "per hour" also needs converting to "per second" for the velocity part of this compound rate.',
    answer=conv_q17, unit='m/s²')

v_q18 = 300 / 3.6
a_q18 = v_q18 / 2.9
g_q18 = a_q18 / G
add('2.3', 'C', 'A Formula 1 car brakes from 300 km/h to rest in 2.9 s, reportedly sustaining close to 4.0g. (a) Convert 300 km/h to m/s. (b) Calculate the actual average deceleration achieved, in m/s². (c) Express this in units of g. Give only the answer to (c).',
    f'(a) 300 ÷ 3.6 = {sf(v_q18)} m/s. (b) deceleration = {sf(v_q18)} ÷ 2.9 = {sf(a_q18)} m/s². (c) In units of g: {sf(a_q18)} ÷ 9.81 = {sf(g_q18)}g — noticeably less than the quoted 4.0g, showing the "4.0g" figure likely refers to a brief peak during the stop rather than the AVERAGE deceleration over the whole 2.9 s. Common mistake: quoting the raw m/s² value from (b) as if it were already "in g" — the units g and m/s² are related by a factor of 9.81, not interchangeable.',
    answer=g_q18, unit=None)

a_q19 = 8 * G
t_q19 = 343 / a_q19
add('2.3', 'S', 'During a Soyuz capsule re-entry, astronauts can briefly experience up to 8.0g. (a) Express 8.0g in m/s². (b) Calculate how long it would theoretically take, accelerating from rest at this constant rate, to reach the speed of sound (343 m/s) — though in reality this acceleration does not act anywhere near that long. Give only the answer to (b).',
    f'(a) acceleration = 8.0 × 9.81 = {sf(a_q19)} m/s². (b) t = Δv ÷ a = (343−0) ÷ {sf(a_q19)} = {sf(t_q19)} s. Common mistake: treating this calculated time as something that actually happens during re-entry — real re-entry decelerations last only a few seconds at their peak value, so this is a purely hypothetical "what if it lasted this long" calculation, used only to build a feel for the size of the acceleration.',
    answer=t_q19, unit='s')

a_q20 = 2.5e6 * G
add('2.3', 'S', 'An engineer specifies the acceleration in a microchip shock test as "2.5 million g" (an extremely brief, violent mechanical shock). (a) Convert this to m/s². (b) Express your answer to 3 significant figures in standard form.',
    f'(a)/(b) acceleration = 2.5 × 10⁶ × 9.81 = {sf(a_q20)} m/s². This is roughly two and a half million times the acceleration due to gravity — realistic for the violent, sub-millisecond impulse of a drop-shock test, even though it could never be sustained for any meaningful length of time. Common mistake: losing track of the powers of ten when multiplying 2.5 × 10⁶ by 9.81, and reporting an answer several orders of magnitude too large or too small.',
    answer=a_q20, unit='m/s²')


# ════════════════════════════════════════════════════════════════════════
# 2.4 Deducing acceleration
# ════════════════════════════════════════════════════════════════════════
add('2.4', 'F', 'On a velocity-time graph, what does the gradient represent?',
    'Gradient = (change in velocity) ÷ (change in time), which is exactly the definition of acceleration. Common mistake: confusing this with a displacement-time graph’s gradient, which gives velocity, not acceleration.',
    kind='multiple_choice', options=['acceleration', 'velocity', 'distance travelled', 'displacement'], correct_idx=0)

a_q2 = 20 / 5
add('2.4', 'F', 'A velocity-time graph is a straight line from the origin to (5.0 s, 20 m/s). Calculate the acceleration it represents.',
    f'acceleration = gradient = (20−0) ÷ (5.0−0) = {sf(a_q2)} m/s². Common mistake: dividing time by velocity instead of velocity by time.',
    answer=a_q2, unit='m/s²', figure=fig('2.4', 'q2', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 5.0, 'y': 20}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

add('2.4', 'F', 'A velocity-time graph is a horizontal straight line. State the acceleration it represents.',
    'A horizontal line has zero gradient, so the acceleration is 0 m/s² — the velocity is constant. Common mistake: confusing a horizontal line on a VELOCITY-time graph (constant velocity, zero acceleration) with a horizontal line on a DISPLACEMENT-time graph (object at rest).',
    answer=0, unit='m/s²', figure=fig('2.4', 'q3', 'motion', kind='velocity', points=[{'t': 0, 'y': 12}, {'t': 10, 'y': 12}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

add('2.4', 'F', 'Two velocity-time graphs are both straight lines from the origin. Line P is steeper than line Q. Which represents the LARGER acceleration?',
    'A steeper line on a velocity-time graph has a bigger gradient, and gradient = acceleration, so line P represents the larger acceleration. Common mistake: confusing this with the displacement-time case, where steepness instead compares velocities, not accelerations.',
    kind='multiple_choice', options=['Line P', 'Line Q', 'They must be equal', 'Cannot be determined from gradient alone'], correct_idx=0)

a_q5 = (0 - 15) / 3.0
add('2.4', 'F', 'A velocity-time graph is a straight line from (0 s, 15 m/s) to (3.0 s, 0 m/s). Calculate the acceleration.',
    f'acceleration = (0−15) ÷ (3.0−0) = {sf(a_q5)} m/s² — negative, since the object is decelerating. Common mistake: reporting the magnitude only (5.0 m/s²) without the negative sign that shows this is a deceleration.',
    answer=a_q5, unit='m/s²', sign_sensitive=True,
    figure=fig('2.4', 'q5', 'motion', kind='velocity', points=[{'t': 0, 'y': 15}, {'t': 3.0, 'y': 0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a_q6 = (25 - 5) / 10.0
add('2.4', 'F', 'A velocity-time graph is a straight line from (0 s, 5.0 m/s) to (10 s, 25 m/s). Calculate the acceleration.',
    f'acceleration = (25−5.0) ÷ (10−0) = {sf(a_q6)} m/s². Common mistake: forgetting the non-zero starting velocity (5.0 m/s) is irrelevant to the GRADIENT calculation — only the CHANGE in velocity over the change in time matters for acceleration.',
    answer=a_q6, unit='m/s²', figure=fig('2.4', 'q6', 'motion', kind='velocity', points=[{'t': 0, 'y': 5.0}, {'t': 10, 'y': 25}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a_q7 = (2 - 8) / (12 - 9)
add('2.4', 'I', 'A velocity-time graph has three straight sections: (0 s, 0 m/s) to (4 s, 8 m/s); then flat to (9 s, 8 m/s); then falling to (12 s, 2 m/s). Calculate the acceleration during the final section.',
    f'During the final section: gradient = (2−8) ÷ (12−9) = {sf(a_q7)} m/s². Common mistake: using the overall start and end points of the WHOLE graph instead of just the final section’s own two endpoints.',
    answer=a_q7, unit='m/s²', sign_sensitive=True,
    figure=fig('2.4', 'q7', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 4, 'y': 8}, {'t': 9, 'y': 8}, {'t': 12, 'y': 2}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

add('2.4', 'I', 'A velocity-time graph is a curve that becomes steeper and steeper as time increases. What does this indicate?',
    'A continuously increasing gradient on a velocity-time graph means the acceleration itself is continuously increasing — the object’s velocity is changing faster and faster as time goes on (this is NON-uniform acceleration). Common mistake: describing this as "constant acceleration" simply because the curve looks smooth and regular.',
    kind='multiple_choice', options=['The acceleration is increasing', 'The acceleration is constant', 'The velocity is constant', 'The object is decelerating'], correct_idx=0)

a_q9 = (40 - 10) / 6.0
add('2.4', 'I', 'A velocity-time graph is a straight line from (0 s, 10 m/s) to (6.0 s, 40 m/s). Calculate the acceleration.',
    f'acceleration = (40−10) ÷ (6.0−0) = {sf(a_q9)} m/s². Common mistake: using the final velocity alone (40 m/s) divided by the time, instead of the CHANGE in velocity.',
    answer=a_q9, unit='m/s²', figure=fig('2.4', 'q9', 'motion', kind='velocity', points=[{'t': 0, 'y': 10}, {'t': 6.0, 'y': 40}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a_q10 = (0 - 30) / 5.0
add('2.4', 'I', 'A velocity-time graph is a straight line from (0 s, 30 m/s) to (5.0 s, 0 m/s). Calculate the acceleration.',
    f'acceleration = (0−30) ÷ (5.0−0) = {sf(a_q10)} m/s². Common mistake: giving +6.0 m/s², dropping the negative sign that correctly shows this is a deceleration.',
    answer=a_q10, unit='m/s²', sign_sensitive=True,
    figure=fig('2.4', 'q10', 'motion', kind='velocity', points=[{'t': 0, 'y': 30}, {'t': 5.0, 'y': 0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

add('2.4', 'I', 'Can the acceleration of an object be deduced directly from the GRADIENT of a displacement-time graph?',
    'No, not directly — the gradient of a displacement-time graph gives VELOCITY, not acceleration. To find acceleration, you would need to see how that gradient itself CHANGES along the curve (or better, convert the data into a velocity-time graph first and find ITS gradient). Common mistake: trying to read acceleration straight off a displacement-time graph’s steepness, when steepness there only ever represents velocity.',
    kind='multiple_choice',
    options=['No — the gradient of a displacement-time graph gives velocity; a velocity-time graph’s gradient is needed for acceleration',
             'Yes — the gradient of any graph of motion always gives acceleration', 'Yes — but only if the displacement-time graph is a straight line',
             'No — acceleration can never be found from any graph'],
    correct_idx=0)

v58_q12 = 0.5 * 5.8**2
v62_q12 = 0.5 * 6.2**2
a_q12 = (v62_q12 - v58_q12) / (6.2 - 5.8)
add('2.4', 'I', 'A velocity-time graph curves smoothly (non-uniform acceleration). Close readings near t = 6.0 s give v = 16.82 m/s at t = 5.8 s and v = 19.22 m/s at t = 6.2 s. Estimate the instantaneous acceleration at t = 6.0 s.',
    f'Using the gradient of the short line joining these two close points as an estimate of the tangent (instantaneous) gradient at t = 6.0 s: a ≈ ({sf(v62_q12)} − {sf(v58_q12)}) ÷ (6.2−5.8) = {sf(v62_q12 - v58_q12)} ÷ 0.40 = {sf(a_q12)} m/s². Common mistake: using readings that are too far apart in time, which would estimate an AVERAGE acceleration over a wider interval rather than the instantaneous value at exactly t = 6.0 s.',
    answer=a_q12, unit='m/s²',
    figure=fig('2.4', 'q12', 'motion', kind='velocity', points=[{'t': 5.8, 'y': v58_q12}, {'t': 6.2, 'y': v62_q12}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a_q13 = (16 - 4) / (3 - 1)
add('2.4', 'I', 'A train’s velocity-time data is: t = 0 s, v = 0; t = 1 s, v = 4 m/s; t = 2 s, v = 9 m/s; t = 3 s, v = 16 m/s; t = 4 s, v = 25 m/s. Calculate the average acceleration between t = 1 s and t = 3 s.',
    f'average acceleration = (16−4) ÷ (3−1) = {sf(a_q13)} m/s². (This data follows v = t², so the acceleration is NOT uniform — it increases steadily with time, which is why different pairs of points in this table give different average accelerations.) Common mistake: assuming any table of increasing velocities must represent uniform acceleration, without checking whether equal time intervals really do give equal changes in velocity.',
    answer=a_q13, unit='m/s²',
    figure=fig('2.4', 'q13', 'table', headers=['t / s', '0', '1', '2', '3', '4'], rows=[['v / m/s', '0', '4', '9', '16', '25']]))

a1_q14 = (20 - 0) / 5.0
a2_q14 = (0 - 20) / 5.0
add('2.4', 'C', 'A velocity-time graph has three straight sections: (0 s, 0 m/s) to (5 s, 20 m/s); then flat to (15 s, 20 m/s); then falling to (20 s, 0 m/s). (a) Calculate the acceleration during the rising section. (b) Calculate the acceleration during the falling section. (c) Explain the physical significance of the zero acceleration during the middle section. Give only the answer to (a).',
    f'(a) a = (20−0) ÷ (5−0) = {sf(a1_q14)} m/s². (b) a = (0−20) ÷ (20−15) = {sf(a2_q14)} m/s². (c) Zero acceleration during the middle section means the velocity is not changing at all — the object is moving at a steady, constant 20 m/s throughout that part of the journey. Common mistake: assuming the middle, flat section of a velocity-time graph must mean the object is at REST, confusing it with the equivalent feature on a displacement-time graph.',
    answer=a1_q14, unit='m/s²',
    figure=fig('2.4', 'q14', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 5, 'y': 20}, {'t': 15, 'y': 20}, {'t': 20, 'y': 0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

v2_q15 = 0.5 * 2.0**2
v58_q15b = 0.5 * 5.8**2
v62_q15b = 0.5 * 6.2**2
a2_q15 = (v62_q15b - v58_q15b) / 0.40
v18_q15 = 0.5 * 1.8**2
v22_q15 = 0.5 * 2.2**2
a_t2_q15 = (v22_q15 - v18_q15) / 0.40
add('2.4', 'C', 'A velocity-time graph curves smoothly, with the velocity increasing faster and faster. Close readings give the acceleration near t = 2.0 s as approximately {:.1f} m/s² (from readings at t = 1.8 s and t = 2.2 s), and near t = 6.0 s as approximately {:.1f} m/s² (from readings at t = 5.8 s and t = 6.2 s). (a) State what this comparison shows about whether the acceleration is uniform. (b) If this pattern is consistent with acceleration increasing steadily with time (a = kt), estimate k. Give only the numerical answer to (b).'.format(a_t2_q15, a2_q15),
    f'(a) The acceleration near t = 2.0 s ({sf(a_t2_q15)} m/s²) is clearly smaller than near t = 6.0 s ({sf(a2_q15)} m/s²), so the acceleration is NOT uniform — it is increasing with time. (b) If a = kt, then k = a ÷ t: near t = 2.0 s, k ≈ {sf(a_t2_q15)} ÷ 2.0 = {sf(a_t2_q15 / 2.0)}; near t = 6.0 s, k ≈ {sf(a2_q15)} ÷ 6.0 = {sf(a2_q15 / 6.0)} — both close to the same value, consistent with k ≈ {sf((a_t2_q15 / 2.0 + a2_q15 / 6.0) / 2)} m/s³. Common mistake: assuming a smoothly curving velocity-time graph must represent SOME simple constant acceleration, rather than recognising the curve itself is the signature of a continuously changing (non-uniform) acceleration.',
    answer=(a_t2_q15 / 2.0 + a2_q15 / 6.0) / 2, unit='m/s³', tolerance=0.15)

a_q16 = (16.82 - 0.5 * 1.8**2) / 1.0
add('2.4', 'C', 'Readings from a curved velocity-time graph give v = 1.62 m/s at t = 1.8 s and v = 16.82 m/s at t = 5.8 s. Calculate the average acceleration between these two readings.',
    f'average acceleration = (16.82 − 1.62) ÷ (5.8 − 1.8) = 15.2 ÷ 4.0 = {sf(15.2 / 4.0)} m/s². Common mistake: treating this AVERAGE over a 4.0 s interval as if it were the instantaneous acceleration at either one of the two individual times — on a curved graph the two can be quite different.',
    answer=15.2 / 4.0, unit='m/s²')

a_q17 = (22 - 2.0) / 10
add('2.4', 'C', "A student claims that for a displacement-time graph, 'the gradient at t = 4.0 s directly gives the acceleration at that time.' Explain why this is incorrect, and state what the gradient of a displacement-time graph actually represents. The SAME motion, re-plotted as a velocity-time graph, is a straight line from (0 s, 2.0 m/s) to (10 s, 22 m/s). Calculate the actual acceleration.",
    f'The gradient of a displacement-time graph always gives VELOCITY, not acceleration — to find acceleration, you need the gradient of a velocity-time graph instead. Using the velocity-time version of this motion: acceleration = (22−2.0) ÷ (10−0) = {sf(a_q17)} m/s². Common mistake: trying to estimate acceleration by looking at how "curved" a displacement-time graph appears, rather than converting to a velocity-time graph (or examining how the GRADIENT of the displacement-time graph itself changes) first.',
    answer=a_q17, unit='m/s²',
    figure=fig('2.4', 'q17', 'motion', kind='velocity', points=[{'t': 0, 'y': 2.0}, {'t': 10, 'y': 22}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a_q18 = (-4 - 12) / 8.0
t0_q18 = 12 / 2.0
add('2.4', 'C', 'A velocity-time graph is a single straight line from (0 s, +12 m/s) to (8.0 s, −4.0 m/s) (an object slowing, stopping, then speeding up in reverse under one constant deceleration). (a) Calculate the acceleration. (b) Calculate the time at which the velocity is zero. (c) State the object’s direction of motion just after that time. Give only the answer to (a).',
    f'(a) acceleration = (−4.0−12) ÷ (8.0−0) = {sf(a_q18)} m/s² — constant throughout, since the graph is one single straight line. (b) Setting v = 0: 0 = 12 + ({sf(a_q18)})t, so t = 12 ÷ {sf(abs(a_q18))} = {sf(t0_q18)} s. (c) Just after this, v becomes negative, so the object moves in the reverse direction. Common mistake: assuming the acceleration must change sign or value at the instant the object is momentarily at rest (t = {sf(t0_q18)} s) — since the graph is one unbroken straight line, the SAME constant acceleration acts the whole time, through that instant and beyond.',
    answer=a_q18, unit='m/s²', sign_sensitive=True,
    figure=fig('2.4', 'q18', 'motion', kind='velocity', points=[{'t': 0, 'y': 12}, {'t': 8.0, 'y': -4}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', hRefLines=[0]))

v3_q19 = 0 + 2.0 * 3.0
v5_q19 = v3_q19 + 6.0 * 2.0
avg_q19 = (v5_q19 - 0) / 5.0
simple_q19 = (2.0 + 6.0) / 2
add('2.4', 'S', 'A velocity-time graph has two straight segments meeting at t = 3.0 s: acceleration a₁ = 2.0 m/s² from rest for the first 3.0 s, then a₂ = 6.0 m/s² for a further 2.0 s. Show that the OVERALL average acceleration from t = 0 to t = 5.0 s is NOT simply the mean of a₁ and a₂, and calculate its actual value.',
    f'Velocity at t = 3.0 s: v = 0 + 2.0×3.0 = {sf(v3_q19)} m/s. Velocity at t = 5.0 s: v = {sf(v3_q19)} + 6.0×2.0 = {sf(v5_q19)} m/s. Overall average acceleration = ({sf(v5_q19)}−0) ÷ 5.0 = {sf(avg_q19)} m/s². This is NOT equal to the simple mean of the two accelerations, (2.0+6.0)/2 = {sf(simple_q19)} m/s² — the two values only agree when the two segments last EQUAL amounts of time (here, 3.0 s and 2.0 s are different). Common mistake: averaging a₁ and a₂ directly whenever two different accelerations are involved, without checking whether the two phases actually last the same length of time.',
    answer=avg_q19, unit='m/s²')

a_q20 = (0 - 15) / 0.12
add('2.4', 'S', 'A crash-test dummy’s velocity drops from 15 m/s to 0 in just 0.12 s during a collision — brief enough to be treated as a single straight line on a velocity-time graph. Calculate the deceleration experienced, and express your answer in m/s².',
    f'Since the collision is so brief, the velocity-time graph is effectively one straight line, so: acceleration = (0−15) ÷ 0.12 = {sf(a_q20)} m/s² (equivalent to about {sf(abs(a_q20) / G)}g) — an enormous deceleration typical of a real collision, which is exactly why cars have crumple zones and airbags: extending the collision TIME even slightly dramatically reduces this value. Common mistake: mishandling the very small time interval (0.12 s) in the division, giving an answer that is far too small rather than appropriately huge.',
    answer=abs(a_q20), unit='m/s²')


# ════════════════════════════════════════════════════════════════════════
# 2.5 Deducing displacement
# ════════════════════════════════════════════════════════════════════════
add('2.5', 'F', 'What does the AREA under a velocity-time graph represent?',
    'Area = velocity × time (for a simple rectangle), which has the units of displacement, and indeed represents exactly that: the displacement during that time interval. Common mistake: confusing this with the GRADIENT of a velocity-time graph, which instead gives acceleration.',
    kind='multiple_choice', options=['displacement', 'acceleration', 'average velocity only', 'nothing physically meaningful'], correct_idx=0)

d_q2 = 10 * 5
add('2.5', 'F', 'A velocity-time graph shows a constant velocity of 10 m/s for 5.0 s. Calculate the displacement.',
    f'The area under the graph is a rectangle: displacement = velocity × time = 10 × 5.0 = {sf(d_q2)} m. Common mistake: trying to use a SUVAT equation here instead of simply recognising this as the area of a rectangle.',
    answer=d_q2, unit='m',
    figure=fig('2.5', 'q2', 'motion', kind='velocity', points=[{'t': 0, 'y': 10}, {'t': 5.0, 'y': 10}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 5.0, 'label': 'area = displacement'}))

d_q3 = 0.5 * 4 * 20
add('2.5', 'F', 'A velocity-time graph shows velocity increasing uniformly from rest to 20 m/s over 4.0 s. Calculate the displacement.',
    f'The area under the graph is a triangle: displacement = ½ × base × height = ½ × 4.0 × 20 = {sf(d_q3)} m. Common mistake: using the FINAL velocity as if it acted for the whole time (20 × 4.0 = 80 m), rather than recognising the velocity builds up gradually from zero.',
    answer=d_q3, unit='m',
    figure=fig('2.5', 'q3', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 4.0, 'y': 20}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 4.0, 'label': 'area = displacement'}))

add('2.5', 'F', 'A velocity-time graph is a trapezium shape (the velocity rises, then stays constant). What is the best way to find the total displacement?',
    'Split the trapezium into a triangle (the rising part) and a rectangle (the constant part), find the area of each separately, then add them together. Common mistake: trying to apply a single rectangle or triangle formula to the WHOLE shape at once, when it is actually a combination of two simpler shapes.',
    kind='multiple_choice',
    options=['Split it into a triangle and a rectangle, and add their areas', 'Multiply the final velocity by the total time', 'Use only the gradient of the final section',
             'Average the initial and final velocities and ignore the time altogether'],
    correct_idx=0)

d_q5 = 6 * 8
add('2.5', 'F', 'A velocity-time graph shows a constant velocity of 6.0 m/s for 8.0 s, after which the object stops instantly. Calculate the displacement during the 8.0 s.',
    f'The shape is a rectangle: displacement = 6.0 × 8.0 = {sf(d_q5)} m. Common mistake: trying to account for the sudden stop at the end, which happens AFTER this 8.0 s interval and so does not affect this calculation.',
    answer=d_q5, unit='m',
    figure=fig('2.5', 'q5', 'motion', kind='velocity', points=[{'t': 0, 'y': 6.0}, {'t': 8.0, 'y': 6.0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 8.0, 'label': ''}))

d_q6 = 0.5 * 12 * 6
add('2.5', 'F', 'A velocity-time graph shows a velocity of 12 m/s decreasing uniformly to zero over 6.0 s. Calculate the displacement.',
    f'This is a triangle: displacement = ½ × 6.0 × 12 = {sf(d_q6)} m. Common mistake: using the INITIAL velocity as if it acted throughout (12 × 6.0 = 72 m), rather than accounting for the steady decrease to zero.',
    answer=d_q6, unit='m',
    figure=fig('2.5', 'q6', 'motion', kind='velocity', points=[{'t': 0, 'y': 12}, {'t': 6.0, 'y': 0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 6.0, 'label': 'area = displacement'}))

d_q7 = 0.5 * (5 + 15) * 4
add('2.5', 'I', 'A velocity-time graph is a straight line rising uniformly from 5.0 m/s at t = 0 to 15 m/s at t = 4.0 s. Calculate the displacement during this time.',
    f'This trapezium’s area = ½(a+b)h, using the two parallel velocity sides and the time as the "height": ½ × (5.0+15) × 4.0 = ½ × 20 × 4.0 = {sf(d_q7)} m. (Equivalently, average velocity × time = ((5.0+15)/2) × 4.0, the same result.) Common mistake: using only the final velocity (15 × 4.0 = 60 m) and ignoring that the object started with a nonzero velocity of 5.0 m/s rather than from rest.',
    answer=d_q7, unit='m',
    figure=fig('2.5', 'q7', 'motion', kind='velocity', points=[{'t': 0, 'y': 5.0}, {'t': 4.0, 'y': 15}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 4.0, 'label': 'area = displacement'}))

add('2.5', 'I', 'A velocity-time graph rises uniformly from rest, then stays constant. Which combination of shapes makes up the total area?',
    'The rising part is a triangle (velocity building up from zero), and the constant part is a rectangle (velocity unchanging) — the total displacement is the SUM of the triangle’s area and the rectangle’s area. Common mistake: treating the whole shape as one single rectangle using only the final, constant velocity, which overestimates the displacement during the rising part.',
    kind='multiple_choice', options=['A triangle, then a rectangle, added together', 'Two separate rectangles', 'One single triangle for the whole motion', 'A rectangle minus a triangle'], correct_idx=0)

d1_q9, d2_q9 = 0.5 * 2 * 10, 10 * 6
total_q9 = d1_q9 + d2_q9
add('2.5', 'I', 'A velocity-time graph rises uniformly from rest to 10 m/s over 2.0 s, then stays constant at 10 m/s for a further 6.0 s. Calculate the total displacement.',
    f'Triangle (rising part): ½ × 2.0 × 10 = {sf(d1_q9)} m. Rectangle (constant part): 10 × 6.0 = {sf(d2_q9)} m. Total displacement = {sf(d1_q9)} + {sf(d2_q9)} = {sf(total_q9)} m. Common mistake: forgetting to include the small triangular area from the rising phase, and only counting the constant-velocity rectangle.',
    answer=total_q9, unit='m',
    figure=fig('2.5', 'q9', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 2.0, 'y': 10}, {'t': 8.0, 'y': 10}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 8.0, 'label': 'area = displacement'}))

d_q10 = 0.5 * (20 + 5) * 3
add('2.5', 'I', 'A velocity-time graph is a straight line falling from 20 m/s at t = 0 to 5.0 m/s at t = 3.0 s (the object is decelerating but never stops). Calculate the displacement.',
    f'Trapezium area: ½(20+5) × 3.0 = ½ × 25 × 3.0 = {sf(d_q10)} m. Common mistake: treating this as a triangle (which would require the velocity to reach zero), rather than correctly identifying it as a trapezium since the velocity stays positive throughout.',
    answer=d_q10, unit='m',
    figure=fig('2.5', 'q10', 'motion', kind='velocity', points=[{'t': 0, 'y': 20}, {'t': 3.0, 'y': 5}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 3.0, 'label': 'area = displacement'}))

add('2.5', 'I', 'A velocity-time graph dips below the time axis (the velocity becomes negative) for part of a journey. What does the area BELOW the axis represent?',
    'It still represents displacement, but NEGATIVE displacement (in the opposite direction to the positive direction chosen) — this area should be subtracted from any positive area elsewhere on the graph to get the correct NET displacement for the whole journey. Common mistake: treating all area under a velocity-time graph as automatically positive, regardless of which side of the time axis it falls on.',
    kind='multiple_choice',
    options=['Negative displacement, which subtracts from the positive area elsewhere on the graph', 'The area below the axis is simply ignored',
             'It represents the object travelling at double speed', 'It represents an error in the graph, since area cannot be negative'],
    correct_idx=0)

d_q12 = -4 * 5
add('2.5', 'I', 'Taking the object’s intended forward direction as positive, a velocity-time graph shows a constant velocity of −4.0 m/s for 5.0 s. Calculate the displacement.',
    f'displacement = velocity × time = (−4.0) × 5.0 = {sf(d_q12)} m — the area lies entirely below the time axis, representing a negative (backward) displacement. Common mistake: reporting the magnitude of the area only (20 m) without the negative sign that shows the direction of travel.',
    answer=d_q12, unit='m', sign_sensitive=True,
    figure=fig('2.5', 'q12', 'motion', kind='velocity', points=[{'t': 0, 'y': -4.0}, {'t': 5.0, 'y': -4.0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', yMin=-5, shade={'t0': 0, 't1': 5.0, 'label': ''}, hRefLines=[0]))

cross_q13 = 10 / ((10 - (-5)) / 6.0)
pos_q13 = 0.5 * cross_q13 * 10
neg_q13 = 0.5 * (6 - cross_q13) * 5
net_q13 = pos_q13 - neg_q13
add('2.5', 'I', 'A velocity-time graph is a straight line falling from +10 m/s at t = 0 to −5.0 m/s at t = 6.0 s. Calculate the NET displacement over the whole 6.0 s.',
    f'The line crosses zero at t = {sf(cross_q13)} s. Positive area (0 to {sf(cross_q13)} s): ½ × {sf(cross_q13)} × 10 = {sf(pos_q13)} m. Negative area ({sf(cross_q13)} s to 6.0 s): ½ × {sf(6 - cross_q13)} × 5.0 = {sf(neg_q13)} m, counted as negative. Net displacement = {sf(pos_q13)} − {sf(neg_q13)} = {sf(net_q13)} m. Common mistake: adding the two triangle areas together as if both were positive, instead of subtracting the area that lies below the time axis.',
    answer=net_q13, unit='m', sign_sensitive=True,
    figure=fig('2.5', 'q13', 'motion', kind='velocity', points=[{'t': 0, 'y': 10}, {'t': 6.0, 'y': -5}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', hRefLines=[0]))

tri1_q14 = 0.5 * 5 * 20
rect_q14 = 20 * 10
tri2_q14 = 0.5 * 5 * 20
total_q14 = tri1_q14 + rect_q14 + tri2_q14
add('2.5', 'C', 'A velocity-time graph has three straight sections: (0 s, 0 m/s) to (5 s, 20 m/s); then flat to (15 s, 20 m/s); then falling to (20 s, 0 m/s). (a) Calculate the area (displacement) of the first (triangular) section. (b) Calculate the area of the middle (rectangular) section. (c) Calculate the TOTAL displacement for the whole 20 s. Give only the answer to (c).',
    f'(a) Triangle: ½ × 5 × 20 = {sf(tri1_q14)} m. (b) Rectangle: 20 × 10 = {sf(rect_q14)} m. The final section is also a triangle: ½ × 5 × 20 = {sf(tri2_q14)} m. (c) Total = {sf(tri1_q14)} + {sf(rect_q14)} + {sf(tri2_q14)} = {sf(total_q14)} m. Common mistake: forgetting the final falling section also has a nonzero area, and leaving it out of the total.',
    answer=total_q14, unit='m',
    figure=fig('2.5', 'q14', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 5, 'y': 20}, {'t': 15, 'y': 20}, {'t': 20, 'y': 0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 20, 'label': ''}))

cross_q15 = 8 / ((8 - (-4)) / 6.0)
pos_q15 = 0.5 * cross_q15 * 8
neg_q15 = 0.5 * (6 - cross_q15) * 4
net_q15 = pos_q15 - neg_q15
dist_q15 = pos_q15 + neg_q15
add('2.5', 'C', 'A velocity-time graph is a straight line falling from +8.0 m/s at t = 0 to −4.0 m/s at t = 6.0 s (the object reverses direction partway through). (a) Calculate the net displacement for the whole 6.0 s. (b) Calculate the total distance travelled. Give only the answer to (a).',
    f'The line crosses zero at t = {sf(cross_q15)} s. Positive area: ½ × {sf(cross_q15)} × 8.0 = {sf(pos_q15)} m. Negative area: ½ × {sf(6 - cross_q15)} × 4.0 = {sf(neg_q15)} m. (a) Net displacement = {sf(pos_q15)} − {sf(neg_q15)} = {sf(net_q15)} m. (b) Total distance = {sf(pos_q15)} + {sf(neg_q15)} = {sf(dist_q15)} m — larger than the net displacement, because distance ADDS both areas regardless of sign. Common mistake: giving the same numerical answer for both (a) and (b) — they only agree when the object never reverses direction.',
    answer=net_q15, unit='m', sign_sensitive=True,
    figure=fig('2.5', 'q15', 'motion', kind='velocity', points=[{'t': 0, 'y': 8.0}, {'t': 6.0, 'y': -4.0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', hRefLines=[0]))

v_q16 = [0, 4, 7, 9, 10, 10]
trap_q16 = [0.5 * (v_q16[i] + v_q16[i + 1]) * 2 for i in range(5)]
total_q16 = sum(trap_q16)
add('2.5', 'C', 'Velocity readings are taken every 2.0 s: t = 0, 2, 4, 6, 8, 10 s give v = 0, 4, 7, 9, 10, 10 m/s. Using the trapezium rule (treating each 2.0 s interval as a trapezium), estimate the total displacement over the 10 s.',
    f'Each interval’s area = ½ × (vᵢ+vᵢ₊₁) × 2.0: {", ".join(sf(a) for a in trap_q16)} m. Summing all five intervals: {" + ".join(sf(a) for a in trap_q16)} = {sf(total_q16)} m. Common mistake: using only the velocity values directly (e.g. adding 0+4+7+9+10+10) instead of correctly pairing adjacent readings into trapeziums first.',
    answer=total_q16, unit='m',
    figure=fig('2.5', 'q16', 'table', headers=['t / s', '0', '2', '4', '6', '8', '10'], rows=[['v / m/s', '0', '4', '7', '9', '10', '10']]))

cross_q17 = 15 / ((15 - (-9)) / 12.0)
pos_q17 = 0.5 * cross_q17 * 15
neg_q17 = 0.5 * (12 - cross_q17) * 9
net_q17 = pos_q17 - neg_q17
dist_q17 = pos_q17 + neg_q17
add('2.5', 'C', 'A velocity-time graph is a straight line falling from +15 m/s at t = 0 to −9.0 m/s at t = 12 s. (a) Calculate the net displacement for the whole 12 s. (b) Calculate the total distance travelled. Give only the answer to (a).',
    f'The line crosses zero at t = {sf(cross_q17)} s. Positive area: ½ × {sf(cross_q17)} × 15 = {sf(pos_q17)} m. Negative area: ½ × {sf(12 - cross_q17)} × 9.0 = {sf(neg_q17)} m. (a) Net displacement = {sf(pos_q17)} − {sf(neg_q17)} = {sf(net_q17)} m. (b) Total distance = {sf(pos_q17)} + {sf(neg_q17)} = {sf(dist_q17)} m. Common mistake: finding the zero-crossing time incorrectly by not setting up the straight-line equation v(t) properly, leading to the wrong split between the two triangular areas.',
    answer=net_q17, unit='m', sign_sensitive=True,
    figure=fig('2.5', 'q17', 'motion', kind='velocity', points=[{'t': 0, 'y': 15}, {'t': 12, 'y': -9}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', hRefLines=[0]))

d_q18 = 10.0 * 5.0
uncv_q18 = 0.2 / 10.0 * 100
unct_q18 = 0.1 / 5.0 * 100
uncd_q18 = uncv_q18 + unct_q18
add('2.5', 'C', 'A velocity of 10.0 ± 0.2 m/s is held constant for a time of 5.0 ± 0.1 s. (a) Calculate the displacement. (b) Calculate the percentage uncertainty in this displacement, given that percentage uncertainties ADD for a quantity found by multiplying two measurements. Give only the answer to (b).',
    f'(a) displacement = 10.0 × 5.0 = {sf(d_q18)} m. (b) Percentage uncertainty in v = 0.2 ÷ 10.0 × 100% = {sf(uncv_q18)}%. Percentage uncertainty in t = 0.1 ÷ 5.0 × 100% = {sf(unct_q18)}%. Since displacement = v × t (a multiplication), these percentage uncertainties add: {sf(uncv_q18)}% + {sf(unct_q18)}% = {sf(uncd_q18)}%. Common mistake: adding the ABSOLUTE uncertainties (0.2 and 0.1, in different units) rather than first converting each to a PERCENTAGE uncertainty before adding them.',
    answer=uncd_q18, unit='%')

d_q19 = 0.5 * (5 + 25) * 8
add('2.5', 'S', 'Derive, by treating the trapezium area under a straight velocity-time line as ½(u+v)t, the familiar equation for displacement under constant acceleration: s = ((u+v)/2)t. Then evaluate it for u = 5.0 m/s, v = 25 m/s, t = 8.0 s.',
    f'A straight line on a velocity-time graph from u (at t=0) to v (at time t) traces a trapezium, with the two parallel sides of length u and v, and "height" t (along the time axis). Its area is ½(sum of parallel sides) × height = ½(u+v) × t — this IS the displacement, since area under a velocity-time graph always equals displacement. Rewriting slightly: s = ((u+v)/2) × t, i.e. displacement equals the AVERAGE velocity multiplied by time, exactly as expected for uniform acceleration. For u = 5.0, v = 25, t = 8.0: s = ((5.0+25)/2) × 8.0 = {sf(d_q19)} m. Common mistake: thinking this "area" formula and the SUVAT equation s=((u+v)/2)t are two unrelated facts to memorise separately, rather than recognising the SUVAT equation is really just the trapezium area formula in disguise.',
    answer=d_q19, unit='m')

v_q20 = [0, 8, 14, 18, 20]
trap_q20 = [0.5 * (v_q20[i] + v_q20[i + 1]) * 0.5 for i in range(4)]
total_q20 = sum(trap_q20)
add('2.5', 'S', 'A roller coaster’s velocity during a violent launch is sampled every 0.50 s: t = 0, 0.5, 1.0, 1.5, 2.0 s give v = 0, 8, 14, 18, 20 m/s. Using the trapezium rule, estimate the distance covered during the 2.0 s launch.',
    f'Each 0.50 s interval’s area: {", ".join(sf(a) for a in trap_q20)} m. Total = {" + ".join(sf(a) for a in trap_q20)} = {sf(total_q20)} m. Common mistake: assuming the velocity increases uniformly between readings and using a single big triangle (½ × 2.0 × 20 = 20 m) instead of the more accurate trapezium-by-trapezium estimate, which correctly captures the DECREASING rate of increase visible in the actual readings (the gaps between successive velocities shrink: 8, 6, 4, 2).',
    answer=total_q20, unit='m')


# ════════════════════════════════════════════════════════════════════════
# 2.6 Measuring velocity and acceleration
# ════════════════════════════════════════════════════════════════════════
dt_q1 = 1 / 50
add('2.6', 'F', 'A ticker-tape timer marks a dot on a paper tape at a fixed frequency, powered from a 50 Hz AC mains supply. Calculate the time between consecutive dots.',
    f'time between dots = 1 ÷ frequency = 1 ÷ 50 = {sf(dt_q1)} s. Common mistake: using the frequency value (50) directly as if it were itself a time, rather than taking its reciprocal.',
    answer=dt_q1, unit='s')

v_q2 = 0.030 / (1 / 50)
add('2.6', 'F', 'A ticker tape (dot interval 1/50 s, from a 50 Hz timer) shows a constant spacing of 3.0 cm between consecutive dots. Calculate the velocity this represents.',
    f'velocity = spacing ÷ time interval = 0.030 ÷ (1/50) = {sf(v_q2)} m/s. Common mistake: forgetting to convert the spacing from cm to m before dividing.',
    answer=v_q2, unit='m/s', figure=fig('2.6', 'q2', 'ticker', gaps=[3.0, 3.0, 3.0, 3.0], unit='cm', intervalLabel='0.020 s between dots'))

add('2.6', 'F', 'A light gate times how long a card of known length takes to pass through the beam. Which calculation gives the speed of the card?',
    'speed = (length of the card) ÷ (time the beam is blocked). Common mistake: dividing the time by the length instead of the length by the time.',
    kind='multiple_choice', options=['card length ÷ blocking time', 'blocking time ÷ card length', 'card length × blocking time', 'card length only, ignoring the time'], correct_idx=0)

v_q4 = 0.050 / 0.040
add('2.6', 'F', 'A card of length 5.0 cm takes 0.040 s to pass through a light gate. Calculate its speed.',
    f'speed = length ÷ time = 0.050 ÷ 0.040 = {sf(v_q4)} m/s. Common mistake: using the card length in cm directly in the division without converting to metres first.',
    answer=v_q4, unit='m/s')

add('2.6', 'F', 'On a ticker tape, the spacing between successive dots gets progressively LARGER along the tape. What does this show about the object’s motion?',
    'Since the dots are made at equal time intervals, a growing spacing means the object is covering more distance in each equal time interval — so it is accelerating (speeding up). Common mistake: assuming the dot spacing itself is a measure of speed without reference to the fact that the TIME between dots is always the same, which is what makes the spacing meaningful.',
    kind='multiple_choice', options=['The object is accelerating (speeding up)', 'The object is decelerating', 'The object is moving at constant velocity', 'The timer is malfunctioning'], correct_idx=0)

v_q6 = 0.045 / (1 / 50)
add('2.6', 'F', 'A ticker tape (50 Hz timer) has a constant spacing of 4.5 cm between dots. Calculate the velocity.',
    f'velocity = 0.045 ÷ (1/50) = {sf(v_q6)} m/s. Common mistake: using 50 directly as the time interval instead of its reciprocal, 1/50 s.',
    answer=v_q6, unit='m/s', figure=fig('2.6', 'q6', 'ticker', gaps=[4.5, 4.5, 4.5], unit='cm', intervalLabel='0.020 s between dots'))

v_q7 = 0.030 / 0.024
add('2.6', 'I', 'A card of length 3.0 cm takes 0.024 s to pass through a light gate. Calculate its speed.',
    f'speed = 0.030 ÷ 0.024 = {sf(v_q7)} m/s. Common mistake: rounding the time too early, which can shift the final answer noticeably when the time is already small.',
    answer=v_q7, unit='m/s')

add('2.6', 'I', 'A light gate calculates speed from (card length) ÷ (blocking time). Is this the card’s speed at a single instant, or an average?',
    'It is an AVERAGE speed over the (very short) time the card takes to cross the beam — the calculation assumes the card’s speed barely changes during that brief transit, so this average is normally an excellent approximation to the instantaneous speed at that point. Common mistake: treating a light gate’s reading as a perfectly exact instantaneous value, rather than recognising it is still, strictly, an average over a short interval.',
    kind='multiple_choice',
    options=['It is an average speed over the (short) transit time, approximating the instantaneous speed', 'It is always exactly the instantaneous speed, with no approximation involved',
             'It is the card’s maximum possible speed', 'It is unrelated to the card’s actual speed'],
    correct_idx=0)

v_q9 = 0.50 / 0.25
add('2.6', 'I', 'A trolley passes through two light gates 0.50 m apart, taking 0.25 s to travel between them. Calculate its average velocity between the gates.',
    f'velocity = distance ÷ time = 0.50 ÷ 0.25 = {sf(v_q9)} m/s. Common mistake: using one gate’s own transit time (from its card length) instead of the time taken to travel the much larger distance BETWEEN the two gates.',
    answer=v_q9, unit='m/s', figure=fig('2.6', 'q9', 'lightgate', gateDistanceCm=50, cardLengthCm=5.0))

add('2.6', 'I', 'A ticker-tape timer is powered from a 50 Hz UK mains supply. What is the time interval between consecutive dots?',
    'time = 1 ÷ frequency = 1 ÷ 50 = 0.020 s between each dot. Common mistake: confusing the FREQUENCY (50 Hz, dots per second) with the TIME INTERVAL (0.020 s, seconds per dot) — they are reciprocals of each other, not the same number.',
    kind='multiple_choice', options=['0.020 s', '50 s', '0.50 s', '5.0 s'], correct_idx=0)

v_q11 = 0.120 / (5 * (1 / 50))
add('2.6', 'I', 'On a ticker tape (50 Hz timer), the distance from the 1st dot to the 6th dot (spanning 5 equal intervals) is 12.0 cm. Calculate the average velocity over this span.',
    f'Time for 5 intervals = 5 × 0.020 = 0.100 s. velocity = 0.120 ÷ 0.100 = {sf(v_q11)} m/s. Common mistake: counting the number of DOTS (6) rather than the number of INTERVALS between them (5) — the 6th dot marks the end of the 5th interval, not a 6th one.',
    answer=v_q11, unit='m/s')

dt_q12 = 1 / 20
add('2.6', 'I', 'A motion sensor records an object’s position 20 times every second. Calculate the time between consecutive readings.',
    f'time = 1 ÷ 20 = {sf(dt_q12)} s between readings. Common mistake: giving 20 s as the answer, confusing the sampling RATE (20 readings per second) with the time BETWEEN readings.',
    answer=dt_q12, unit='s')

v_q13 = 0.600 / 0.040
add('2.6', 'I', 'A motion sensor records position every 0.040 s. Two consecutive readings are 0.600 m apart. Calculate the velocity.',
    f'velocity = distance ÷ time = 0.600 ÷ 0.040 = {sf(v_q13)} m/s. Common mistake: using the sampling RATE (1/0.040 = 25 readings per second) somewhere in the calculation instead of the actual time INTERVAL (0.040 s).',
    answer=v_q13, unit='m/s', figure=fig('2.6', 'q13', 'path', legs=[{'distance': 0.600, 'dir': 1, 'label': '0.600 m in 0.040 s'}], unit='m'))

v1_q14 = 0.040 / 0.080
v2_q14 = 0.040 / 0.032
a_q14 = (v2_q14 - v1_q14) / 0.60
add('2.6', 'C', 'A card of length 4.0 cm passes through a single light gate twice during an experiment on a ramp: first giving a transit time of 0.080 s, then (after accelerating further down the ramp) a transit time of 0.032 s, exactly 0.60 s later. (a) Calculate the velocity at the first pass. (b) Calculate the velocity at the second pass. (c) Calculate the average acceleration between the two passes. Give only the answer to (c).',
    f'(a) v₁ = 0.040 ÷ 0.080 = {sf(v1_q14)} m/s. (b) v₂ = 0.040 ÷ 0.032 = {sf(v2_q14)} m/s. (c) acceleration = ({sf(v2_q14)} − {sf(v1_q14)}) ÷ 0.60 = {sf(a_q14)} m/s². Common mistake: using the card’s transit times (0.080 s, 0.032 s) as the time interval in the acceleration formula, instead of the 0.60 s that actually separates the two PASSES through the gate.',
    answer=a_q14, unit='m/s²')

v1_q15 = 0.010 / 0.020
v4_q15 = 0.022 / 0.020
a_q15 = (v4_q15 - v1_q15) / (3 * 0.020)
add('2.6', 'C', 'A ticker tape (dot interval 0.020 s) shows four consecutive dot-to-dot spacings of 1.0 cm, 1.4 cm, 1.8 cm, 2.2 cm. (a) Calculate the velocity represented by the first interval. (b) Calculate the velocity represented by the last interval. (c) Calculate the average acceleration across the tape, using the time between the MIDPOINTS of the first and last intervals (3 intervals apart). Give only the answer to (c).',
    f'(a) v₁ = 0.010 ÷ 0.020 = {sf(v1_q15)} m/s. (b) v₄ = 0.022 ÷ 0.020 = {sf(v4_q15)} m/s. (c) The time between the MIDPOINTS of interval 1 and interval 4 spans 3 full intervals: 3 × 0.020 = 0.060 s. acceleration = ({sf(v4_q15)} − {sf(v1_q15)}) ÷ 0.060 = {sf(a_q15)} m/s². Common mistake: using the time span of all 4 intervals (0.080 s) instead of the 3 intervals that actually separate the MIDPOINTS of the first and last intervals (where each interval’s velocity is best taken to apply).',
    answer=a_q15, unit='m/s²',
    figure=fig('2.6', 'q15', 'ticker', gaps=[1.0, 1.4, 1.8, 2.2], unit='cm', intervalLabel='0.020 s between dots'))

v_q16 = 0.015 / 0.0050
add('2.6', 'C', 'State one advantage and one disadvantage of using a light gate (compared with a ticker-tape timer) for measuring the velocity of a fast-moving trolley. Then calculate the velocity from a light gate reading: card length 1.5 cm, blocking time 0.0050 s.',
    f'Advantage of a light gate: it can accurately time very brief, fast events (a ticker tape is limited to the fixed 0.020 s interval of its timer and can struggle at high speed, since dots start to overlap or smear). Disadvantage: a light gate typically only gives a velocity at ONE point (where the gate is), whereas a ticker tape gives a continuous record of the ENTIRE motion on one tape. Calculation: velocity = 0.015 ÷ 0.0050 = {sf(v_q16)} m/s. Common mistake: assuming one method is simply "better" in every situation, rather than recognising each has situations where it is more appropriate.',
    answer=v_q16, unit='m/s')

v_q17 = (0.260 - 0.200) / 0.20
add('2.6', 'C', 'A datalogger records position readings every short interval: x = 0.200 m at t = 0.90 s, and x = 0.260 m at t = 1.10 s. Estimate the instantaneous velocity at t = 1.0 s using these two readings.',
    f'velocity ≈ (0.260−0.200) ÷ (1.10−0.90) = 0.060 ÷ 0.20 = {sf(v_q17)} m/s — using two readings symmetrically placed around t = 1.0 s gives a good estimate of the gradient (and hence velocity) at that exact instant. Common mistake: using only ONE of the two readings together with t = 1.0 s (rather than the pair straddling it), which estimates an average velocity over a less well-centred interval.',
    answer=v_q17, unit='m/s',
    figure=fig('2.6', 'q17', 'path', legs=[{'distance': 0.060, 'dir': 1, 'label': '0.060 m in 0.20 s'}], unit='m'))

a_q18 = 2 * 0.30 / 0.247**2
add('2.6', 'C', 'A student wants to measure the acceleration of a falling object over a very short drop of only 0.30 m. (a) Explain why light gates connected to a data logger would be far more suitable than a hand-operated stopwatch for this measurement. (b) The fall is timed (by light gates) at 0.247 s from rest. Use s = ½at² to estimate the acceleration. Give only the answer to (b).',
    f'(a) The whole fall lasts well under half a second — far shorter than a typical human reaction time (around 0.2–0.3 s) — so a hand-started and hand-stopped stopwatch reading would be swamped by reaction-time error. A light gate, triggered automatically and electronically, removes human reaction time from the timing entirely. (b) From rest: 0.30 = ½ × a × 0.247², so a = (2 × 0.30) ÷ 0.247² = {sf(a_q18)} m/s² (close to g, as expected for a falling object with only small air resistance). Common mistake: using a stopwatch-based time for an event this brief and treating the result as reliable, when reaction time alone could be comparable to the entire fall time.',
    answer=a_q18, unit='m/s²',
    figure=fig('2.6', 'q18', 'balldrop', heights=[0.30]))

unc_q19 = 0.2 / 0.40 * 100
add('2.6', 'S', 'A ticker-tape timer running from stable 50 Hz mains has a negligible timing uncertainty, whereas a student using a stopwatch has a reaction-time uncertainty of about ±0.2 s on each press. For timing a short event lasting about 0.40 s, calculate the percentage uncertainty introduced by the stopwatch’s reaction time alone, and explain why a ticker tape or light gate would be enormously more precise for an event this brief.',
    f'Percentage uncertainty = 0.2 ÷ 0.40 × 100% = {sf(unc_q19)}% — an enormous uncertainty, essentially making a stopwatch reading of such a brief event almost meaningless on its own. A ticker tape or light gate times the event electronically (or marks it on a continuously-running tape), completely avoiding human reaction time, so its uncertainty is dramatically smaller for events on this timescale. Common mistake: assuming a stopwatch is "good enough" for any school experiment, without checking whether the TIMESCALE of the event being measured is comparable to typical human reaction times.',
    answer=unc_q19, unit='%')

dt_q20 = 1 / 1000
v_q20 = 0.012 / dt_q20
add('2.6', 'S', "A high-speed camera records 1000 frames per second (fps) to study a sprinter's start. (a) Calculate the time between consecutive frames. (b) The sprinter's hip moves 0.012 m between two consecutive frames. Calculate the corresponding velocity. Give only the answer to (b).",
    f'(a) time between frames = 1 ÷ 1000 = {sf(dt_q20)} s. (b) velocity = 0.012 ÷ {sf(dt_q20)} = {sf(v_q20)} m/s. Common mistake: using 1000 (the frame RATE) directly as a time in the velocity calculation, instead of its reciprocal.',
    answer=v_q20, unit='m/s')


# ════════════════════════════════════════════════════════════════════════
# 2.7 Determining velocity and acceleration in the laboratory
# ════════════════════════════════════════════════════════════════════════
add('2.7', 'F', 'In a light-gate experiment, a card’s length is measured with a ruler marked in mm. What is the main source of uncertainty in this length measurement?',
    'It comes from the precision of the ruler itself (and how well its scale can be read) — typically taken as half the smallest division, or the smallest division itself, depending on how the reading is made. Common mistake: assuming the light gate’s electronic timing is the main source of uncertainty in the LENGTH measurement, when the two (length and time) are measured by entirely separate instruments.',
    kind='multiple_choice',
    options=['The precision of the ruler used to measure the card’s length', 'The speed of light', 'The frequency of the light gate’s own electronics', 'The card’s mass'],
    correct_idx=0)

unc_q2 = 0.05 / 2.00 * 100
add('2.7', 'F', 'A card’s length is measured as 2.00 ± 0.05 cm. Calculate the percentage uncertainty in this measurement.',
    f'percentage uncertainty = (absolute uncertainty ÷ measured value) × 100% = (0.05 ÷ 2.00) × 100% = {sf(unc_q2)}%. Common mistake: forgetting to multiply by 100 to express the result as a percentage.',
    answer=unc_q2, unit='%')

unc_q3 = 0.0005 / 0.0200 * 100
add('2.7', 'F', 'A light gate’s timer reads 0.0200 ± 0.0005 s. Calculate the percentage uncertainty in this time.',
    f'percentage uncertainty = (0.0005 ÷ 0.0200) × 100% = {sf(unc_q3)}%. Common mistake: mixing up which number is the measurement and which is the uncertainty when both are small decimals.',
    answer=unc_q3, unit='%')

add('2.7', 'F', 'A velocity is calculated as (card length) ÷ (blocking time), where the length has a 2.5% uncertainty and the time has a 2.5% uncertainty. How do these combine to give the percentage uncertainty in the velocity?',
    'For a quantity found by MULTIPLYING or DIVIDING two measurements, the percentage uncertainties simply ADD: 2.5% + 2.5% = 5.0%. Common mistake: trying to add the absolute uncertainties of the length (in cm) and the time (in s) directly, which are in completely different units and cannot be combined that way — only the PERCENTAGE uncertainties can be added directly like this.',
    kind='multiple_choice', options=['They add: 2.5% + 2.5% = 5.0%', 'They are averaged: 2.5%', 'They multiply: 2.5% × 2.5% = 6.25%', 'Only the larger of the two counts'], correct_idx=0)

v_q5 = 0.0300 / 0.0200
add('2.7', 'F', 'A card of length 3.00 cm takes 0.0200 s to pass through a light gate. Calculate the velocity.',
    f'velocity = 0.0300 ÷ 0.0200 = {sf(v_q5)} m/s. Common mistake: using the length in cm (3.00) directly without converting to metres.',
    answer=v_q5, unit='m/s')

absunc_q6 = 1.5 * 0.05
add('2.7', 'F', 'A velocity is calculated as 1.5 m/s, with a percentage uncertainty of 5.0%. Calculate the absolute uncertainty in this velocity.',
    f'absolute uncertainty = percentage uncertainty × value = 0.050 × 1.5 = {sf(absunc_q6)} m/s, so the velocity should be quoted as 1.5 ± {sf(absunc_q6)} m/s. Common mistake: reporting the percentage (5.0%) as if it were itself the absolute uncertainty in m/s.',
    answer=absunc_q6, unit='m/s')

times_q7 = [0.42, 0.44, 0.41, 0.45, 0.43]
mean_q7 = sum(times_q7) / len(times_q7)
add('2.7', 'I', 'Five repeat timings of a trolley’s fall give: 0.42 s, 0.44 s, 0.41 s, 0.45 s, 0.43 s. Calculate the mean time.',
    f'mean = (0.42+0.44+0.41+0.45+0.43) ÷ 5 = {sf(sum(times_q7))} ÷ 5 = {sf(mean_q7)} s. Common mistake: using only one of the five readings rather than averaging all of them, which throws away the benefit of repeating the measurement.',
    answer=mean_q7, unit='s',
    figure=fig('2.7', 'q7', 'table', headers=['Reading', '1', '2', '3', '4', '5'], rows=[['t / s', '0.42', '0.44', '0.41', '0.45', '0.43']]))

range_unc_q8 = (max(times_q7) - min(times_q7)) / 2
add('2.7', 'I', 'Using the same five timings (0.42, 0.44, 0.41, 0.45, 0.43 s), estimate the uncertainty in the mean time using half the range of the readings.',
    f'half-range = (maximum − minimum) ÷ 2 = (0.45−0.41) ÷ 2 = {sf(range_unc_q8)} s. Common mistake: using the full range (0.04 s) as the uncertainty, rather than HALF the range — the mean lies roughly in the middle of the spread, so it is only this far from either extreme.',
    answer=range_unc_q8, unit='s')

add('2.7', 'I', 'Why is a measurement normally repeated several times and a mean taken, rather than relying on a single reading?',
    'Repeating a measurement and averaging reduces the effect of RANDOM variations (such as slightly different reaction times, or small inconsistencies in how an experiment is set up each time) — the mean of several readings is normally a better estimate of the true value than any single one. Common mistake: believing that repeating a measurement removes a SYSTEMATIC error (one that affects every reading in the same way, such as a wrongly-zeroed instrument) — repeating readings cannot fix that kind of error.',
    kind='multiple_choice',
    options=['It reduces the effect of random variation between readings, giving a more reliable mean', 'It has no real benefit over a single reading',
             'It removes any systematic error in the apparatus', 'It always doubles the precision of the final answer'],
    correct_idx=0)

unc_q10 = range_unc_q8 / mean_q7 * 100
add('2.7', 'I', 'Using the mean time (from the five readings 0.42, 0.44, 0.41, 0.45, 0.43 s) and the half-range uncertainty, calculate the percentage uncertainty in the mean time.',
    f'percentage uncertainty = ({sf(range_unc_q8)} ÷ {sf(mean_q7)}) × 100% = {sf(unc_q10)}%. Common mistake: using one of the individual readings, rather than the calculated MEAN, as the denominator in this percentage calculation.',
    answer=unc_q10, unit='%')

add('2.7', 'I', 'A light gate is accidentally positioned 2 mm away from where the experimenter intended, affecting every single reading taken during the experiment in the same way. Is this a random or a systematic error?',
    'This is a SYSTEMATIC error: it shifts every single result by the same fixed amount, in the same direction, so repeating the measurement and averaging will NOT reveal or reduce it. A random error, by contrast, varies unpredictably from reading to reading and CAN be reduced by repeating and averaging. Common mistake: assuming that taking more repeat readings will fix this kind of consistent positioning error — it will not, since every reading is affected identically.',
    kind='multiple_choice',
    options=['Systematic — it affects every reading in the same way and is not reduced by repeating and averaging', 'Random — because the gate was moved by a person',
             'Neither — positioning errors do not count as experimental errors', 'Random, because 2 mm is a small distance'],
    correct_idx=0)

unc_q12 = 0.5 / 60.0 * 100
add('2.7', 'I', 'The distance between two light gates is measured as 60.0 ± 0.5 cm. Calculate the percentage uncertainty in this distance.',
    f'percentage uncertainty = (0.5 ÷ 60.0) × 100% = {sf(unc_q12)}%. Common mistake: using the absolute uncertainty (0.5 cm) as if it were already a percentage.',
    answer=unc_q12, unit='%')

unc_q13 = 0.010 / 0.300 * 100
add('2.7', 'I', 'The time for a trolley to travel between two light gates is measured as 0.300 ± 0.010 s. Calculate the percentage uncertainty in this time.',
    f'percentage uncertainty = (0.010 ÷ 0.300) × 100% = {sf(unc_q13)}%. Common mistake: rounding 0.010/0.300 too aggressively and losing a significant figure the question needs kept.',
    answer=unc_q13, unit='%')

v_q14 = 0.600 / 0.300
pd_q14 = 0.5 / 60.0 * 100
pt_q14 = 0.010 / 0.300 * 100
pv_q14 = pd_q14 + pt_q14
add('2.7', 'C', 'A trolley’s velocity between two light gates is found from a distance of 60.0 ± 0.5 cm and a time of 0.300 ± 0.010 s. (a) Calculate the velocity. (b) Calculate the percentage uncertainty in the distance. (c) Calculate the percentage uncertainty in the time. (d) Calculate the percentage uncertainty in the velocity. Give only the answer to (d).',
    f'(a) velocity = 0.600 ÷ 0.300 = {sf(v_q14)} m/s. (b) percentage uncertainty in distance = (0.5÷60.0)×100% = {sf(pd_q14)}%. (c) percentage uncertainty in time = (0.010÷0.300)×100% = {sf(pt_q14)}%. (d) Since velocity = distance ÷ time, the percentage uncertainties add: {sf(pd_q14)}% + {sf(pt_q14)}% = {sf(pv_q14)}%. Common mistake: averaging the two percentage uncertainties from (b) and (c) instead of adding them.',
    answer=pv_q14, unit='%',
    figure=fig('2.7', 'q14', 'lightgate', gateDistanceCm=60.0, cardLengthCm=5.0))

v_q15 = 0.600 / 0.300
absunc_q15 = v_q15 * (pv_q14 / 100)
add('2.7', 'C', 'Using the velocity of 2.00 m/s found in the previous question, and its overall percentage uncertainty of 4.17%, calculate the absolute uncertainty in the velocity.',
    f'absolute uncertainty = percentage uncertainty × value = 0.0417 × 2.00 = {sf(2.00 * 0.0417)} m/s, so the velocity should be quoted as 2.00 ± {sf(2.00 * 0.0417)} m/s. Common mistake: quoting the percentage (4.17%) itself as though it were already the absolute uncertainty, in m/s.',
    answer=2.00 * 0.0417, unit='m/s', tolerance=0.1)

a_q16 = (1.60 - 0.80) / 0.50
dv_q16 = 1.60 - 0.80
absunc_dv_q16 = 0.03 + 0.04
puncdv_q16 = absunc_dv_q16 / dv_q16 * 100
punct_q16 = 0.01 / 0.50 * 100
puncA_q16 = puncdv_q16 + punct_q16
add('2.7', 'C', 'A trolley’s velocity is 0.80 ± 0.03 m/s at one light gate and 1.60 ± 0.04 m/s at a second, 0.50 ± 0.01 s later. (a) Calculate the acceleration. (b) Calculate the absolute uncertainty in Δv. (c) Calculate the percentage uncertainty in the acceleration. Give only the answer to (c).',
    f'(a) acceleration = (1.60−0.80) ÷ 0.50 = {sf(a_q16)} m/s². (b) Since Δv is found by SUBTRACTING two measurements, their ABSOLUTE uncertainties add: 0.03 + 0.04 = {sf(absunc_dv_q16)} m/s, out of Δv = {sf(dv_q16)} m/s, giving {sf(puncdv_q16)}% uncertainty in Δv. (c) Percentage uncertainty in time = (0.01÷0.50)×100% = {sf(punct_q16)}%. Since acceleration = Δv ÷ t (a division), the percentage uncertainties add: {sf(puncdv_q16)}% + {sf(punct_q16)}% = {sf(puncA_q16)}%. Common mistake: adding the PERCENTAGE uncertainties of the two velocities (for Δv) instead of their ABSOLUTE uncertainties — subtraction combines absolute uncertainties, not percentage ones.',
    answer=puncA_q16, unit='%')

h_q17, t_q17 = 1.200, 0.495
g_q17 = 2 * h_q17 / t_q17**2
punch_q17 = 0.002 / h_q17 * 100
punct_q17b = 0.008 / t_q17 * 100
punct2_q17 = 2 * punct_q17b
puncg_q17 = punch_q17 + punct2_q17
add('2.7', 'C', 'A free-fall experiment gives h = 1.200 ± 0.002 m and t = 0.495 ± 0.008 s, used to find g from g = 2h/t². (a) Calculate the percentage uncertainty in h. (b) Calculate the percentage uncertainty in t. (c) Since t is SQUARED, its percentage uncertainty doubles when used in g’s formula. Calculate the overall percentage uncertainty in g. Give only the answer to (c).',
    f'(a) % uncertainty in h = (0.002÷1.200)×100% = {sf(punch_q17)}%. (b) % uncertainty in t = (0.008÷0.495)×100% = {sf(punct_q17b)}%. (c) Since g ∝ 1/t², the percentage uncertainty from t DOUBLES: 2 × {sf(punct_q17b)}% = {sf(punct2_q17)}%. Total % uncertainty in g = {sf(punch_q17)}% + {sf(punct2_q17)}% = {sf(puncg_q17)}%. Common mistake: forgetting to double the percentage uncertainty in t to account for it being SQUARED in the formula for g — a very common and important rule for combining uncertainties with powers.',
    answer=puncg_q17, unit='%',
    figure=fig('2.7', 'q17', 'balldrop', heights=[1.200]))

g_q18 = 2 * 1.200 / 0.495**2
absunc_g_q18 = g_q18 * (puncg_q17 / 100)
add('2.7', 'C', 'Using g = 2h/t² with h = 1.200 m and t = 0.495 s (and the overall percentage uncertainty in g found previously, 3.40%), calculate (a) the value of g from this experiment, and (b) the absolute uncertainty in g. Give only the answer to (b).',
    f'(a) g = 2 × 1.200 ÷ 0.495² = {sf(g_q18)} m/s². (b) absolute uncertainty = percentage uncertainty × value = 0.0340 × {sf(g_q18)} = {sf(g_q18 * 0.0340)} m/s², so g = {sf(g_q18)} ± {sf(g_q18 * 0.0340)} m/s². Common mistake: using the standard value of g (9.81 m/s²) instead of this experiment’s own calculated value when finding the absolute uncertainty.',
    answer=g_q18 * 0.0340, unit='m/s²', tolerance=0.1)

ah1_q19 = 0.48 / 0.050
ah2_q19 = 0.97 / 0.100
avg_ah_q19 = (ah1_q19 + ah2_q19) / 2
pred_q19 = avg_ah_q19 * 0.150
add('2.7', 'S', 'A student investigates how a trolley’s acceleration a down a ramp depends on the ramp’s height h, expecting a ∝ h (approximately, for small angles). Two results: h = 0.050 m gives a = 0.48 m/s²; h = 0.100 m gives a = 0.97 m/s². (a) Calculate a/h for each result. (b) Comment on whether the data supports a ∝ h. (c) Using the average of the two a/h values, predict a for h = 0.150 m. Give only the answer to (c).',
    f'(a) First: a/h = 0.48 ÷ 0.050 = {sf(ah1_q19)}. Second: a/h = 0.97 ÷ 0.100 = {sf(ah2_q19)}. (b) The two a/h values are very close ({sf(ah1_q19)} and {sf(ah2_q19)}), supporting a ∝ h over this range — if a were NOT proportional to h, a/h would differ noticeably between the two results rather than staying roughly constant. (c) Average a/h = ({sf(ah1_q19)}+{sf(ah2_q19)})/2 = {sf(avg_ah_q19)}. Predicted a = {sf(avg_ah_q19)} × 0.150 = {sf(pred_q19)} m/s². Common mistake: testing proportionality by comparing a values directly rather than checking whether a/h (or, equivalently, a plotted against h) stays constant.',
    answer=pred_q19, unit='m/s²',
    figure=fig('2.7', 'q19', 'lightgate', gateDistanceCm=50, cardLengthCm=5.0))

T_q20 = 40.0 / 20
puncT_q20 = 0.4 / 40.0 * 100
puncT2_q20 = 2 * puncT_q20
puncL_q20 = 0.005 / 1.000 * 100
puncg_q20 = puncL_q20 + puncT2_q20
add('2.7', 'S', 'In a pendulum experiment to find g from T = 2π√(L/g), a student measures the time for 20 oscillations as 40.0 ± 0.4 s, for a pendulum of length L = 1.000 ± 0.005 m. (a) Calculate the period T of one oscillation. (b) Rearranging gives g = 4π²L/T². Calculate the overall percentage uncertainty in g (remembering T is squared). Give only the answer to (b).',
    f'(a) T = 40.0 ÷ 20 = {sf(T_q20)} s (dividing by the exact count, 20, does not change the percentage uncertainty). (b) % uncertainty in the 20-oscillation time = (0.4÷40.0)×100% = {sf(puncT_q20)}%, so the same {sf(puncT_q20)}% applies to T itself. Since g ∝ 1/T², this doubles to {sf(puncT2_q20)}%. % uncertainty in L = (0.005÷1.000)×100% = {sf(puncL_q20)}%. Total % uncertainty in g = {sf(puncL_q20)}% + {sf(puncT2_q20)}% = {sf(puncg_q20)}%. Common mistake: recalculating the percentage uncertainty in T from scratch as if dividing by 20 (an exact number with no uncertainty of its own) somehow changed it — dividing by an exact constant leaves the PERCENTAGE uncertainty completely unchanged.',
    answer=puncg_q20, unit='%')


# ════════════════════════════════════════════════════════════════════════
# 2.8 The equations of motion
# ════════════════════════════════════════════════════════════════════════
add('2.8', 'F', 'Given initial velocity u, acceleration a and time t, which SUVAT equation directly gives the final velocity v?',
    'v = u + at is the equation that directly connects u, a, t and v, with no displacement s involved at all. Common mistake: reaching for an equation that includes s, even though s is neither given nor asked for here.',
    kind='multiple_choice', options=['v = u + at', 's = ut + ½at²', 'v² = u² + 2as', 's = ((u+v)/2)t'], correct_idx=0)

v_f2 = 5 + 2 * 4
add('2.8', 'F', 'An object has u = 5.0 m/s, a = 2.0 m/s² and t = 4.0 s. Calculate v using v = u + at.',
    f'v = u + at = 5.0 + 2.0 × 4.0 = {sf(v_f2)} m/s. Common mistake: computing a × t and forgetting to then add u.',
    answer=v_f2, unit='m/s', figure=fig('2.8', 'f2', 'motion', kind='velocity', points=[{'t': 0, 'y': 5.0}, {'t': 4.0, 'y': v_f2}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

s_f3 = 0 * 5 + 0.5 * 3 * 5**2
add('2.8', 'F', 'An object starts from rest (u = 0) with a = 3.0 m/s² for t = 5.0 s. Calculate the displacement using s = ut + ½at².',
    f's = ut + ½at² = (0×5.0) + ½×3.0×5.0² = 0 + {sf(0.5 * 3 * 25)} = {sf(s_f3)} m. Common mistake: forgetting to square the time before multiplying by ½a.',
    answer=s_f3, unit='m',
    figure=fig('2.8', 'f3', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 5.0, 'y': 15}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 5.0, 'label': f's = {sf(s_f3)} m'}))

v_f4 = sqrt(0**2 + 2 * 4 * 20)
add('2.8', 'F', 'An object has u = 0, a = 4.0 m/s², and travels a displacement s = 20 m. Calculate v using v² = u² + 2as.',
    f'v² = 0² + 2×4.0×20 = {sf(2 * 4 * 20)}, so v = √{sf(2 * 4 * 20)} = {sf(v_f4)} m/s. Common mistake: forgetting to take the square root at the end, and giving the value of v² instead of v.',
    answer=v_f4, unit='m/s')

s_f5 = ((10 + 20) / 2) * 6
add('2.8', 'F', 'An object has u = 10 m/s, v = 20 m/s, and travels for t = 6.0 s. Calculate the displacement using s = ((u+v)/2)t.',
    f's = ((10+20)/2) × 6.0 = 15 × 6.0 = {sf(s_f5)} m. Common mistake: forgetting to divide (u+v) by 2 before multiplying by t, which would double the answer.',
    answer=s_f5, unit='m', figure=fig('2.8', 'f5', 'motion', kind='velocity', points=[{'t': 0, 'y': 10}, {'t': 6.0, 'y': 20}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 6.0, 'label': f's = {sf(s_f5)} m'}))

add('2.8', 'F', 'A question gives u, a and s, and asks for v, but does NOT give (or ask for) the time t. Which SUVAT equation should be used?',
    'v² = u² + 2as is the only one of the four SUVAT equations that does not contain t at all, making it the natural choice whenever time is neither given nor needed. Common mistake: trying to first calculate t from another equation (needlessly) before using a DIFFERENT equation to find v, when the t-free equation can get there directly.',
    kind='multiple_choice', options=['v² = u² + 2as', 'v = u + at', 's = ut + ½at²', 's = ((u+v)/2)t'], correct_idx=0)

u_q7 = 25 - 3 * 4
add('2.8', 'I', 'An object has v = 25 m/s, a = 3.0 m/s² and t = 4.0 s. Calculate u.',
    f'Rearranging v = u + at: u = v − at = 25 − (3.0×4.0) = 25 − 12 = {sf(u_q7)} m/s. Common mistake: adding at to v instead of subtracting it.',
    answer=u_q7, unit='m/s', figure=fig('2.8', 'q7', 'motion', kind='velocity', points=[{'t': 0, 'y': u_q7}, {'t': 4.0, 'y': 25}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

a_q8 = (30 - 10) / 5.0
add('2.8', 'I', 'An object has u = 10 m/s, v = 30 m/s and t = 5.0 s. Calculate a.',
    f'Rearranging v = u + at: a = (v−u) ÷ t = (30−10) ÷ 5.0 = {sf(a_q8)} m/s². Common mistake: dividing by u or v instead of by t.',
    answer=a_q8, unit='m/s²', figure=fig('2.8', 'q8', 'motion', kind='velocity', points=[{'t': 0, 'y': 10}, {'t': 5.0, 'y': 30}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

t_q9 = (18 - 6) / 3.0
add('2.8', 'I', 'An object has u = 6.0 m/s, v = 18 m/s and a = 3.0 m/s². Calculate t.',
    f'Rearranging v = u + at: t = (v−u) ÷ a = (18−6.0) ÷ 3.0 = {sf(t_q9)} s. Common mistake: dividing (v−u) by v instead of by a.',
    answer=t_q9, unit='s', figure=fig('2.8', 'q9', 'motion', kind='velocity', points=[{'t': 0, 'y': 6.0}, {'t': t_q9, 'y': 18}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

s_q10 = (16**2 - 0**2) / (2 * 2.0)
add('2.8', 'I', 'An object has u = 0, v = 16 m/s and a = 2.0 m/s². Calculate the displacement s.',
    f'Rearranging v² = u² + 2as: s = (v²−u²) ÷ (2a) = (16²−0²) ÷ (2×2.0) = 256 ÷ 4.0 = {sf(s_q10)} m. Common mistake: forgetting to square v and u before subtracting, and instead computing (v−u) ÷ (2a).',
    answer=s_q10, unit='m')

add('2.8', 'I', 'A ball travelling in the positive direction is decelerating. In the SUVAT equations, with the positive direction as usual, what sign should its acceleration be given?',
    'Since the ball is slowing down while moving in the positive direction, its velocity is decreasing, so the acceleration must be taken as NEGATIVE in all four SUVAT equations — using a positive value for a deceleration is one of the most common sources of sign errors in SUVAT problems. Common mistake: using a positive magnitude for "deceleration" directly in the equations, rather than converting it to the correctly-signed acceleration first.',
    kind='multiple_choice',
    options=['Negative, since the velocity is decreasing in the chosen positive direction', 'Positive, since deceleration is itself always a positive quantity',
             'Zero, since deceleration is not really an acceleration', 'It depends on the object’s mass'],
    correct_idx=0)

v_q12 = 20 + (-4) * 3
add('2.8', 'I', 'A ball has u = 20 m/s and decelerates at 4.0 m/s² (so a = −4.0 m/s²) for 3.0 s. Calculate v.',
    f'v = u + at = 20 + (−4.0)×3.0 = 20 − 12 = {sf(v_q12)} m/s. Common mistake: using a = +4.0 m/s², which would wrongly make the ball speed up instead of slow down.',
    answer=v_q12, unit='m/s',
    figure=fig('2.8', 'q12', 'motion', kind='velocity', points=[{'t': 0, 'y': 20}, {'t': 3.0, 'y': v_q12}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

s_q13 = 15 * 2 + 0.5 * (-3) * 2**2
add('2.8', 'I', 'An object has u = 15 m/s and a = −3.0 m/s², for t = 2.0 s. Calculate the displacement s.',
    f's = ut + ½at² = (15×2.0) + ½×(−3.0)×2.0² = 30 + (−6.0) = {sf(s_q13)} m. Common mistake: using a = +3.0 instead of −3.0, which would give a larger (and wrong) displacement of 36 m.',
    answer=s_q13, unit='m',
    figure=fig('2.8', 'q13', 'motion', kind='velocity', points=[{'t': 0, 'y': 15}, {'t': 2.0, 'y': 15 + (-3) * 2}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 2.0, 'label': f's = {sf(s_q13)} m'}))

v_q14 = 5 + 2 * 6
s_q14 = ((5 + v_q14) / 2) * 6
check_q14 = 5 * 6 + 0.5 * 2 * 6**2
add('2.8', 'C', 'A car has u = 5.0 m/s and accelerates at 2.0 m/s² for 6.0 s. (a) Calculate v using v = u + at. (b) Calculate the displacement using s = ((u+v)/2)t. (c) Verify your answer to (b) using s = ut + ½at². Give only the answer to (b).',
    f'(a) v = 5.0 + 2.0×6.0 = {sf(v_q14)} m/s. (b) s = ((5.0+{sf(v_q14)})/2) × 6.0 = {sf((5 + v_q14) / 2)} × 6.0 = {sf(s_q14)} m. (c) Check: s = (5.0×6.0) + ½×2.0×6.0² = 30 + 36 = {sf(check_q14)} m — matches, confirming the two equations are consistent for the same motion. Common mistake: trusting only one SUVAT equation without any way to check it — using a second, independent equation like this is a good habit for catching arithmetic slips.',
    answer=s_q14, unit='m',
    figure=fig('2.8', 'q14', 'motion', kind='velocity', points=[{'t': 0, 'y': 5.0}, {'t': 6.0, 'y': v_q14}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 6.0, 'label': f's = {sf(s_q14)} m'}))

t_q15 = 25 / 5.0
s_q15 = (25**2 - 0**2) / (2 * 5.0)
add('2.8', 'C', 'A car travelling at 25 m/s brakes with a deceleration of magnitude 5.0 m/s² until it stops. (a) Calculate the time taken to stop. (b) Calculate the braking distance, using v² = u² + 2as. Give only the answer to (b).',
    f'(a) t = (v−u)÷a = (0−25)÷(−5.0) = {sf(t_q15)} s. (b) Rearranging v²=u²+2as for s: 0 = 25² + 2×(−5.0)×s, so s = 25² ÷ (2×5.0) = 625÷10 = {sf(s_q15)} m. Common mistake: using +5.0 m/s² for the deceleration in the equation, instead of −5.0 m/s², which would give a negative (meaningless) value under the square root logic of the rearrangement.',
    answer=s_q15, unit='m',
    figure=fig('2.8', 'q15', 'motion', kind='velocity', points=[{'t': 0, 'y': 25}, {'t': t_q15, 'y': 0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': t_q15, 'label': f's = {sf(s_q15)} m'}))

v1_q16 = 0 + 3.0 * 4.0
s1_q16 = 0 * 4.0 + 0.5 * 3.0 * 4.0**2
s2_q16 = v1_q16 * 5.0
total_q16 = s1_q16 + s2_q16
add('2.8', 'C', 'An object starts from rest and accelerates at 3.0 m/s² for 4.0 s (phase 1), then moves at the resulting constant velocity for a further 5.0 s (phase 2). (a) Calculate the velocity reached at the end of phase 1. (b) Calculate the displacement during phase 1. (c) Calculate the TOTAL displacement for both phases combined. Give only the answer to (c).',
    f'(a) v₁ = 0 + 3.0×4.0 = {sf(v1_q16)} m/s. (b) s₁ = (0×4.0) + ½×3.0×4.0² = {sf(s1_q16)} m. (c) Phase 2 (constant velocity): s₂ = {sf(v1_q16)}×5.0 = {sf(s2_q16)} m. Total = {sf(s1_q16)} + {sf(s2_q16)} = {sf(total_q16)} m. Common mistake: using the SUVAT acceleration equation for phase 2 as well, instead of recognising it is a SEPARATE, constant-velocity (zero acceleration) phase that just needs displacement = velocity × time.',
    answer=total_q16, unit='m',
    figure=fig('2.8', 'q16', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 4.0, 'y': v1_q16}, {'t': 9.0, 'y': v1_q16}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 9.0, 'label': ''}))

u_q17 = sqrt(2 * 2.0 * 40)
add('2.8', 'C', 'A ball must decelerate from speed u to rest over a distance of exactly 40 m, under a deceleration of magnitude 2.0 m/s², in order to stop exactly at a wall. Calculate the maximum initial speed u for which this is possible.',
    f'Using v² = u² + 2as with v = 0 and a = −2.0 m/s²: 0 = u² + 2×(−2.0)×40, so u² = 160 and u = √160 = {sf(u_q17)} m/s. Common mistake: using a = +2.0 instead of −2.0 when rearranging, which would produce a negative value for u² (impossible) rather than a positive one.',
    answer=u_q17, unit='m/s')

a_q18 = 2 * 100 / 5.0**2
v_q18 = 0 + a_q18 * 5.0
check_q18 = sqrt(2 * a_q18 * 100)
add('2.8', 'C', 'An object starts from rest and, under constant acceleration, covers 100 m in exactly 5.0 s. (a) Use s = ut + ½at² to find the acceleration. (b) Use v = u + at to find the velocity at t = 5.0 s. (c) Verify (b) using v² = u² + 2as. Give only the answer to (b).',
    f'(a) 100 = (0×5.0) + ½×a×5.0², so a = (2×100) ÷ 25 = {sf(a_q18)} m/s². (b) v = 0 + {sf(a_q18)}×5.0 = {sf(v_q18)} m/s. (c) Check: v² = 0² + 2×{sf(a_q18)}×100 = 1600, so v = √1600 = {sf(check_q18)} m/s — matches (b). Common mistake: trusting a single calculation without any independent check — here, two different SUVAT routes both confirm v = 40 m/s.',
    answer=v_q18, unit='m/s',
    figure=fig('2.8', 'q18', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 5.0, 'y': v_q18}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 5.0, 'label': 's = 100 m'}))

v_q19 = sqrt(0**2 + 2 * G * 45)
add('2.8', 'S', 'Starting from v = u + at and s = ((u+v)/2)t, eliminate t algebraically to derive v² = u² + 2as. Then apply it: an object is dropped from rest and falls 45 m under gravity (g = 9.81 m/s², air resistance negligible). Calculate its speed after falling this distance.',
    f'From v = u+at: t = (v−u)/a. Substitute into s = ((u+v)/2)t: s = ((u+v)/2) × (v−u)/a = (v²−u²) ÷ (2a), using the difference-of-two-squares identity (u+v)(v−u) = v²−u². Rearranging gives 2as = v²−u², i.e. v² = u²+2as, with no t remaining. Applying it: v² = 0² + 2×9.81×45 = {sf(2 * G * 45)}, so v = √{sf(2 * G * 45)} = {sf(v_q19)} m/s. Common mistake: trying to substitute t from a DIFFERENT equation (e.g. s = ut + ½at²) instead of from v = u+at, which does not cleanly eliminate t the same way.',
    answer=v_q19, unit='m/s')

u_q20 = 2 * 18 / 4.0
a_q20 = (0**2 - u_q20**2) / (2 * 18)
check_q20 = u_q20 + a_q20 * 4.0
add('2.8', 'S', 'A particle decelerates uniformly from speed u to rest over a measured distance of 18 m in exactly 4.0 s. (a) Use s = ((u+v)/2)t (with v = 0) to find u. (b) Use v² = u² + 2as to find the acceleration a. (c) Check your value of a using v = u + at (which should also give v = 0). Give only the answer to (a).',
    f'(a) s = ((u+0)/2) × t, so u = 2s/t = (2×18) ÷ 4.0 = {sf(u_q20)} m/s. (b) 0 = {sf(u_q20)}² + 2×a×18, so a = −{sf(u_q20)}² ÷ (2×18) = {sf(a_q20)} m/s². (c) Check: v = {sf(u_q20)} + ({sf(a_q20)})×4.0 = {sf(check_q20)} m/s — exactly 0, confirming the two independent equations agree. Common mistake: using s = ut + ½at² first (which has TWO unknowns, u and a, and cannot be solved alone) instead of the simpler s = ((u+v)/2)t, which has only one unknown once v = 0 is substituted.',
    answer=u_q20, unit='m/s')


# ════════════════════════════════════════════════════════════════════════
# 2.9 Deriving the equations of motion
# ════════════════════════════════════════════════════════════════════════
add('2.9', 'F', 'Starting from the definition a = (v−u)/t, which rearrangement correctly isolates v?',
    'Multiplying both sides by t gives at = v−u, and adding u to both sides gives v = u + at. Common mistake: rearranging to v = u − at by mishandling which side the −u term ends up on.',
    kind='multiple_choice', options=['v = u + at', 'v = u − at', 'v = at − u', 'v = a(t−u)'], correct_idx=0)

v_f2 = 4 + 2 * 3
add('2.9', 'F', 'Using v = u + at (derived from the definition of acceleration), find v for u = 4.0 m/s, a = 2.0 m/s², t = 3.0 s.',
    f'v = u + at = 4.0 + 2.0×3.0 = {sf(v_f2)} m/s. Common mistake: multiplying u by a instead of a by t.',
    answer=v_f2, unit='m/s', figure=fig('2.9', 'f2', 'motion', kind='velocity', points=[{'t': 0, 'y': 4.0}, {'t': 3.0, 'y': v_f2}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

add('2.9', 'F', 'On a velocity-time graph, what physical quantity does the AREA under the line represent? (This fact underlies the derivation of s = ((u+v)/2)t.)',
    'The area under a velocity-time graph represents displacement — this is the geometric fact that the equation s = ((u+v)/2)t is simply restating algebraically (the area of a trapezium with parallel sides u and v, and "height" t). Common mistake: thinking the AREA gives acceleration (that is instead the GRADIENT of the line).',
    kind='multiple_choice', options=['Displacement', 'Acceleration', 'Average speed only', 'Nothing physically meaningful'], correct_idx=0)

s_f4 = ((4 + 10) / 2) * 3
add('2.9', 'F', 'Using s = ((u+v)/2)t (the area of the trapezium under a velocity-time graph), find s for u = 4.0 m/s, v = 10 m/s, t = 3.0 s.',
    f's = ((4.0+10)/2) × 3.0 = 7.0 × 3.0 = {sf(s_f4)} m. Common mistake: forgetting to divide (u+v) by 2 before multiplying by t.',
    answer=s_f4, unit='m', figure=fig('2.9', 'f4', 'motion', kind='velocity', points=[{'t': 0, 'y': 4.0}, {'t': 3.0, 'y': 10}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 3.0, 'label': f's = {sf(s_f4)} m'}))

add('2.9', 'F', 'When u is NOT zero, the trapezium area under a velocity-time graph can be split into two simpler shapes to derive s = ut + ½at². What are they?',
    'A rectangle of height u and width t (giving area ut), plus a triangle on top with base t and height (v−u) = at (giving area ½ × t × at = ½at²). Adding these two areas gives s = ut + ½at². Common mistake: trying to treat the whole trapezium as a single triangle, which only works correctly when u = 0.',
    kind='multiple_choice',
    options=['A rectangle (area ut) and a triangle on top of it (area ½at²)', 'Two identical rectangles', 'A single triangle with base t and height v',
             'A circle and a square'],
    correct_idx=0)

s_f6 = 4 * 3 + 0.5 * 2 * 3**2
add('2.9', 'F', 'Using s = ut + ½at² (the rectangle-plus-triangle derivation), find s for u = 4.0 m/s, a = 2.0 m/s², t = 3.0 s. (This should match the previous question’s answer, found by a different method.)',
    f's = ut + ½at² = (4.0×3.0) + ½×2.0×3.0² = 12 + 9.0 = {sf(s_f6)} m — the same as before, confirming the two derivations describe the same physical displacement. Common mistake: forgetting to square t before multiplying by ½a, which would change the triangle’s area calculation.',
    answer=s_f6, unit='m',
    figure=fig('2.9', 'f6', 'motion', kind='velocity', points=[{'t': 0, 'y': 4.0}, {'t': 3.0, 'y': 10}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 3.0, 'label': f's = {sf(s_f6)} m'}))

s_q7 = (14**2 - 6**2) / (2 * 4)
add('2.9', 'I', 'By substituting t = (v−u)/a into s = ((u+v)/2)t, show that s = (v²−u²)/(2a). Apply this for u = 6.0 m/s, v = 14 m/s, a = 4.0 m/s².',
    f'Substituting: s = ((u+v)/2) × (v−u)/a = (u+v)(v−u) ÷ (2a) = (v²−u²) ÷ (2a), using the difference-of-two-squares identity. Applying it: s = (14²−6²) ÷ (2×4.0) = (196−36) ÷ 8.0 = 160 ÷ 8.0 = {sf(s_q7)} m. Common mistake: expanding (u+v)(v−u) incorrectly, rather than recognising it directly as the difference-of-two-squares pattern v²−u².',
    answer=s_q7, unit='m',
    figure=fig('2.9', 'q7', 'motion', kind='velocity', points=[{'t': 0, 'y': 6}, {'t': 2.0, 'y': 14}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 2.0, 'label': f's = {sf(s_q7)} m'}))

add('2.9', 'I', 'Which algebraic identity is the key step in deriving v² = u² + 2as from v = u+at and s = ((u+v)/2)t?',
    'The difference-of-two-squares identity, (v−u)(v+u) = v²−u², is what allows the two expressions (one from each original equation) to combine neatly into this form. Common mistake: trying to derive this result using a completely different approach (such as calculus), when at AS level the two original SUVAT equations and this one algebraic identity are all that is needed.',
    kind='multiple_choice',
    options=['(v−u)(v+u) = v²−u²', '(v+u)² = v²+u²', 'v² ÷ u² = (v÷u)²', 'a² + t² = (a+t)²'],
    correct_idx=0)

s_sub_q9 = 3 * 2 + 0.5 * 5 * 2**2
s_direct_q9 = ((3 + (3 + 5 * 2)) / 2) * 2
add('2.9', 'I', 'Substitute v = u+at into s = ((u+v)/2)t to show this simplifies to s = ut + ½at². Verify this for u = 3.0 m/s, a = 5.0 m/s², t = 2.0 s, by calculating s both ways.',
    f'Substituting: s = ((u + (u+at))/2)t = ((2u+at)/2)t = ut + ½at². Direct substitution method: s = ut+½at² = (3.0×2.0) + ½×5.0×2.0² = 6.0+10 = {sf(s_sub_q9)} m. Using the original form with v = u+at = 3.0+5.0×2.0 = 13: s = ((3.0+13)/2)×2.0 = {sf(s_direct_q9)} m — the two methods agree. Common mistake: substituting incorrectly and ending up with an extra factor of 2 somewhere in the simplification.',
    answer=s_sub_q9, unit='m',
    figure=fig('2.9', 'q9', 'motion', kind='velocity', points=[{'t': 0, 'y': 3.0}, {'t': 2.0, 'y': 13}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 2.0, 'label': f's = {sf(s_sub_q9)} m'}))

add('2.9', 'I', 'Of the four SUVAT equations, which one does NOT contain the time t at all?',
    'v² = u² + 2as is the only one of the four equations with no t in it — it was specifically derived (by eliminating t between the other two) to be useful whenever time is neither known nor required. Common mistake: forgetting which of the equations is "the one without t", and wasting time calculating t unnecessarily.',
    kind='multiple_choice', options=['v² = u² + 2as', 'v = u + at', 's = ut + ½at²', 's = ((u+v)/2)t'], correct_idx=0)

s_q11 = ((8 + 2) / 2) * 5
add('2.9', 'I', 'Using only the area-under-a-graph interpretation (without needing to recall a SUVAT formula from memory), find the displacement for u = 8.0 m/s decelerating uniformly to v = 2.0 m/s over t = 5.0 s.',
    f'The area of the trapezium is ½(sum of parallel sides) × height: s = ((8.0+2.0)/2) × 5.0 = 5.0 × 5.0 = {sf(s_q11)} m. This is exactly s = ((u+v)/2)t, derived directly from first principles rather than recalled as a memorised formula. Common mistake: needing to look up a formula for this, rather than recognising the trapezium shape and computing its area directly.',
    answer=s_q11, unit='m',
    figure=fig('2.9', 'q11', 'motion', kind='velocity', points=[{'t': 0, 'y': 8.0}, {'t': 5.0, 'y': 2.0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 5.0, 'label': f's = {sf(s_q11)} m'}))

add('2.9', 'I', 'The SUVAT equations assume "uniform acceleration". What does this assumption mean, in terms of what it guarantees about equal time intervals?',
    'Uniform acceleration means equal CHANGES in velocity occur over equal time intervals, throughout the motion — this is the key assumption that makes the velocity-time graph a single straight line, which is what allows all four SUVAT equations (each derived from that straight-line picture) to be valid. Common mistake: thinking "uniform acceleration" is just a vague description, rather than the precise mathematical condition (constant gradient on a v-t graph) that the whole derivation depends on.',
    kind='multiple_choice',
    options=['Equal changes in velocity occur in equal time intervals, so the velocity-time graph is a straight line', 'The velocity never changes',
             'The displacement is the same in every equal time interval', 'The object never experiences any force'],
    correct_idx=0)

a_q13 = 2 * (50 - 5 * 5) / 5**2
add('2.9', 'I', 'Rearranging s = ut + ½at² to make a the subject gives a = 2(s−ut)/t². Apply this for s = 50 m, u = 5.0 m/s, t = 5.0 s.',
    f'a = 2(s−ut) ÷ t² = 2×(50 − 5.0×5.0) ÷ 5.0² = 2×(50−25) ÷ 25 = 2×25 ÷ 25 = {sf(a_q13)} m/s². Common mistake: forgetting to multiply by 2 before dividing by t², since the original ½ must be cleared when rearranging for a.',
    answer=a_q13, unit='m/s²')

t_q14 = 30 / 6
s_q14 = (30**2 - 0**2) / (2 * 6)
add('2.9', 'C', '(a) Starting from v = u+at, make t the subject. (b) Substitute your result into s = ((u+v)/2)t and simplify, showing it leads to v² = u² + 2as. (c) Apply the result to find s for u = 0, v = 30 m/s, a = 6.0 m/s². Give only the answer to (c).',
    f'(a) t = (v−u)/a. (b) Substituting: s = ((u+v)/2) × (v−u)/a = (u+v)(v−u)/(2a) = (v²−u²)/(2a), using the difference-of-two-squares identity; rearranging gives v² = u² + 2as. (c) s = (30²−0²) ÷ (2×6.0) = 900 ÷ 12 = {sf(s_q14)} m. Common mistake: substituting t into the WRONG equation (such as s=ut+½at², which does not simplify this cleanly) instead of into s=((u+v)/2)t.',
    answer=s_q14, unit='m',
    figure=fig('2.9', 'q14', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': t_q14, 'y': 30}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': t_q14, 'label': f's = {sf(s_q14)} m'}))

rect_q15 = 10 * 3
tri_q15 = 0.5 * (-2) * 3**2
s_q15 = rect_q15 + tri_q15
add('2.9', 'C', 'Derive s = ut+½at² using the area under a velocity-time graph, explaining what the rectangle part and the triangle part each represent physically. Apply it for u = 10 m/s, a = −2.0 m/s², t = 3.0 s. Give only the final numerical answer.',
    f'The rectangle (height u, width t) represents the displacement that WOULD occur if the velocity stayed at its initial value u the whole time: area = ut. The triangle on top (base t, height at) represents the EXTRA displacement caused by the velocity changing at a steady rate: area = ½×t×at = ½at². Adding them: s = ut+½at². Applying: rectangle = 10×3.0 = {sf(rect_q15)} m, triangle = ½×(−2.0)×3.0² = {sf(tri_q15)} m (negative, since the object is decelerating). s = {sf(rect_q15)} + ({sf(tri_q15)}) = {sf(s_q15)} m. Common mistake: treating the triangle’s area as always positive, when a negative acceleration makes it a genuinely negative contribution to the total.',
    answer=s_q15, unit='m',
    figure=fig('2.9', 'q15', 'motion', kind='velocity', points=[{'t': 0, 'y': 10}, {'t': 3.0, 'y': 10 + (-2) * 3}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 3.0, 'label': f's = {sf(s_q15)} m'}))

v_q16 = sqrt(2 * G * 10)
add('2.9', 'C', 'When an object starts from rest (u = 0), show how each of the four SUVAT equations simplifies. Then use the simplified form of v² = u²+2as to find v for a free-fall object (a = g = 9.81 m/s²) after falling s = 10 m.',
    f'With u = 0: v = u+at becomes v = at. s = ut+½at² becomes s = ½at². s = ((u+v)/2)t becomes s = ½vt. v² = u²+2as becomes v² = 2as (each loses its "u" term, since u = 0). Applying v² = 2as: v² = 2×9.81×10 = {sf(2 * G * 10)}, so v = √{sf(2 * G * 10)} = {sf(v_q16)} m/s. Common mistake: forgetting that u = 0 only removes the TERMS containing u, not necessarily simplifying every equation by the same amount (v=at loses an entire added term, while v²=2as loses a squared term).',
    answer=v_q16, unit='m/s')

s_q17 = 7 * 4 + 0.5 * 3 * 4**2
v_q17 = 2 * s_q17 / 4.0 - 7
check_q17 = 7 + 3 * 4
add('2.9', 'C', 'A motion has u = 7.0 m/s, a = 3.0 m/s², t = 4.0 s. (a) Calculate s using s = ut+½at². (b) Rearrange s = ((u+v)/2)t to find v from your value of s, WITHOUT using v = u+at directly. (c) Check your answer to (b) using v = u+at. Give only the answer to (b).',
    f'(a) s = (7.0×4.0) + ½×3.0×4.0² = 28 + 24 = {sf(s_q17)} m. (b) Rearranging s = ((u+v)/2)t for v: v = 2s/t − u = (2×{sf(s_q17)})/4.0 − 7.0 = {sf(2 * s_q17 / 4.0)} − 7.0 = {sf(v_q17)} m/s. (c) Check: v = u+at = 7.0 + 3.0×4.0 = {sf(check_q17)} m/s — matches (b), as it should since both equations describe the same uniformly accelerated motion. Common mistake: forgetting to subtract u at the end of the rearrangement in (b), leaving an answer that is too large by exactly u.',
    answer=v_q17, unit='m/s',
    figure=fig('2.9', 'q17', 'motion', kind='velocity', points=[{'t': 0, 'y': 7.0}, {'t': 4.0, 'y': v_q17}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 4.0, 'label': f's = {sf(s_q17)} m'}))

sA_q18 = 0 * 10 + 0.5 * 2 * 10**2
sB_q18 = 5 * 10 + 0.5 * 0.5 * 10**2
sC_q18 = 10 * 10 + 0.5 * (-1) * 10**2
add('2.9', 'C', 'The table gives u, a and t for three objects, A, B and C. For each, use s = ut+½at² to find the displacement, and state which object travels furthest. Give only the furthest distance travelled.',
    f'Object A: s = (0×10) + ½×2.0×10² = {sf(sA_q18)} m. Object B: s = (5.0×10) + ½×0.50×10² = 50+25 = {sf(sB_q18)} m. Object C: s = (10×10) + ½×(−1.0)×10² = 100−50 = {sf(sC_q18)} m. Object A travels furthest, at {sf(sA_q18)} m, even though it starts from rest — its larger acceleration more than compensates for its lower starting speed over this 10 s. Common mistake: assuming the object with the highest INITIAL velocity (C) must travel furthest, without actually calculating all three displacements.',
    answer=max(sA_q18, sB_q18, sC_q18), unit='m',
    figure=fig('2.9', 'q18', 'table', headers=['Object', 'u / m/s', 'a / m/s²', 't / s'], rows=[['A', '0', '2.0', '10'], ['B', '5.0', '0.50', '10'], ['C', '10', '−1.0', '10']]))

formula_check_q19 = 4 * (5 - 0.5)
s5_q19 = 0.5 * 4 * 5**2
s4_q19 = 0.5 * 4 * 4**2
diff_q19 = s5_q19 - s4_q19
add('2.9', 'S', 'Derive, using the area under a velocity-time graph for uniformly accelerated motion starting from rest, an expression for the displacement during the Nth second (between t = N−1 and t = N), and show it equals a(N−½). Verify numerically for a = 4.0 m/s², N = 5 (compare with directly computing s(5)−s(4)).',
    f'For motion from rest, s(t) = ½at², so the displacement during the Nth second is s(N)−s(N−1) = ½a[N²−(N−1)²] = ½a[N²−N²+2N−1] = ½a(2N−1) = a(N−½). For a = 4.0, N = 5: formula gives 4.0×(5−0.5) = {sf(formula_check_q19)} m. Direct check: s(5) = ½×4.0×5² = {sf(s5_q19)} m, s(4) = ½×4.0×4² = {sf(s4_q19)} m, difference = {sf(s5_q19)}−{sf(s4_q19)} = {sf(diff_q19)} m — matches. Common mistake: expanding (N−1)² incorrectly as N²−1 instead of the correct N²−2N+1, which would give a completely wrong simplified formula.',
    answer=formula_check_q19, unit='m')

ratio_q20 = sqrt(12.0 / 3.0)
add('2.9', 'S', 'Two particles, A and B, each start from rest and cover the SAME distance s under uniform accelerations aₐ and a_B respectively. Derive an expression for the ratio of their times, tₐ/t_B, in terms of aₐ and a_B. Evaluate it for aₐ = 3.0 m/s² and a_B = 12 m/s².',
    f'From rest, s = ½at², so t = √(2s/a). Since both cover the SAME s: tₐ/t_B = √(2s/aₐ) ÷ √(2s/a_B) = √(a_B/aₐ), as the 2s cancels completely. Evaluating: tₐ/t_B = √(12/3.0) = √4.0 = {sf(ratio_q20)} — A, with the SMALLER acceleration, takes exactly twice as long as B to cover the same distance. Common mistake: writing the ratio upside down as √(aₐ/a_B), which would (incorrectly) suggest A takes LESS time than B despite its smaller acceleration.',
    answer=ratio_q20, unit='')


# ════════════════════════════════════════════════════════════════════════
# 2.10 Uniform and non-uniform acceleration
# ════════════════════════════════════════════════════════════════════════
add('2.10', 'F', 'How can you tell, from a velocity-time graph, whether an acceleration is uniform or non-uniform?',
    'A STRAIGHT line means a constant gradient, so the acceleration is uniform (constant). A CURVED line means the gradient is itself changing, so the acceleration is non-uniform. Common mistake: assuming any graph that keeps rising must represent uniform acceleration, regardless of whether it is straight or curved.',
    kind='multiple_choice',
    options=['Straight line = uniform acceleration; curved line = non-uniform acceleration', 'Straight line = non-uniform; curved line = uniform',
             'Both always represent uniform acceleration', 'Neither shape tells you anything about acceleration'],
    correct_idx=0)

v_q2 = [0, 5, 10, 15]
a_q2 = (v_q2[-1] - v_q2[0]) / 3
add('2.10', 'F', 'Velocity readings at t = 0, 1, 2, 3 s are v = 0, 5, 10, 15 m/s. Calculate the acceleration, and state whether it is uniform.',
    f'The velocity increases by exactly 5 m/s in each 1 s interval (5, 5, 5) — equal changes in equal times, confirming UNIFORM acceleration. acceleration = (15−0) ÷ 3 = {sf(a_q2)} m/s². Common mistake: only checking the first and last values without confirming that the increases between EVERY pair of consecutive readings are actually equal.',
    answer=a_q2, unit='m/s²', figure=fig('2.10', 'q2', 'table', headers=['t / s', '0', '1', '2', '3'], rows=[['v / m/s', '0', '5', '10', '15']]))

v_q3 = [0, 3, 8, 15]
a_avg_q3 = (v_q3[-1] - v_q3[0]) / 3
add('2.10', 'F', 'Velocity readings at t = 0, 1, 2, 3 s are v = 0, 3, 8, 15 m/s. Calculate the average acceleration over the whole 3 s, and state whether the acceleration is uniform.',
    f'The velocity increases by 3, then 5, then 7 m/s in successive 1 s intervals — these are NOT equal, so the acceleration is NON-uniform (it is increasing). The overall average acceleration is still well-defined: ({v_q3[-1]}−0) ÷ 3 = {sf(a_avg_q3)} m/s². Common mistake: assuming an "average" can only be calculated for UNIFORM acceleration — an average acceleration can always be found from Δv/Δt, whether or not the acceleration is actually constant throughout.',
    answer=a_avg_q3, unit='m/s²', figure=fig('2.10', 'q3', 'table', headers=['t / s', '0', '1', '2', '3'], rows=[['v / m/s', '0', '3', '8', '15']]))

add('2.10', 'F', 'A displacement-time graph is a smooth curve whose gradient increases at a perfectly constant rate as time passes. What does this indicate about the acceleration?',
    'If the gradient (velocity) increases steadily, that is precisely the definition of a CONSTANT (uniform) acceleration — even though the displacement-time graph itself is curved (a parabola), the underlying acceleration is uniform. Common mistake: assuming any curved displacement-time graph must represent non-uniform acceleration — a smooth, evenly-curving parabola is exactly what UNIFORM acceleration looks like on a displacement-time graph.',
    kind='multiple_choice', options=['The acceleration is uniform (constant)', 'The acceleration is non-uniform', 'The velocity is constant', 'The object is not accelerating at all'], correct_idx=0)

v_q5 = [0, 8, 16, 24]
a_q5 = (v_q5[-1] - v_q5[0]) / 6
add('2.10', 'F', 'Velocity readings at t = 0, 2, 4, 6 s are v = 0, 8, 16, 24 m/s. Calculate the acceleration, and confirm it is uniform.',
    f'The velocity increases by exactly 8 m/s in each 2 s interval — equal changes in equal times, confirming uniform acceleration. acceleration = (24−0) ÷ 6 = {sf(a_q5)} m/s². Common mistake: using the WRONG time interval (for example, treating each step as 1 s instead of the actual 2 s between readings).',
    answer=a_q5, unit='m/s²', figure=fig('2.10', 'q5', 'table', headers=['t / s', '0', '2', '4', '6'], rows=[['v / m/s', '0', '8', '16', '24']]))

add('2.10', 'F', 'Which of these real situations is LEAST likely to involve exactly uniform acceleration?',
    'A car navigating city traffic constantly speeds up and slows down in response to other vehicles and traffic lights, so its acceleration is almost never constant for any length of time. By contrast, an object falling under gravity with negligible air resistance experiences very nearly uniform acceleration (g) throughout its fall. Common mistake: assuming "acceleration" in physics problems is always uniform just because it is easier to analyse that way — real motion is very often non-uniform.',
    kind='multiple_choice',
    options=['A car driving through city traffic', 'An object in free fall with negligible air resistance', 'A ball rolling down a smooth, fixed-angle ramp', 'A trolley pulled by a constant force on a frictionless track'],
    correct_idx=0)

v_q7 = [0, 2, 4.5, 8, 13]
a_last_q7 = v_q7[-1] - v_q7[-2]
add('2.10', 'I', 'Velocity readings at t = 0, 1, 2, 3, 4 s are v = 0, 2.0, 4.5, 8.0, 13 m/s. (a) Show that the acceleration is not uniform. (b) Calculate the acceleration during the LAST 1 s interval only.',
    f'(a) Successive 1 s changes in velocity are 2.0, 2.5, 3.5, 5.0 m/s — these are increasing, not equal, so the acceleration is non-uniform. (b) During the last interval: acceleration = (13−8.0) ÷ 1.0 = {sf(a_last_q7)} m/s². Common mistake: calculating the OVERALL average acceleration ((13−0)/4 = 3.25 m/s²) when the question specifically asks about just the last 1 s interval, which has a noticeably different (larger) value.',
    answer=a_last_q7, unit='m/s²', figure=fig('2.10', 'q7', 'table', headers=['t / s', '0', '1', '2', '3', '4'], rows=[['v / m/s', '0', '2.0', '4.5', '8.0', '13']]))

add('2.10', 'I', 'Why do many real moving objects experience non-uniform acceleration, rather than perfectly uniform acceleration?',
    'In reality, the forces acting on an object often change as its speed changes — for example, air resistance (drag) increases as speed increases, which reduces the net force (and hence the acceleration) as an object speeds up. An engine or motor may also not provide a perfectly constant driving force at every speed. Common mistake: assuming any resistive force is automatically constant, when drag in particular typically increases with speed, making the resulting acceleration change over time.',
    kind='multiple_choice',
    options=['Resistive forces such as air resistance typically change (often increasing) as speed changes, altering the net force and hence the acceleration',
             'Non-uniform acceleration never actually occurs in reality', 'All real accelerations are exactly uniform by definition', 'Only electrically powered vehicles can have non-uniform acceleration'],
    correct_idx=0)

ds_q9 = [2, 5, 8, 11]
seconddiff_q9 = ds_q9[1] - ds_q9[0]
a_q9 = (seconddiff_q9 / 100) / (0.1)**2
add('2.10', 'I', 'A ticker tape (0.10 s between dots) shows successive dot-to-dot distances of 2.0 cm, 5.0 cm, 8.0 cm, 11 cm. These distances increase by the same amount (3.0 cm) each time — a standard test for UNIFORM acceleration. Use Δ(Δs) = aT² (where T is the time between dots) to calculate the acceleration.',
    f'The constant second difference (each distance is 3.0 cm more than the last) confirms uniform acceleration, since Δ(Δs) = aT² is constant only when a itself is constant. a = Δ(Δs) ÷ T² = 0.030 ÷ (0.10)² = 0.030 ÷ 0.010 = {sf(a_q9)} m/s². Common mistake: forgetting to convert the second-difference distance from cm to m before dividing by T².',
    answer=a_q9, unit='m/s²', figure=fig('2.10', 'q9', 'table', headers=['Interval', '1', '2', '3', '4'], rows=[['distance / cm', '2.0', '5.0', '8.0', '11']]))

add('2.10', 'I', 'A ticker tape shows successive dot-to-dot distances of 2.0 cm, 4.0 cm, 7.0 cm, 11 cm (differences 2.0, 3.0, 4.0 cm — themselves increasing). What does this show about the acceleration?',
    'Since the SECOND differences (the differences between the differences: 1.0 cm, then 1.0 cm) are constant, the acceleration is actually UNIFORM — even though the raw dot-to-dot distances are clearly not in a simple equally-spaced pattern. Common mistake: concluding the acceleration is non-uniform just because the dot-to-dot distances themselves are not equally spaced; uniform acceleration is confirmed by the SECOND differences being constant, not the first differences (which, for any nonzero acceleration, are never equal in the first place).',
    kind='multiple_choice',
    options=['The acceleration is uniform, because the second differences between the distances are constant', 'The acceleration is non-uniform, because the distances themselves are not equal',
             'The tape shows the object was stationary throughout', 'No conclusion can be drawn from dot spacings'],
    correct_idx=0)

v_q11 = [0, 3, 7, 13, 21]
a_avg_q11 = (v_q11[-1] - v_q11[0]) / 4
add('2.10', 'I', 'Velocity readings at t = 0, 1, 2, 3, 4 s are v = 0, 3, 7, 13, 21 m/s. Calculate the average acceleration over the whole 4 s.',
    f'average acceleration = (21−0) ÷ 4 = {sf(a_avg_q11)} m/s² (the increasing gaps between readings — 3, 4, 6, 8 — show this motion is non-uniform, but an overall average can still be calculated from just the first and last readings and the total time). Common mistake: trying to average the four individual intervals’ accelerations (3, 4, 6, 8 m/s²) rather than simply using the total change in velocity over the total time.',
    answer=a_avg_q11, unit='m/s²', figure=fig('2.10', 'q11', 'table', headers=['t / s', '0', '1', '2', '3', '4'], rows=[['v / m/s', '0', '3', '7', '13', '21']]))

add('2.10', 'I', 'For an object with non-uniform acceleration, what can be said about its INSTANTANEOUS acceleration at different times?',
    'Its instantaneous acceleration varies from moment to moment — it is not the same at every instant, which is exactly what "non-uniform" means for acceleration. Common mistake: thinking "non-uniform acceleration" means the acceleration is always zero at some moments and nonzero at others, rather than simply varying continuously in size (and/or direction).',
    kind='multiple_choice',
    options=['It changes from moment to moment, rather than staying constant', 'It is always exactly zero', 'It is always exactly equal to the average acceleration',
             'It cannot be defined at all for non-uniform motion'],
    correct_idx=0)

a_q13 = (10.5 - 9.5) / 0.2
add('2.10', 'I', 'A velocity-time graph curves smoothly (non-uniform acceleration). Close readings give v = 9.5 m/s at t = 2.9 s and v = 10.5 m/s at t = 3.1 s. Estimate the instantaneous acceleration at t = 3.0 s.',
    f'a ≈ (10.5−9.5) ÷ (3.1−2.9) = 1.0 ÷ 0.20 = {sf(a_q13)} m/s². Common mistake: using readings spaced too far apart in time, which would estimate an average rather than this specific instant’s acceleration.',
    answer=a_q13, unit='m/s²',
    figure=fig('2.10', 'q13', 'motion', kind='velocity', points=[{'t': 2.9, 'y': 9.5}, {'t': 3.1, 'y': 10.5}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

v_q14 = [0, 2, 4, 6, 8, 10]
a_q14 = v_q14[1] - v_q14[0]
v8_q14 = v_q14[-1] + a_q14 * 3
add('2.10', 'C', 'A trolley’s velocity is recorded at t = 0, 1, 2, 3, 4, 5 s as v = 0, 2, 4, 6, 8, 10 m/s. (a) Determine, with a reason, whether the acceleration is uniform. (b) Calculate the acceleration. (c) Predict v at t = 8 s, assuming the same pattern continues. Give only the answer to (c).',
    f'(a) Each 1 s interval increases v by exactly 2 m/s (equal changes in equal times), so the acceleration IS uniform. (b) a = 2.0 m/s². (c) Extending the same uniform pattern 3 more seconds: v(8) = 10 + 2.0×3 = {sf(v8_q14)} m/s. Common mistake: trying to predict beyond the data for a NON-uniform pattern by simple extrapolation — this only works reliably once uniformity has actually been confirmed, as it was here in part (a).',
    answer=v8_q14, unit='m/s', figure=fig('2.10', 'q14', 'table', headers=['t / s', '0', '1', '2', '3', '4', '5'], rows=[['v / m/s', '0', '2', '4', '6', '8', '10']]))

v_q15 = [0, 4, 9, 16]
avg_q15 = (v_q15[-1] - v_q15[0]) / 3
a_last_q15 = v_q15[-1] - v_q15[-2]
add('2.10', 'C', 'A ball’s velocity is recorded at t = 0, 1, 2, 3 s as v = 0, 4, 9, 16 m/s. (a) Show that the acceleration is non-uniform. (b) Calculate the average acceleration over the whole 3 s. (c) Calculate the acceleration during just the LAST 1 s interval. Give only the answer to (c).',
    f'(a) Successive 1 s velocity changes are 4, 5, 7 m/s — not equal, so non-uniform. (b) average acceleration = (16−0) ÷ 3 = {sf(avg_q15)} m/s². (c) Last interval: a = (16−9) ÷ 1.0 = {sf(a_last_q15)} m/s², noticeably bigger than the overall average found in (b). Common mistake: using the overall average ({sf(avg_q15)} m/s²) when the question specifically asks for the acceleration during only the final second.',
    answer=a_last_q15, unit='m/s²', figure=fig('2.10', 'q15', 'table', headers=['t / s', '0', '1', '2', '3'], rows=[['v / m/s', '0', '4', '9', '16']]))

v2_q16 = 0 + 1.5 * 2.0
add('2.10', 'C', "An elevator's measured acceleration is: 1.5 m/s² (uniform) for the first 2.0 s; then non-uniform, falling from 1.5 to 0 m/s² over the next 0.5 s (not analysed in detail here); then exactly 0 m/s² (constant velocity) from then on. (a) State during which phase the SUVAT equations can be directly and exactly applied. (b) Using SUVAT for that phase (starting from rest), calculate the velocity at t = 2.0 s. Give only the answer to (b).",
    f'(a) SUVAT equations assume UNIFORM acceleration, so they can be applied directly and exactly only during the first phase (0 to 2.0 s), not during the middle (non-uniform) phase. (b) v = u+at = 0 + 1.5×2.0 = {sf(v2_q16)} m/s. Common mistake: applying a SUVAT equation across the whole elevator journey (including the non-uniform middle phase) as if it were uniformly accelerated throughout.',
    answer=v2_q16, unit='m/s',
    figure=fig('2.10', 'q16', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 2.0, 'y': v2_q16}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))

ds_q17 = [1.0, 1.6, 2.2, 2.8, 3.4]
seconddiff_q17 = ds_q17[1] - ds_q17[0]
a_q17 = (seconddiff_q17 / 100) / (0.1)**2
add('2.10', 'C', 'A ticker tape (0.10 s between dots) shows successive dot-to-dot distances: 1.0, 1.6, 2.2, 2.8, 3.4 cm. (a) Show that the acceleration is uniform. (b) Calculate its value. Give only the answer to (b).',
    f'(a) The differences between successive distances are 0.60, 0.60, 0.60 cm — constant, confirming uniform acceleration. (b) a = Δ(Δs) ÷ T² = 0.0060 ÷ (0.10)² = {sf(a_q17)} m/s². Common mistake: using the FIRST differences (the distances themselves) in the formula, rather than the constant SECOND difference between them.',
    answer=a_q17, unit='m/s²', figure=fig('2.10', 'q17', 'table', headers=['Interval', '1', '2', '3', '4', '5'], rows=[['distance / cm', '1.0', '1.6', '2.2', '2.8', '3.4']]))

ds_q18 = [1.0, 1.6, 2.5, 3.9]
v_mid_first_q18 = ds_q18[0] / 0.1
v_mid_last_q18 = ds_q18[-1] / 0.1
a_q18 = (v_mid_last_q18 - v_mid_first_q18) / (3 * 0.1)
add('2.10', 'C', 'A ticker tape (0.10 s between dots) shows successive dot-to-dot distances: 1.0, 1.6, 2.5, 3.9 cm. (a) Show that the acceleration is NOT uniform. (b) Estimate the average velocity represented by the first interval, and by the last interval. (c) Hence estimate the average acceleration across the tape. Give only the answer to (c).',
    f'(a) Differences between successive distances: 0.60, 0.90, 1.4 cm — not constant (they are themselves increasing), so the acceleration is non-uniform. (b) First interval: v ≈ 0.010 ÷ 0.10 = {sf(v_mid_first_q18)} m/s. Last interval: v ≈ 0.039 ÷ 0.10 = {sf(v_mid_last_q18)} m/s. (c) These velocities apply roughly at the MIDPOINTS of the first and last intervals, which are 3 full intervals apart in time (0.30 s): a ≈ ({sf(v_mid_last_q18)}−{sf(v_mid_first_q18)}) ÷ 0.30 = {sf(a_q18)} m/s². Common mistake: using the time span of all 4 intervals (0.40 s) instead of the 3 intervals that actually separate the midpoints of the first and last intervals.',
    answer=a_q18, unit='m/s²', figure=fig('2.10', 'q18', 'table', headers=['Interval', '1', '2', '3', '4'], rows=[['distance / cm', '1.0', '1.6', '2.5', '3.9']]))

add('2.10', 'S', 'A particle starts from rest with an acceleration that increases linearly with time: a = 6.0t (in SI units, non-uniform). Since a(t) is linear, its average value over [0,T] equals the mean of its values at t=0 and t=T. Use this to derive an expression for the velocity gained by time T, and show it gives v = 3.0T². Verify for T = 4.0 s.',
    'The average acceleration over [0,T] is (a(0)+a(T))/2 = (0+6.0T)/2 = 3.0T. Velocity gained = average acceleration × time = 3.0T × T = 3.0T². For T = 4.0 s: v = 3.0×4.0² = 3.0×16 = 48 m/s. Common mistake: using the FINAL value of the acceleration, 6.0T, as if it applied for the whole interval (which would overestimate v, since the acceleration started at zero and only reached 6.0T at the very end).',
    answer=48, unit='m/s')

davg_q20 = (5.0 - 4.0) / 2.0
add('2.10', 'S', "A cyclist's velocity goes from 4.0 m/s to 7.0 m/s during one 1.0 s window, then (in a different training phase) from 7.0 m/s down to 5.0 m/s during the NEXT 1.0 s window. (a) Is the acceleration uniform over the combined 2.0 s? Justify your answer using the velocity change in each half. (b) Calculate the overall average acceleration over the full 2.0 s. Give only the answer to (b).",
    f'(a) The velocity change in the first window is +3.0 m/s, but in the second window it is −2.0 m/s — these are not equal, so the acceleration is NOT uniform over the combined 2.0 s (even if each half happened to be uniform within itself). (b) Overall average acceleration = (5.0−4.0) ÷ 2.0 = {sf(davg_q20)} m/s² — note how small this is compared to either individual phase, since the two phases partly cancel each other out. Common mistake: averaging the two PHASE accelerations ((+3.0 and −2.0 m/s² over each window) → (3.0+(−2.0))/2 = 0.50 m/s²) rather than correctly using only the overall first and last velocities with the TOTAL time — these happen to agree here only because the two windows are equal in length.',
    answer=davg_q20, unit='m/s²',
    figure=fig('2.10', 'q20', 'motion', kind='velocity', points=[{'t': 0, 'y': 4.0}, {'t': 1.0, 'y': 7.0}, {'t': 2.0, 'y': 5.0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s'))


# ════════════════════════════════════════════════════════════════════════
# 2.11 Acceleration caused by gravity
# ════════════════════════════════════════════════════════════════════════
add('2.11', 'F', 'In the absence of air resistance, do a heavy object and a light object dropped from the same height reach the ground at the same time?',
    'Yes — without air resistance, every object near Earth’s surface accelerates downward at the same rate, g ≈ 9.81 m/s², regardless of its mass. This is because gravitational force increases with mass in exactly the same proportion as the resistance to acceleration (inertia) does, so the two effects cancel. Common mistake: assuming heavier objects must fall faster, based on everyday experience with air resistance (which affects light, large-surface-area objects like feathers far more than dense ones like hammers).',
    kind='multiple_choice',
    options=['Yes — both accelerate at the same rate, g, regardless of mass', 'No — the heavier object always falls faster', 'No — the lighter object always falls faster',
             'It depends only on their colours'],
    correct_idx=0)

v_f2 = G * 2.0
add('2.11', 'F', 'An object is dropped from rest. Calculate its velocity after falling for 2.0 s (take g = 9.81 m/s²).',
    f'v = u + at = 0 + 9.81×2.0 = {sf(v_f2)} m/s. Common mistake: forgetting that "dropped from rest" means u = 0, and instead treating 2.0 as if it were a given initial velocity.',
    answer=v_f2, unit='m/s', figure=fig('2.11', 'f2', 'motion', kind='velocity', points=[{'t': 0, 'y': 0}, {'t': 2.0, 'y': v_f2}], xLabel='time', yLabel='speed', xUnit='s', yUnit='m/s'))

s_f3 = 0.5 * G * 3.0**2
add('2.11', 'F', 'An object is dropped from rest. Calculate the distance it falls in 3.0 s (take g = 9.81 m/s²).',
    f's = ut + ½at² = 0 + ½×9.81×3.0² = {sf(s_f3)} m. Common mistake: forgetting to square the time before multiplying by ½g.',
    answer=s_f3, unit='m', figure=fig('2.11', 'f3', 'balldrop', heights=[s_f3]))

add('2.11', 'F', 'In which direction does the acceleration due to gravity, g, act near the Earth’s surface?',
    'Vertically downward, towards the centre of the Earth, at every point near the surface. Common mistake: assuming g only "acts" while an object is actually falling — it acts on any object at all times (even one held stationary, or thrown upward), it is just that other forces can balance it in those cases.',
    kind='multiple_choice', options=['Vertically downward, towards the centre of the Earth', 'Vertically upward', 'Horizontally', 'In the direction the object happens to be moving'], correct_idx=0)

v_f5 = G * 1.5
add('2.11', 'F', 'An object is dropped from rest. Calculate its velocity after 1.5 s (take g = 9.81 m/s²).',
    f'v = 0 + 9.81×1.5 = {sf(v_f5)} m/s. Common mistake: rounding g to 10 m/s² when the question expects the more precise value (9.81 m/s²) to be used throughout.',
    answer=v_f5, unit='m/s')

add('2.11', 'F', 'Does the acceleration due to gravity, g, depend on the mass of the falling object (ignoring air resistance)?',
    'No — g is the same for every object near the Earth’s surface, regardless of its mass, as long as air resistance can be ignored. Common mistake: confusing the ACCELERATION (the same for all masses) with the FORCE of gravity (the object’s weight), which is different for different masses — a bigger mass needs a bigger force to give it the SAME acceleration.',
    kind='multiple_choice', options=['No — g is independent of mass', 'Yes — heavier objects have a larger g', 'Yes — lighter objects have a larger g', 'g depends on an object’s colour, not its mass'],
    correct_idx=0)

t_q7 = sqrt(2 * 20 / G)
add('2.11', 'I', 'A ball is dropped from rest. Calculate the time it takes to fall 20 m (take g = 9.81 m/s²).',
    f's = ½gt², so t = √(2s/g) = √(2×20 ÷ 9.81) = √{sf(2 * 20 / G)} = {sf(t_q7)} s. Common mistake: forgetting to take the square root at the end, and giving t² as the final answer.',
    answer=t_q7, unit='s', figure=fig('2.11', 'q7', 'balldrop', heights=[20]))

add('2.11', 'I', 'A feather and a hammer are dropped together from the same height. In air, the hammer reaches the ground first, but in a vacuum chamber they land at exactly the same time. Explain this difference.',
    'In air, the feather experiences a much larger air resistance RELATIVE to its weight (because of its large surface area and small mass), which significantly slows its fall compared with the denser hammer. In a vacuum, there is no air resistance acting on either object, so both accelerate at exactly g and land together — this was famously demonstrated on the Moon, which has no atmosphere. Common mistake: concluding that gravity itself is "different" for the feather and the hammer, rather than recognising that it is air resistance (an entirely separate force) that causes the difference seen in air.',
    kind='multiple_choice',
    options=['Air resistance affects the feather proportionally far more than the hammer; in a vacuum there is no air resistance, so both fall at the same rate g',
             'Gravity itself pulls harder on the hammer', 'The feather has a smaller value of g acting on it', 'The hammer is magnetic and the floor attracts it'],
    correct_idx=0)

v_q9 = 5 + G * 2.0
add('2.11', 'I', 'An object is thrown straight down with an initial speed of 5.0 m/s. Calculate its speed after a further 2.0 s (take g = 9.81 m/s²).',
    f'Taking downward as positive: v = u + gt = 5.0 + 9.81×2.0 = {sf(v_q9)} m/s. Common mistake: treating this as starting from rest (u = 0) and ignoring the given initial downward speed of 5.0 m/s.',
    answer=v_q9, unit='m/s',
    figure=fig('2.11', 'q9', 'motion', kind='velocity', points=[{'t': 0, 'y': 5.0}, {'t': 2.0, 'y': v_q9}], xLabel='time', yLabel='speed', xUnit='s', yUnit='m/s'))

t_top_q10 = 10 / G
add('2.11', 'I', 'A ball is thrown vertically upward at 10 m/s. Calculate the time taken to reach its highest point (take g = 9.81 m/s², up positive).',
    f'At the highest point, v = 0: 0 = u − gt, so t = u/g = 10 ÷ 9.81 = {sf(t_top_q10)} s. Common mistake: using g as +9.81 instead of recognising it decelerates the upward motion, which is equivalent to using a = −9.81 m/s² if up is taken as positive.',
    answer=t_top_q10, unit='s',
    figure=fig('2.11', 'q10', 'motion', kind='velocity', points=[{'t': 0, 'y': 10}, {'t': t_top_q10, 'y': 0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', hRefLines=[0]))

add('2.11', 'I', 'At the very top of its flight, a ball thrown vertically upward has zero velocity. Is its acceleration also zero at that instant?',
    'No — gravity acts continuously throughout the flight, so the ball’s acceleration is still g, directed downward, even at the single instant its velocity happens to be zero. This is exactly why the ball does not simply hover there, but immediately begins to fall. Common mistake: assuming the ball’s acceleration must also momentarily vanish simply because its velocity does.',
    kind='multiple_choice',
    options=['No — its acceleration is still g, downward, throughout the entire flight including the highest point', 'Yes — zero velocity always means zero acceleration',
             'No — the acceleration briefly reverses to become upward', 'Yes, because gravity switches off at the highest point'],
    correct_idx=0)

h_q12 = 10**2 / (2 * G)
add('2.11', 'I', 'A ball is thrown vertically upward at 10 m/s. Calculate the maximum height it reaches above the throwing point (take g = 9.81 m/s²).',
    f'Using v² = u² − 2gh (v = 0 at the top): 0 = 10² − 2×9.81×h, so h = 10² ÷ (2×9.81) = {sf(h_q12)} m. Common mistake: using the WRONG equation (such as s = ut, which ignores the deceleration due to gravity entirely).',
    answer=h_q12, unit='m',
    figure=fig('2.11', 'q12', 'motion', kind='velocity', points=[{'t': 0, 'y': 10}, {'t': 10 / G, 'y': 0}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', shade={'t0': 0, 't1': 10 / G, 'label': f'h = {sf(h_q12)} m'}))

add('2.11', 'I', 'Taking upward as positive, a ball is thrown vertically upward at 12 m/s. Calculate its velocity at the moment it returns to the height from which it was thrown.',
    'By the symmetry of motion under constant acceleration, an object returning to its STARTING height has a velocity of exactly the same MAGNITUDE as its initial velocity, but in the OPPOSITE direction: −12 m/s. Common mistake: assuming the ball must arrive back more slowly because "it has used up energy against gravity" — with no air resistance, the speed on return exactly equals the speed it was thrown with.',
    answer=-12.0, unit='m/s', sign_sensitive=True)

v50_q14 = sqrt(2 * G * 50)
v100_q14 = sqrt(2 * G * 100)
add('2.11', 'C', 'A ball is dropped from rest from a 50 m cliff. (a) Calculate the time to reach the ground. (b) Calculate its impact speed. (c) If the ball were instead dropped from DOUBLE the height (100 m), would its impact speed also double? Calculate the actual impact speed from 100 m and compare. Give only the answer to (c).',
    f'(a) t = √(2×50 ÷ 9.81) = {sf(sqrt(2 * 50 / G))} s. (b) v = √(2×9.81×50) = {sf(v50_q14)} m/s. (c) From 100 m: v = √(2×9.81×100) = {sf(v100_q14)} m/s — this is NOT double {sf(v50_q14)} m/s (which would be {sf(2 * v50_q14)} m/s); it is only larger by a factor of √2, since v ∝ √h, not v ∝ h. Common mistake: assuming impact speed is directly proportional to drop height, when the SUVAT relationship v² = 2gh actually makes speed proportional to the SQUARE ROOT of height.',
    answer=v100_q14, unit='m/s', figure=fig('2.11', 'q14', 'balldrop', heights=[50, 100]))

t_top_q15 = 15 / G
h_max_q15 = 15**2 / (2 * G)
a_c, b_c, c_c = 4.905, -15, -20
t_total_q15 = (-b_c + sqrt(b_c**2 - 4 * a_c * c_c)) / (2 * a_c)
add('2.11', 'C', 'A ball is thrown upward at 15 m/s from the edge of a 20 m cliff, and falls all the way to the ground below. (a) Calculate the time to reach the highest point. (b) Calculate the maximum height above the throwing point. (c) Calculate the TOTAL time from being thrown until it hits the ground (20 m below the throwing point). Give only the answer to (c).',
    f'(a) t = u/g = 15 ÷ 9.81 = {sf(t_top_q15)} s. (b) h = u² ÷ 2g = 15² ÷ (2×9.81) = {sf(h_max_q15)} m. (c) Taking up as positive, the ground is at displacement −20 m: −20 = 15t − ½×9.81×t², a quadratic in t. Solving 4.905t²−15t−20 = 0 with the quadratic formula gives t = {sf(t_total_q15)} s (taking the positive root). Common mistake: trying to use only s = ½gt² (which assumes the ball starts from rest) and ignoring the ball’s substantial initial upward velocity.',
    answer=t_total_q15, unit='s',
    figure=fig('2.11', 'q15', 'motion', kind='velocity', points=[{'t': 0, 'y': 15}, {'t': t_top_q15, 'y': 0}, {'t': t_total_q15, 'y': 15 - G * t_total_q15}], xLabel='time', yLabel='velocity', xUnit='s', yUnit='m/s', hRefLines=[0]))

vA_q16 = G * 0.5
sA_q16 = 0.5 * G * 1.0**2
sB_q16 = 0.5 * G * 0.5**2
sep_q16 = sA_q16 - sB_q16
add('2.11', 'C', 'Ball A is dropped from rest from a tall tower. Exactly 0.50 s later, ball B is dropped from the SAME point. (a) Calculate ball A’s velocity at the moment B is dropped. (b) Calculate the separation between A and B at the moment 1.0 s after A was dropped (which is 0.50 s after B was dropped). Give only the answer to (b).',
    f'(a) v_A = g×0.50 = {sf(vA_q16)} m/s. (b) At t = 1.0 s (measuring from when A was dropped): A has fallen s_A = ½×9.81×1.0² = {sf(sA_q16)} m. B, dropped 0.50 s later, has at this moment been falling for only 0.50 s: s_B = ½×9.81×0.50² = {sf(sB_q16)} m. Separation = {sf(sA_q16)} − {sf(sB_q16)} = {sf(sep_q16)} m. Common mistake: giving both balls the same 1.0 s of falling time, forgetting that B started 0.50 s later and so has only been falling for 0.50 s at this moment.',
    answer=sep_q16, unit='m',
    figure=fig('2.11', 'q16', 'balldrop', heights=[sB_q16, sA_q16]))

a1_q17 = 19.4 / 2
a2_q17 = 5.2 / 2
add('2.11', 'C', 'A skydiver’s speed is recorded as: t = 0, 2, 4, 6, 8 s; v = 0, 19.4, 36.9, 47.8, 53.0 m/s (the increases per 2 s interval are 19.4, 17.5, 10.9, 5.2 m/s — clearly shrinking). (a) Calculate the acceleration during the first 2 s. (b) Calculate the acceleration during the last 2 s. (c) Explain the physical reason for this decrease. Give only the answer to (b).',
    f'(a) a = 19.4 ÷ 2.0 = {sf(a1_q17)} m/s² — very close to g, as expected before air resistance becomes significant at low speed. (b) a = 5.2 ÷ 2.0 = {sf(a2_q17)} m/s², much smaller. (c) As the skydiver’s speed increases, air resistance (drag) increases too, opposing gravity more and more and reducing the net downward force, and hence the acceleration — this is how a skydiver eventually approaches a constant terminal velocity. Common mistake: assuming g itself must be changing during the fall, rather than recognising that an ADDITIONAL force (air resistance) is increasingly opposing gravity.',
    answer=a2_q17, unit='m/s²',
    figure=fig('2.11', 'q17', 'table', headers=['t / s', '0', '2', '4', '6', '8'], rows=[['v / m/s', '0', '19.4', '36.9', '47.8', '53.0']]))

h_q18 = 8.0**2 / (2 * G)
v_impact_q18 = sqrt(8.0**2 + 2 * G * 15)
add('2.11', 'C', 'A ball is thrown upward at 8.0 m/s from a window 15 m above the ground, and falls all the way to the ground. (a) Calculate the maximum height reached above the window. (b) Calculate the speed of impact with the ground, using v² = u² + 2gs with s = 15 m (the total distance fallen from the highest point back down past the window to the ground, consistent with v²=u²-2g(−15) measuring from the throw). Give only the answer to (b).',
    f'(a) h = u² ÷ 2g = 8.0² ÷ (2×9.81) = {sf(h_q18)} m above the window. (b) Using v² = u² + 2gs measured from the throw point down to the ground 15 m below (s = 15 m downward, same direction as g): v² = 8.0² + 2×9.81×15 = 64 + 294.3 = {sf(64 + 2 * G * 15)}, so v = √{sf(64 + 2 * G * 15)} = {sf(v_impact_q18)} m/s. Common mistake: trying to add the height risen (a) to the 15 m window height and using THAT total distance with u = 0, rather than correctly using the full displacement from the original throw point with the ball’s actual initial velocity of 8.0 m/s upward.',
    answer=v_impact_q18, unit='m/s')

t_return_q19 = 2 * 18 / G
add('2.11', 'S', 'Show that for an object thrown vertically upward at speed u, the time to return to its STARTING height is exactly 2u/g, and that its velocity on return has magnitude u but the opposite sign to the initial throw. Verify for u = 18 m/s.',
    f'Taking up as positive and the throw point as s = 0: s = ut − ½gt². Setting s = 0 (other than the trivial t=0 solution): 0 = t(u−½gt), so the nonzero solution is t = 2u/g. Substituting into v = u−gt: v = u − g×(2u/g) = u−2u = −u, confirming the velocity on return is exactly reversed. For u = 18 m/s: t = 2×18 ÷ 9.81 = {sf(t_return_q19)} s, and v = −18 m/s on return. Common mistake: solving 0 = ut−½gt² by dividing through by t too early, which discards the t = 0 solution but can also lead to sign errors if not handled carefully.',
    answer=t_return_q19, unit='s')

t_moon_q20 = sqrt(2 * 2.0 / 1.62)
t_earth_q20 = sqrt(2 * 2.0 / G)
diff_q20 = t_moon_q20 - t_earth_q20
add('2.11', 'S', "On the Moon, g is about 1.62 m/s² (roughly 1/6 of Earth's 9.81 m/s²). An astronaut drops a tool from a height of 2.0 m. (a) Calculate the time to fall on the Moon. (b) Calculate how much LONGER this takes compared with the same drop on Earth. Give only the answer to (b).",
    f'(a) t_Moon = √(2×2.0 ÷ 1.62) = {sf(t_moon_q20)} s. (b) t_Earth = √(2×2.0 ÷ 9.81) = {sf(t_earth_q20)} s. Difference = {sf(t_moon_q20)} − {sf(t_earth_q20)} = {sf(diff_q20)} s. Common mistake: assuming the fall takes exactly 6 times as long on the Moon (matching the 6× smaller g) — because t ∝ 1/√g, not 1/g, the time only increases by a factor of √6 ≈ 2.45, not 6.',
    answer=diff_q20, unit='s')


# ════════════════════════════════════════════════════════════════════════
# 2.12 Determining g
# ════════════════════════════════════════════════════════════════════════
add('2.12', 'F', 'In the simplest laboratory method for determining g, an object is dropped from rest through a measured height s, and the time t is recorded. Which rearrangement of s = ½gt² gives g?',
    'Rearranging s = ½gt² for g: multiply both sides by 2 and divide by t², giving g = 2s/t². Common mistake: forgetting to square t in the rearranged formula, and using g = 2s/t instead.',
    kind='multiple_choice', options=['g = 2s/t²', 'g = s/(2t²)', 'g = 2s/t', 'g = s²/(2t)'], correct_idx=0)

g_f2 = 2 * 2.00 / 0.639**2
add('2.12', 'F', 'An object falls 2.00 m from rest in 0.639 s. Calculate g using g = 2s/t².',
    f'g = 2×2.00 ÷ 0.639² = 4.00 ÷ 0.408 = {sf(g_f2)} m/s², close to the accepted value of 9.81 m/s². Common mistake: forgetting to square 0.639 before dividing.',
    answer=g_f2, unit='m/s²', figure=fig('2.12', 'f2', 'balldrop', heights=[2.00]))

add('2.12', 'F', 'Why is a free-fall timing typically repeated several times, with the results averaged, when determining g?',
    'Repeating the timing and averaging reduces the effect of RANDOM variations (such as slight inconsistencies in exactly when the object is released or the timer started/stopped), giving a more reliable final value of g than any single timing alone. Common mistake: believing one single, carefully-taken reading is just as good as an average of several repeats.',
    kind='multiple_choice',
    options=['It reduces the effect of random timing variation, giving a more reliable mean time', 'It has no effect on the reliability of the result',
             'It removes any systematic error in the measured height', 'Repeating always doubles the precision exactly'],
    correct_idx=0)

g_f4 = 2 * 1.50 / 0.555**2
add('2.12', 'F', 'An object falls 1.50 m from rest in 0.555 s. Calculate g.',
    f'g = 2×1.50 ÷ 0.555² = 3.00 ÷ 0.308 = {sf(g_f4)} m/s². Common mistake: using the height in the wrong place in the formula (e.g. g = 2t²/s), which would give a completely different and meaningless number.',
    answer=g_f4, unit='m/s²')

add('2.12', 'F', 'In the graphical method for determining g, s (the height fallen) is plotted against t² (rather than against t). Why does this give a straight line, and what does its gradient represent?',
    'Since s = ½gt², plotting s against t² gives a straight line THROUGH THE ORIGIN (because s = ½g × (t²), which has the form y = mx with no constant term), whose gradient is ½g. Common mistake: plotting s against t directly, which gives a CURVE (a parabola), not a straight line, making the gradient much harder to measure accurately.',
    kind='multiple_choice',
    options=['A straight line through the origin, with gradient ½g', 'A straight line with gradient g, not through the origin', 'A curve, since s and t² are unrelated', 'A straight line with gradient 2g'],
    correct_idx=0)

g_f6 = 2 * 4.90
add('2.12', 'F', 'A graph of s against t² for a falling object has a gradient of 4.90 m/s². Calculate g.',
    f'Since gradient = ½g, g = 2 × gradient = 2×4.90 = {sf(g_f6)} m/s². Common mistake: quoting the gradient itself (4.90 m/s²) as g, forgetting the factor of ½ in s = ½gt².',
    answer=g_f6, unit='m/s²')

grad_q7 = (4.9 - 2.3) / (1.0 - 0.5)
g_q7 = 2 * grad_q7
add('2.12', 'I', 'Two points on an s against t² graph are (t² = 0.50 s², s = 2.3 m) and (t² = 1.0 s², s = 4.9 m). Calculate the gradient between these points, and hence estimate g.',
    f'gradient = (4.9−2.3) ÷ (1.0−0.50) = 2.6 ÷ 0.50 = {sf(grad_q7)} m/s². g = 2 × gradient = 2×{sf(grad_q7)} = {sf(g_q7)} m/s² (a bit above the accepted value, reflecting the inevitable scatter in real experimental data from just two points). Common mistake: using t (not t²) as the horizontal axis value in the gradient calculation.',
    answer=g_q7, unit='m/s²', tolerance=0.1)

add('2.12', 'I', 'A simple free-fall experiment to determine g tends to give a value slightly LOWER than the accepted 9.81 m/s². What is the most likely cause?',
    'Air resistance acts on the falling object throughout its drop, opposing its motion and slightly reducing its acceleration below the true value of g — this is a systematic effect that always acts in the same direction (reducing the measured value), however carefully the experiment is repeated. Common mistake: assuming repeating the experiment more times and taking a better average would fix this — a SYSTEMATIC effect like air resistance is not reduced by averaging repeated readings.',
    kind='multiple_choice',
    options=['Air resistance opposes the fall, systematically reducing the measured acceleration below true g', 'The timer runs systematically too fast',
             'Gravity is weaker in a laboratory than elsewhere', 'The object’s mass systematically increases as it falls'],
    correct_idx=0)

g_q9 = 2.45 / sin(radians(15))
add('2.12', 'I', 'In a trolley-on-a-ramp method, a trolley’s acceleration down a ramp inclined at 15° to the horizontal is measured as 2.45 m/s². Using a = g sinθ (the component of g acting along the slope), estimate g.',
    f'g = a ÷ sinθ = 2.45 ÷ sin15° = 2.45 ÷ {sf(sin(radians(15)))} = {sf(g_q9)} m/s². This ramp method deliberately slows the "effective" acceleration down to something easier to time accurately, at the cost of needing an accurate angle measurement too. Common mistake: using cosθ instead of sinθ — the component of gravity ALONG a slope uses sin of the angle from the horizontal.',
    answer=g_q9, unit='m/s²')

add('2.12', 'I', 'Why would light gates connected to an electronic timer give a more accurate value of g than a hand-operated stopwatch, in a free-fall experiment?',
    'A typical free fall over a metre or so lasts well under half a second — comparable to, or shorter than, typical human reaction time (around 0.2–0.3 s). Light gates trigger and stop the timing electronically, with no human reaction-time delay at all, making the measured time (and hence g) far more accurate. Common mistake: assuming a stopwatch is "accurate enough" for any timing task, without considering whether the EVENT being timed is itself comparable in length to typical reaction times.',
    kind='multiple_choice',
    options=['Light gates remove human reaction-time error, which would otherwise be comparable to the whole fall time', 'Light gates measure a completely different physical quantity from a stopwatch',
             'Stopwatches are always more accurate for very short events', 'There is no real difference between the two methods'],
    correct_idx=0)

times_q11 = [0.640, 0.638, 0.642, 0.639, 0.641]
mean_q11 = sum(times_q11) / len(times_q11)
add('2.12', 'I', 'Five repeated timings for the same fall give: 0.640, 0.638, 0.642, 0.639, 0.641 s. Calculate the mean time.',
    f'mean = ({"+".join(str(t) for t in times_q11)}) ÷ 5 = {sf(sum(times_q11))} ÷ 5 = {sf(mean_q11)} s. Common mistake: using the median or a single "typical-looking" value instead of properly averaging all five readings.',
    answer=mean_q11, unit='s', figure=fig('2.12', 'q11', 'table', headers=['Reading', '1', '2', '3', '4', '5'], rows=[['t / s', '0.640', '0.638', '0.642', '0.639', '0.641']]))

g_q12 = 2 * 2.00 / mean_q11**2
add('2.12', 'I', 'Using the mean time found previously (0.640 s) for a fall of height 2.00 m, calculate g.',
    f'g = 2×2.00 ÷ 0.640² = 4.00 ÷ 0.4096 = {sf(g_q12)} m/s². Common mistake: using one of the INDIVIDUAL raw timings instead of the properly-calculated mean of all five readings.',
    answer=g_q12, unit='m/s²')

add('2.12', 'I', 'Why is the graphical method (plotting several s against t² points and finding the gradient of a best-fit line) generally more reliable than calculating g from just ONE height-and-time measurement?',
    'A single measurement is fully exposed to whatever random error affected that one particular reading. A graph uses MANY data points, and a best-fit line effectively averages out the scatter from random errors across all of them — and a clearly anomalous point also becomes visible and can be investigated, which is impossible with only one reading. Common mistake: assuming more data points automatically guarantees a more accurate result REGARDLESS of how they are analysed — the benefit specifically comes from fitting a line through the scatter, not simply from having "more numbers".',
    kind='multiple_choice',
    options=['A best-fit line through several points averages out random scatter, and reveals anomalous points', 'There is no real advantage; a single measurement is just as reliable',
             'It completely removes all systematic errors automatically', 'It only works if every single point lies exactly on the line'],
    correct_idx=0)

t2_q14 = [0.10, 0.20, 0.30, 0.40, 0.50]
s_q14 = [0.49, 0.98, 1.47, 1.96, 2.45]
grad_q14 = (s_q14[-1] - s_q14[0]) / (t2_q14[-1] - t2_q14[0])
g_q14 = 2 * grad_q14
add('2.12', 'C', 'An s against t² graph has data points: t² = 0.10, 0.20, 0.30, 0.40, 0.50 s²; s = 0.49, 0.98, 1.47, 1.96, 2.45 m. (a) Calculate the gradient, using the first and last points. (b) Calculate g. (c) Compare your value of g with the accepted value, 9.81 m/s². Give only the answer to (b).',
    f'(a) gradient = ({s_q14[-1]}−{s_q14[0]}) ÷ ({t2_q14[-1]}−{t2_q14[0]}) = {sf(s_q14[-1] - s_q14[0])} ÷ {sf(t2_q14[-1] - t2_q14[0])} = {sf(grad_q14)} m/s². (b) g = 2 × gradient = 2×{sf(grad_q14)} = {sf(g_q14)} m/s². (c) This matches the accepted value of 9.81 m/s² almost exactly — this data set is perfectly consistent with s = ½gt² (each point lies exactly on the line through the origin). Common mistake: using only ONE of the five data points (together with the origin) instead of the full line’s gradient, which throws away the benefit of having multiple readings.',
    answer=g_q14, unit='m/s²',
    figure=fig('2.12', 'q14', 'table', headers=['t² / s²', '0.10', '0.20', '0.30', '0.40', '0.50'], rows=[['s / m', '0.49', '0.98', '1.47', '1.96', '2.45']]))

g_q15 = 2 * 4.85
uncg_q15 = 2 * 0.08
add('2.12', 'C', 'A graph of s against t² has a best-fit gradient of 4.85 ± 0.08 m/s². (a) Calculate g. (b) Calculate the absolute uncertainty in g. Give only the answer to (b).',
    f'(a) g = 2 × 4.85 = {sf(g_q15)} m/s². (b) Since g is exactly DOUBLE the gradient, the absolute uncertainty also doubles: uncertainty in g = 2 × 0.08 = {sf(uncg_q15)} m/s², so g = {sf(g_q15)} ± {sf(uncg_q15)} m/s². Common mistake: quoting the gradient’s own uncertainty (0.08 m/s²) as if it were already the uncertainty in g, forgetting the factor of 2 relating gradient to g.',
    answer=uncg_q15, unit='m/s²')

lowA, highA = 9.75 - 0.15, 9.75 + 0.15
lowB, highB = 9.95 - 0.10, 9.95 + 0.10
overlap_q16 = min(highA, highB) - max(lowA, lowB)
add('2.12', 'C', 'Method A gives g = 9.75 ± 0.15 m/s². Method B gives g = 9.95 ± 0.10 m/s². (a) Write out the range of values each method is consistent with. (b) Determine whether the two results agree with each other, and calculate the width of the range over which both results overlap.',
    f'(a) Method A is consistent with {sf(lowA)} to {sf(highA)} m/s². Method B is consistent with {sf(lowB)} to {sf(highB)} m/s². (b) These two ranges DO overlap, between {sf(max(lowA, lowB))} and {sf(min(highA, highB))} m/s², a width of {sf(overlap_q16)} m/s² — so the two methods are consistent with each other within their stated uncertainties, even though their single "best" values (9.75 and 9.95) are different. Common mistake: concluding the two results disagree simply because their quoted central values are different, without checking whether their UNCERTAINTY RANGES actually overlap.',
    answer=overlap_q16, unit='m/s²')

g_vals_q17 = [2 * 2.000 / t**2 for t in [0.640, 0.637, 0.643]]
mean_g_q17 = sum(g_vals_q17) / 3
pctdiff_q17 = (9.81 - mean_g_q17) / 9.81 * 100
add('2.12', 'C', 'A student determines g three times by timing a 2.000 m fall: 0.640 s, 0.637 s, 0.643 s. (a) Calculate g for each timing. (b) Calculate the mean g. (c) Calculate the percentage difference between the mean and the accepted value, 9.81 m/s². Give only the answer to (c).',
    f'(a) g values: 2×2.000÷0.640²={sf(g_vals_q17[0])}, 2×2.000÷0.637²={sf(g_vals_q17[1])}, 2×2.000÷0.643²={sf(g_vals_q17[2])} m/s². (b) mean = ({sf(g_vals_q17[0])}+{sf(g_vals_q17[1])}+{sf(g_vals_q17[2])}) ÷ 3 = {sf(mean_g_q17)} m/s². (c) percentage difference = (9.81−{sf(mean_g_q17)}) ÷ 9.81 × 100% = {sf(pctdiff_q17)}%. Common mistake: averaging the three TIMES first and calculating g only once from that single mean time, rather than calculating g separately for each timing and THEN averaging the resulting g values (both approaches are common in practice, but this question specifically asks for the latter).',
    answer=pctdiff_q17, unit='%')

g_wrong_q18 = 2 * 1.99 / 0.639**2
g_true_q18 = 2 * 2.00 / 0.639**2
add('2.12', 'C', 'A student’s ruler is worn, causing every height measurement to read 1.0 cm too SHORT. A true height of 2.00 m is recorded (wrongly) as 1.99 m; the timing, 0.639 s, is unaffected by this error. (a) Calculate the g value obtained using the WRONG (recorded) height. (b) Calculate the g value using the TRUE height. (c) Comment on the direction of the resulting error in (a). Give only the answer to (b).',
    f'(a) Using the recorded (too-short) height: g = 2×1.99 ÷ 0.639² = {sf(g_wrong_q18)} m/s². (b) Using the true height: g = 2×2.00 ÷ 0.639² = {sf(g_true_q18)} m/s². (c) The recorded (wrong) height gives a SMALLER value of g than the true height does — a systematic error that shortens the measured distance will always systematically UNDERESTIMATE g, since g is directly proportional to the (wrongly too-small) height used. Common mistake: assuming a small 1.0 cm measurement error in a 2 m height is too small to matter — it still introduces a small but entirely systematic (one-directional) shift in every result calculated from it.',
    answer=g_true_q18, unit='m/s²', figure=fig('2.12', 'q18', 'balldrop', heights=[1.99, 2.00]))

unc_q19 = (4.95 - 4.88) / 4.88 * 100
add('2.12', 'S', 'In the s against t² method, explain why the gradient of the graph equals ½g, not g itself. A best-fit line through a data set has gradient 4.88 m/s², while the steepest acceptable line through the error bars (the "worst-fit" line) has gradient 4.95 m/s². Estimate the percentage uncertainty in g from this comparison.',
    f'Since s = ½gt² has the form (quantity plotted on y) = (constant) × (quantity plotted on x), with the constant being ½g, the gradient of a straight-line s-against-t² graph is exactly ½g — this is why the calculated g must always be DOUBLE the measured gradient. The spread between the best-fit and worst-fit gradients gives an estimate of the uncertainty in the gradient (and hence, since doubling a quantity does not change its PERCENTAGE uncertainty, in g too): percentage uncertainty ≈ (4.95−4.88) ÷ 4.88 × 100% = {sf(unc_q19)}%. Common mistake: assuming the gradient itself IS g, rather than half of it, which would give a final g value exactly double the correct one.',
    answer=unc_q19, unit='%')

diff_q20 = 9.812 - 9.76
widths_q20 = diff_q20 / 0.12
add('2.12', 'S', "A pendulum method gives g = 9.76 ± 0.12 m/s², and a free-fall method on the same day gives 9.85 ± 0.08 m/s². A more precise laboratory result elsewhere quotes g = 9.812 m/s² (with negligible uncertainty). (a) State which student method agrees better with the precise value, and why. (b) Calculate how many of the pendulum method's own uncertainty-widths (0.12 m/s²) the precise value sits away from the pendulum's own measured value. Give only the answer to (b).",
    f'(a) The free-fall result (9.85 ± 0.08) is closer in absolute terms to 9.812, and 9.812 actually falls WITHIN its uncertainty range (9.77 to 9.93); the pendulum result (9.76 ± 0.12) also brackets 9.812 within its range (9.64 to 9.88), so both are arguably consistent, but the free-fall result pins the value down more tightly (smaller uncertainty). (b) Difference from the pendulum’s own value: 9.812 − 9.76 = {sf(diff_q20)} m/s². In units of the pendulum’s own uncertainty (0.12 m/s²): {sf(diff_q20)} ÷ 0.12 = {sf(widths_q20)} — well under 1, confirming good agreement. Common mistake: judging agreement between an experimental result and an accepted value using only the raw numerical difference, without expressing that difference relative to the experiment’s own stated uncertainty.',
    answer=widths_q20, unit='', tolerance=0.1)


# ════════════════════════════════════════════════════════════════════════
# 2.13 Motion in two dimensions: projectiles
# ════════════════════════════════════════════════════════════════════════
add('2.13', 'F', 'In projectile motion with no air resistance, how are the horizontal and vertical components of the motion related?',
    'They are completely INDEPENDENT of each other: the horizontal velocity stays constant throughout (no horizontal force acts), while the vertical motion accelerates downward at g, exactly as if it were simple free fall — neither component affects the other at all. Common mistake: assuming the vertical fall must somehow "use up" some of the horizontal motion, or that a faster horizontal launch makes an object fall more slowly.',
    kind='multiple_choice',
    options=['They are independent — horizontal velocity stays constant, vertical motion is simple free fall', 'The vertical motion slows down the horizontal motion',
             'The horizontal motion slows down the vertical motion', 'They must always be numerically equal'],
    correct_idx=0)

t_f2 = sqrt(2 * 1.0 / G)
add('2.13', 'F', 'A ball is launched horizontally at 15 m/s from a table 1.0 m high. Calculate the time taken to reach the ground.',
    f'The vertical motion is independent of the horizontal launch speed: it is simple free fall from rest (vertically), so 1.0 = ½×9.81×t², giving t = √(2×1.0 ÷ 9.81) = {sf(t_f2)} s. Common mistake: trying to use the 15 m/s horizontal speed anywhere in this calculation — the time to fall depends ONLY on the height and g, not on how fast the ball is moving horizontally.',
    answer=t_f2, unit='s', figure=fig('2.13', 'f2', 'projectile', u=15, angleDeg=0, launchHeight=1.0, showLaunchComponents=False))

x_f3 = 15 * t_f2
add('2.13', 'F', 'Using the time found previously (0.4515 s) for the ball launched horizontally at 15 m/s from a 1.0 m table, calculate the horizontal range.',
    f'Horizontal motion has constant velocity (no horizontal acceleration): range = horizontal speed × time = 15 × {sf(t_f2)} = {sf(x_f3)} m. Common mistake: trying to apply a SUVAT acceleration equation to the horizontal motion, when the horizontal acceleration is exactly zero throughout the flight.',
    answer=x_f3, unit='m')

add('2.13', 'F', 'During a projectile’s flight (no air resistance), what happens to the horizontal component of its velocity?',
    'It remains exactly constant throughout the whole flight, since no force acts horizontally (gravity acts only vertically). Common mistake: assuming the horizontal velocity must decrease as the object rises, or increase as it falls, confusing it with the VERTICAL component (which does change).',
    kind='multiple_choice', options=['It stays constant throughout the flight', 'It decreases steadily to zero', 'It increases as the object falls', 'It becomes zero at the highest point'], correct_idx=0)

vy_f5 = G * 2.0
add('2.13', 'F', 'A ball undergoes projectile motion, launched horizontally. Calculate the magnitude of its vertical velocity component 2.0 s after launch.',
    f'The vertical motion is simple free fall from vertical rest: v_y = gt = 9.81×2.0 = {sf(vy_f5)} m/s. Common mistake: including any horizontal speed in this calculation — the vertical component only ever depends on g and the time since launch (for a HORIZONTAL launch, where the initial vertical velocity is zero).',
    answer=vy_f5, unit='m/s')

x_f6 = 8.0 * 0.5
add('2.13', 'F', 'A ball is launched horizontally at 8.0 m/s and is in the air for 0.50 s before landing. Calculate the horizontal distance travelled.',
    f'range = horizontal speed × time = 8.0 × 0.50 = {sf(x_f6)} m. Common mistake: trying to adjust this calculation for the vertical fall, when the horizontal distance depends only on the (constant) horizontal speed and the time of flight.',
    answer=x_f6, unit='m', figure=fig('2.13', 'f6', 'projectile', u=8.0, angleDeg=0, launchHeight=0.5 * G * 0.5**2, showLaunchComponents=False))

ux_q7 = 20 * cos(radians(30))
add('2.13', 'I', 'A projectile is launched at 20 m/s, at 30° above the horizontal. Calculate the horizontal component of its initial velocity.',
    f'u_x = u cosθ = 20×cos30° = 20×{sf(cos(radians(30)))} = {sf(ux_q7)} m/s. Common mistake: using sin30° instead of cos30° for the horizontal component.',
    answer=ux_q7, unit='m/s', figure=fig('2.13', 'q7', 'vector', vectors=[{'magnitude': 20, 'angleDeg': 30, 'label': '20 m/s'}], mode='fromOrigin'))

uy_q8 = 20 * sin(radians(30))
add('2.13', 'I', 'For the same projectile (20 m/s at 30° above the horizontal), calculate the vertical component of its initial velocity.',
    f'u_y = u sinθ = 20×sin30° = 20×{sf(sin(radians(30)))} = {sf(uy_q8)} m/s. Common mistake: swapping sin and cos, which would give the vertical component as 17.3 m/s (the horizontal value) instead.',
    answer=uy_q8, unit='m/s')

t_q9 = 2 * uy_q8 / G
add('2.13', 'I', 'The projectile (u_y = 10.0 m/s) is launched from and lands at the same height. Calculate the total time of flight, using the fact that the flight is symmetric about the highest point.',
    f'Time to the highest point (where v_y = 0): t_up = u_y/g = 10.0÷9.81 = {sf(uy_q8 / G)} s. By symmetry, the fall back down takes the same time, so total time of flight = 2 × t_up = 2u_y/g = 2×10.0÷9.81 = {sf(t_q9)} s. Common mistake: calculating only the time to the TOP of the flight and forgetting to double it for the full time of flight.',
    answer=t_q9, unit='s')

add('2.13', 'I', 'Why does a projectile launched with no air resistance follow a parabolic path?',
    'The horizontal position increases at a constant rate (constant horizontal velocity, so x = u_x t, which is linear in t), while the vertical position follows y = u_y t − ½gt² (quadratic in t, from the constant downward acceleration). Combining these (eliminating t) gives y as a quadratic function of x — exactly the equation of a parabola. Common mistake: thinking the parabolic SHAPE is some separate, additional physical assumption, rather than something that falls directly out of combining the two already-known types of motion (constant velocity, and constant acceleration).',
    kind='multiple_choice',
    options=['Because combining constant-velocity horizontal motion with constant-acceleration vertical motion mathematically produces a parabola when y is plotted against x',
             'Because air resistance curves the path into a parabola', 'Because gravity itself has a parabolic shape', 'Parabolic motion is simply assumed, with no underlying reason'],
    correct_idx=0)

x_q11 = ux_q7 * t_q9
add('2.13', 'I', 'For the same projectile (u_x = 17.3 m/s, time of flight 2.04 s), calculate the horizontal range.',
    f'range = u_x × t = 17.3 × 2.04 = {sf(x_q11)} m. Common mistake: using the vertical component, or the original launch speed (20 m/s) instead of its horizontal component, in this calculation.',
    answer=x_q11, unit='m',
    figure=fig('2.13', 'q11', 'projectile', u=20, angleDeg=30))

h_q12 = uy_q8**2 / (2 * G)
add('2.13', 'I', 'For the same projectile (u_y = 10.0 m/s), calculate the maximum height reached.',
    f'Using v² = u_y² − 2gh with v = 0 at the top: h = u_y² ÷ (2g) = 10.0² ÷ (2×9.81) = {sf(h_q12)} m. Common mistake: using the ORIGINAL launch speed (20 m/s) instead of only its vertical component in this height calculation.',
    answer=h_q12, unit='m')

add('2.13', 'I', 'At the highest point of a projectile’s trajectory (launched at an angle, not straight up), is its velocity exactly zero?',
    'No — only the VERTICAL component of velocity is zero at the highest point; the horizontal component is unaffected by gravity and continues at its original, constant value throughout the flight. So the projectile’s overall velocity at the top is horizontal, not zero. Common mistake: confusing this with a ball thrown STRAIGHT up (with no horizontal motion at all), where the velocity genuinely is zero at the top — that is a special case, not the general rule for an angled launch.',
    kind='multiple_choice',
    options=['No — only the vertical component is zero; the horizontal component is still the original launch value', 'Yes — the velocity is always exactly zero at the highest point',
             'No — the velocity is at its maximum at the highest point', 'Yes, but only if the projectile is heavier than air'],
    correct_idx=0)

t_q14 = sqrt(2 * 0.90 / G)
range_q14 = 4.0 * t_q14
vy_q14 = G * t_q14
v_q14 = hypot(4.0, vy_q14)
add('2.13', 'C', 'A ball rolls off a table 0.90 m high at 4.0 m/s (horizontal launch). (a) Calculate the time to reach the ground. (b) Calculate the horizontal range. (c) Calculate the speed at which it lands. Give only the answer to (c).',
    f'(a) t = √(2×0.90 ÷ 9.81) = {sf(t_q14)} s. (b) range = 4.0×{sf(t_q14)} = {sf(range_q14)} m. (c) At landing: v_x = 4.0 m/s (unchanged); v_y = g×{sf(t_q14)} = {sf(vy_q14)} m/s. Combining as vectors: v = √(4.0²+{sf(vy_q14)}²) = {sf(v_q14)} m/s. Common mistake: simply adding the horizontal and vertical speeds (4.0+{sf(vy_q14)}) instead of combining them as perpendicular vector components using Pythagoras.',
    answer=v_q14, unit='m/s',
    figure=fig('2.13', 'q14', 'projectile', u=4.0, angleDeg=0, launchHeight=0.90))

uy_q15 = 25 * sin(radians(40))
ux_q15 = 25 * cos(radians(40))
a_c15, b_c15, c_c15 = 4.905, -uy_q15, -15
t_q15 = (-b_c15 + sqrt(b_c15**2 - 4 * a_c15 * c_c15)) / (2 * a_c15)
range_q15 = ux_q15 * t_q15
add('2.13', 'C', 'A golf ball is launched at 25 m/s at 40° above the horizontal from a cliff edge, landing 15 m below the launch point. Calculate the horizontal range. (Hint: set up the vertical motion with the landing point at −15 m and solve the resulting quadratic for t, then use the horizontal component.)',
    f'Components: u_x = 25cos40° = {sf(ux_q15)} m/s, u_y = 25sin40° = {sf(uy_q15)} m/s. Vertically (up positive): −15 = {sf(uy_q15)}t − 4.905t², i.e. 4.905t² − {sf(uy_q15)}t − 15 = 0. Solving with the quadratic formula gives t = {sf(t_q15)} s (taking the positive root). Horizontal range = {sf(ux_q15)} × {sf(t_q15)} = {sf(range_q15)} m. Common mistake: using the time of flight formula for level ground (2u_y/g), which only applies when the landing height equals the launch height — here it is 15 m lower, so a full quadratic solution is needed.',
    answer=range_q15, unit='m',
    figure=fig('2.13', 'q15', 'projectile', u=25, angleDeg=40, launchHeight=15))

u_q16 = sqrt(40 * G / sin(radians(70)))
add('2.13', 'C', 'A ball is kicked at 35° above the horizontal on level ground and must travel exactly 40 m horizontally before landing. Using range = u²sin(2θ)/g (derived from the independence of horizontal and vertical motion), calculate the launch speed needed.',
    f'Rearranging R = u²sin(2θ)/g for u: u = √(Rg ÷ sin(2θ)) = √(40×9.81 ÷ sin70°) = √(392.4 ÷ {sf(sin(radians(70)))}) = √{sf(392.4 / sin(radians(70)))} = {sf(u_q16)} m/s. Common mistake: using sinθ (35°) instead of sin(2θ) = sin70° in the range formula — the angle inside the sine is DOUBLE the launch angle.',
    answer=u_q16, unit='m/s',
    figure=fig('2.13', 'q16', 'projectile', u=u_q16, angleDeg=35))

ux_q17 = (6.0 - 2.0) / (0.3 - 0.1)
add('2.13', 'C', 'A strobe photograph of a projectile records its horizontal position x at two times: x = 2.0 m at t = 0.10 s, and x = 6.0 m at t = 0.30 s. Calculate the horizontal component of the launch velocity.',
    f'Since horizontal velocity is constant throughout the flight, it can be found from any two readings: u_x = (6.0−2.0) ÷ (0.30−0.10) = 4.0 ÷ 0.20 = {sf(ux_q17)} m/s. This works because x increases LINEARLY with time for the horizontal component — exactly the behaviour of constant velocity. Common mistake: trying to use the readings’ absolute times (0.10 s, 0.30 s) directly as if x were proportional to t from t = 0, rather than correctly using the CHANGE in x over the CHANGE in t between the two readings.',
    answer=ux_q17, unit='m/s',
    figure=fig('2.13', 'q17', 'table', headers=['t / s', '0.10', '0.30'], rows=[['x / m', '2.0', '6.0']]))

ux_q18 = 45 / 2.5
h_q18 = 0.5 * G * 2.5**2
add('2.13', 'C', 'A stone is thrown horizontally from a cliff and lands 2.5 s later, 45 m from the base of the cliff. (a) Calculate the launch speed. (b) Calculate the height of the cliff. Give only the answer to (a).',
    f'(a) The horizontal motion has constant velocity: u = range ÷ time = 45 ÷ 2.5 = {sf(ux_q18)} m/s. (b) height = ½gt² = ½×9.81×2.5² = {sf(h_q18)} m. Common mistake: trying to use the cliff height (which is not yet known) to find the launch speed, rather than recognising the horizontal motion is self-contained and only needs the range and time.',
    answer=ux_q18, unit='m/s',
    figure=fig('2.13', 'q18', 'projectile', u=ux_q18, angleDeg=0, launchHeight=h_q18))

ratio_q19 = 25 * G / 18.0**2
twotheta_q19 = degrees(asin(ratio_q19))
theta_small_q19 = twotheta_q19 / 2
theta_large_q19 = (180 - twotheta_q19) / 2
add('2.13', 'S', 'A ball is thrown from ground level at speed u = 18 m/s and lands back at the same level after a horizontal range of exactly 25 m. Using R = u²sin(2θ)/g, find the SMALLER of the two possible launch angles that give this range (noting that sin(2θ) has two solutions between 0° and 180°).',
    f'Rearranging: sin(2θ) = Rg/u² = (25×9.81) ÷ 18.0² = 245.25 ÷ 324 = {sf(ratio_q19)}. This gives 2θ = {sf(twotheta_q19)}° OR 2θ = 180°−{sf(twotheta_q19)}° = {sf(180 - twotheta_q19)}° (since sinX = sin(180−X)). So θ = {sf(theta_small_q19)}° or θ = {sf(theta_large_q19)}° — TWO different launch angles give exactly the same range, a low, flat trajectory and a high, lobbed one. The smaller angle is {sf(theta_small_q19)}°. Common mistake: taking the inverse sine and reporting only ONE angle, missing that there are generally two different launch angles (which sum to 90°) giving the same range.',
    answer=theta_small_q19, unit='°')

t_q20 = sqrt(2 * 80 / G)
x_q20 = 60 * t_q20
add('2.13', 'S', 'A fire-fighting aircraft flying horizontally at 60 m/s and at a height of 80 m must release water so that it lands exactly on a target directly below a point it will fly over LATER (since the water keeps moving horizontally as it falls). Calculate how far BEFORE the target (measured horizontally) the water must be released.',
    f'Time to fall: t = √(2×80 ÷ 9.81) = {sf(t_q20)} s. During this time, the water (and the plane) continue moving horizontally at 60 m/s: horizontal distance covered while falling = 60 × {sf(t_q20)} = {sf(x_q20)} m. The water must therefore be released this far BEFORE the target. Common mistake: releasing the water directly above the target, forgetting that it retains the aircraft’s horizontal velocity and will carry on moving forward throughout the whole fall.',
    answer=x_q20, unit='m',
    figure=fig('2.13', 'q20', 'projectile', u=60, angleDeg=0, launchHeight=80))


# ════════════════════════════════════════════════════════════════════════
# 2.14 Understanding projectiles
# ════════════════════════════════════════════════════════════════════════
add('2.14', 'F', 'What shape is the trajectory (path) of a projectile launched at an angle, with no air resistance?',
    'It is a parabola — this follows directly from combining constant-velocity horizontal motion with constant-acceleration (free-fall) vertical motion. Common mistake: thinking the path is a simple straight line, or a circular arc, rather than the specific curve (a parabola) that this combination of motions actually produces.',
    kind='multiple_choice', options=['A parabola', 'A straight line', 'A circle', 'An ellipse'], correct_idx=0)

add('2.14', 'F', 'A projectile launched from and landing at the same height takes 1.2 s to reach its highest point. Using the symmetry of the trajectory, calculate the total time of flight.',
    'By symmetry, the time to fall back down from the highest point to the original launch height equals the time taken to rise to it: total time = 2 × 1.2 = 2.4 s. Common mistake: forgetting to double the time to the highest point, and giving only 1.2 s as the total flight time.',
    answer=2.4, unit='s')

add('2.14', 'F', 'For a given launch speed on level ground (no air resistance), which launch angle gives the maximum possible range?',
    'Range = u²sin(2θ)/g is maximised when sin(2θ) = 1, which happens when 2θ = 90°, i.e. θ = 45°. Common mistake: assuming a very steep (e.g. nearly vertical) or very shallow (nearly horizontal) angle must give the greatest range — both of those actually give very SHORT ranges, with 45° being the balanced optimum.',
    kind='multiple_choice', options=['45°', '90°', '0°', '60°'], correct_idx=0)

add('2.14', 'F', 'A projectile is launched at 22 m/s and lands back at exactly the same height from which it was launched (no air resistance). State its speed at the moment of landing.',
    'By the symmetry of projectile motion (and conservation of energy, since it returns to the same height), the landing speed exactly equals the launch speed: 22 m/s — though its DIRECTION is different (now angled downward rather than upward). Common mistake: assuming the ball must land more slowly because gravity has been "acting against it" throughout the flight.',
    answer=22, unit='m/s')

add('2.14', 'F', 'Two projectiles are launched at the same speed, one at 30° and one at 60° above the horizontal. Which reaches the GREATER maximum height?',
    'Maximum height = u²sin²θ/(2g), which increases as θ increases towards 90° (since sinθ increases over this range). Since 60° has a larger sine than 30°, the 60° launch reaches the greater height. Common mistake: assuming a steeper angle must always mean a SHORTER flight overall, without separating out that it specifically increases height while (past 45°) decreasing range.',
    kind='multiple_choice', options=['The one launched at 60°', 'The one launched at 30°', 'They reach exactly the same height', 'Height cannot be compared without knowing the mass'], correct_idx=0)

ratio_f6 = sin(radians(60)) / sin(radians(30))
t60_f6 = 2.0 * ratio_f6
add('2.14', 'F', 'Time of flight is proportional to sinθ (for a given speed, on level ground). A projectile launched at 30° has a time of flight of 2.0 s. Estimate the time of flight for the same launch speed at 60°.',
    f'Since time of flight ∝ sinθ: ratio = sin60° ÷ sin30° = {sf(sin(radians(60)))} ÷ {sf(sin(radians(30)))} = {sf(ratio_f6)}. New time of flight = 2.0 × {sf(ratio_f6)} = {sf(t60_f6)} s. Common mistake: assuming time of flight is proportional to the ANGLE itself (so 60° would simply be double the time for 30°) rather than to sinθ, which does not scale in the same simple way.',
    answer=t60_f6, unit='s')

h_q7 = 30.0**2 * sin(radians(25))**2 / (2 * G)
add('2.14', 'I', 'A projectile is launched at 30 m/s at 25° above the horizontal. Using h = u²sin²θ/(2g), calculate its maximum height.',
    f'h = 30.0² × sin²25° ÷ (2×9.81) = 900 × {sf(sin(radians(25))**2)} ÷ 19.62 = {sf(900 * sin(radians(25))**2)} ÷ 19.62 = {sf(h_q7)} m. Common mistake: forgetting to SQUARE sinθ in this formula (it comes from squaring the vertical velocity component in v²=u²−2gh).',
    answer=h_q7, unit='m',
    figure=fig('2.14', 'q7', 'projectile', u=30, angleDeg=25))

add('2.14', 'I', 'Two projectiles are launched at the same speed, at complementary angles (e.g. 20° and 70°, which add to 90°). What can be said about their ranges?',
    'Range = u²sin(2θ)/g. For complementary angles θ and (90°−θ), the doubled angles are 2θ and (180°−2θ), and since sinX = sin(180°−X), these give EXACTLY THE SAME range — even though their times of flight and maximum heights are quite different (the steeper angle goes higher and takes longer, but covers the same horizontal distance). Common mistake: assuming the steeper of two complementary-angle launches must also travel further, when in fact their ranges are identical.',
    kind='multiple_choice',
    options=['Their ranges are exactly equal, though their times of flight and maximum heights differ', 'The steeper angle always has the greater range',
             'The shallower angle always has the greater range', 'Complementary angles always give zero range'],
    correct_idx=0)

R1_q9 = 20.0**2 * sin(radians(40)) / G
R2_q9 = 20.0**2 * sin(radians(140)) / G
add('2.14', 'I', 'A projectile is launched at 20 m/s at 20°, and another at 20 m/s at 70° (complementary angles). Calculate the range of EACH, confirming they are equal.',
    f'For 20°: R = 20.0² × sin40° ÷ 9.81 = 400 × {sf(sin(radians(40)))} ÷ 9.81 = {sf(R1_q9)} m. For 70°: R = 20.0² × sin140° ÷ 9.81 = 400 × {sf(sin(radians(140)))} ÷ 9.81 = {sf(R2_q9)} m — the same, since sin40° = sin140° exactly. Common mistake: expecting sin(2×70°) = sin140° to be a DIFFERENT value from sin40°, rather than recognising the sin(180−X)=sinX identity that makes them equal.',
    answer=R1_q9, unit='m', tolerance=0.05)

Rmax_q10 = 18.0**2 / G
add('2.14', 'I', 'At what angle is the range of a projectile launched at 18 m/s maximised (on level ground), and what is that maximum range?',
    f'The maximum range always occurs at θ = 45° (where sin2θ = sin90° = 1), giving R_max = u²/g = 18.0² ÷ 9.81 = {sf(Rmax_q10)} m. Common mistake: still including the sin(2θ) factor in the final calculation even after substituting 2θ=90°, when sin90° = 1 exactly, so it simply disappears from the formula.',
    answer=Rmax_q10, unit='m')

add('2.14', 'I', 'In reality, with air resistance present, is 45° still exactly the optimum launch angle for maximum range?',
    'No — with significant air resistance, the optimum angle for maximum range is typically somewhat LESS than 45° (often considerably less for fast, light projectiles). This is because a lower, flatter trajectory spends less time in the air at high speed fighting drag, compared with a higher trajectory at the idealised 45°. Common mistake: assuming the clean theoretical result (45° for no air resistance) must still apply exactly in every real situation, however significant drag is.',
    kind='multiple_choice',
    options=['No — with air resistance, the optimum angle for range is typically somewhat less than 45°', 'Yes — 45° is always optimal, with or without air resistance',
             'No — with air resistance, the optimum angle becomes greater than 45°', 'Air resistance has no effect on the optimum launch angle at all'],
    correct_idx=0)

h_q12 = 16.0**2 * sin(radians(50))**2 / (2 * G)
add('2.14', 'I', 'A projectile is launched at 16 m/s at 50° above the horizontal. Calculate its maximum height.',
    f'h = 16.0² × sin²50° ÷ (2×9.81) = 256 × {sf(sin(radians(50))**2)} ÷ 19.62 = {sf(h_q12)} m. Common mistake: using sin50° alone (not squared), which would give a substantially different (and wrong) height.',
    answer=h_q12, unit='m')

add('2.14', 'I', 'For a FIXED launch angle, if the launch speed u is doubled, by what factor does the range increase (on level ground, no air resistance)?',
    'Range = u²sin(2θ)/g, so range is proportional to u². Doubling u increases range by a factor of 2² = 4, not simply by a factor of 2. Common mistake: assuming range scales directly (linearly) with speed, rather than with speed SQUARED — a common and important source of error whenever a formula contains u² rather than u.',
    kind='multiple_choice', options=['4 times (since range ∝ u²)', '2 times', '8 times', 'The range is unaffected by speed'], correct_idx=0)

ux_q14 = 20.0 * cos(radians(35))
uy_q14 = 20.0 * sin(radians(35))
x_q14 = 15.0
y_q14 = x_q14 * tan(radians(35)) - (G * x_q14**2) / (2 * 20.0**2 * cos(radians(35))**2)
add('2.14', 'C', 'Starting from x = (u cosθ)t and y = (u sinθ)t − ½gt², eliminate t to show that y = x tanθ − gx²/(2u²cos²θ), the equation of the parabolic trajectory. Then, for u = 20 m/s, θ = 35°, calculate y when x = 15 m.',
    f'From the x equation: t = x/(u cosθ). Substituting into y: y = (u sinθ) × x/(u cosθ) − ½g × [x/(u cosθ)]² = x tanθ − gx²/(2u²cos²θ), since (sinθ/cosθ) = tanθ. Applying with x = 15, θ = 35°, u = 20: y = 15×tan35° − (9.81×15²) ÷ (2×20.0²×cos²35°) = {sf(x_q14 * tan(radians(35)))} − {sf((G * x_q14**2) / (2 * 20.0**2 * cos(radians(35))**2))} = {sf(y_q14)} m. Common mistake: forgetting to square u and cosθ in the second term, since both were already squared individually before being combined in the original substitution.',
    answer=y_q14, unit='m',
    figure=fig('2.14', 'q14', 'projectile', u=20, angleDeg=35))

R_q15 = 25.0**2 * sin(radians(80)) / G
add('2.14', 'C', 'Two balls are launched from the same point at the same speed, 25 m/s, but at complementary angles: 40° and 50°. (a) Calculate the range for the 40° launch. (b) Calculate the range for the 50° launch. (c) Explain why they are equal. Give only the answer to (a).',
    f'(a)/(b) Both use R = u²sin(2θ)/g with the SAME value of sin(2θ): for 40°, 2θ=80°; for 50°, 2θ=100°, and sin100°=sin80°. R = 25.0² × sin80° ÷ 9.81 = 625 × {sf(sin(radians(80)))} ÷ 9.81 = {sf(R_q15)} m for BOTH. (c) 40° and 50° are complementary (they add to 90°), so their doubled angles (80° and 100°) are supplementary, giving equal sines and hence equal ranges. Common mistake: computing sin(2×50°) = sin100° as if it were a different, smaller value from sin80°, rather than recognising they are exactly equal.',
    answer=R_q15, unit='m',
    figure=fig('2.14', 'q15', 'projectile', u=25, angleDeg=40))

u_q16 = sqrt(2 * G * 12.0 / sin(radians(50))**2)
R_q16 = u_q16**2 * sin(radians(100)) / G
add('2.14', 'C', 'A projectile’s maximum height is measured as 12.0 m for a launch angle of 50°. (a) Using h = u²sin²θ/(2g), calculate the launch speed u. (b) Hence calculate the range. Give only the answer to (b).',
    f'(a) Rearranging: u² = 2gh ÷ sin²θ = (2×9.81×12.0) ÷ sin²50° = 235.4 ÷ {sf(sin(radians(50))**2)} = {sf(2 * G * 12.0 / sin(radians(50))**2)}, so u = {sf(u_q16)} m/s. (b) Range = u²sin(2×50°)/g = {sf(u_q16**2)} × sin100° ÷ 9.81 = {sf(R_q16)} m. Common mistake: forgetting to take the square root at the end of part (a), and carrying u² (rather than u) forward into later work — though in THIS case, since (b) itself needs u² again, it is important to keep track of which quantity is which.',
    answer=R_q16, unit='m',
    figure=fig('2.14', 'q16', 'projectile', u=u_q16, angleDeg=50))

R20_q17 = 15.0**2 * sin(radians(40)) / G
R45_q17 = 15.0**2 * sin(radians(90)) / G
R70_q17 = 15.0**2 * sin(radians(140)) / G
add('2.14', 'C', 'For a fixed launch speed of 15 m/s, the table shows the range at three launch angles: 20°, 45° and 70°. Calculate the range for each, and identify which angle gives the maximum range. Give only that maximum range.',
    f'20°: R = 225×sin40°÷9.81 = {sf(R20_q17)} m. 45°: R = 225×sin90°÷9.81 = {sf(R45_q17)} m. 70°: R = 225×sin140°÷9.81 = {sf(R70_q17)} m. The 20° and 70° results are equal (complementary angles), while 45° gives the clear maximum, {sf(R45_q17)} m. Common mistake: assuming the maximum range must occur at the LARGEST of the given angles (70°), rather than checking all three and recognising 45° as the true optimum.',
    answer=R45_q17, unit='m',
    figure=fig('2.14', 'q17', 'table', headers=['Angle', '20°', '45°', '70°'], rows=[['Range / m', sf(R20_q17), sf(R45_q17), sf(R70_q17)]]))

uy_q18 = 24.0 * sin(radians(28))
ux_q18 = 24.0 * cos(radians(28))
a_c18, b_c18, c_c18 = 4.905, -uy_q18, -1.8
t_q18 = (-b_c18 + sqrt(b_c18**2 - 4 * a_c18 * c_c18)) / (2 * a_c18)
range_q18 = ux_q18 * t_q18
add('2.14', 'C', 'A javelin is released at 28° above the horizontal at 24 m/s, from a height of 1.8 m above the (level) ground. Calculate the range, accounting for the launch height (the simple level-ground range formula does not directly apply here).',
    f'Components: u_x = 24cos28° = {sf(ux_q18)} m/s, u_y = 24sin28° = {sf(uy_q18)} m/s. Vertically, taking up as positive, the ground is at −1.8 m: −1.8 = {sf(uy_q18)}t − 4.905t², giving 4.905t²−{sf(uy_q18)}t−1.8 = 0. Solving: t = {sf(t_q18)} s. Range = {sf(ux_q18)} × {sf(t_q18)} = {sf(range_q18)} m. Common mistake: using R = u²sin(2θ)/g directly, which assumes the launch and landing heights are EQUAL — here the javelin is released above the ground it lands on, so the full quadratic approach is needed instead.',
    answer=range_q18, unit='m',
    figure=fig('2.14', 'q18', 'projectile', u=24, angleDeg=28, launchHeight=1.8))

Rmax_q19 = 22.0**2 / G
add('2.14', 'S', 'Show that R = u²sin(2θ)/g is maximised when θ = 45°, and that the resulting maximum range equals exactly u²/g. Verify for u = 22 m/s.',
    f'sin(2θ) reaches its largest possible value, 1, exactly when 2θ = 90°, i.e. θ = 45° (since sin(2θ) ≤ 1 for all θ, with equality only there). Substituting sin(2θ)=1 into the range formula gives simply R_max = u² ÷ g (the sine factor disappears entirely). For u = 22 m/s: R_max = 22.0² ÷ 9.81 = {sf(Rmax_q19)} m. Common mistake: trying to use calculus (differentiating R with respect to θ) when at AS level it is far simpler to note directly that sin(2θ) is bounded above by 1, and that this bound is reached at θ = 45°.',
    answer=Rmax_q19, unit='m')

R0_q20 = 30.0**2 * sin(radians(80)) / G
uy_q20 = 30.0 * sin(radians(40))
ux_q20 = 30.0 * cos(radians(40))
a_c20, b_c20, c_c20 = 4.905, -uy_q20, -2.0
t_q20 = (-b_c20 + sqrt(b_c20**2 - 4 * a_c20 * c_c20)) / (2 * a_c20)
Rh_q20 = ux_q20 * t_q20
pctinc_q20 = (Rh_q20 - R0_q20) / R0_q20 * 100
add('2.14', 'S', 'A javelin is launched at 30 m/s at 40° above the horizontal. (a) Calculate the range if launched from ground level (height 0). (b) Calculate the range if instead released from a height of 2.0 m above the (otherwise identical) landing level. (c) Calculate the percentage increase in range caused by the extra launch height. Give only the answer to (c).',
    f'(a) Ground-level range: R₀ = 30.0²×sin80°÷9.81 = 900×{sf(sin(radians(80)))}÷9.81 = {sf(R0_q20)} m. (b) With launch height 2.0 m: u_x={sf(ux_q20)} m/s, u_y={sf(uy_q20)} m/s; solving −2.0={sf(uy_q20)}t−4.905t² gives t={sf(t_q20)} s, so R_h = {sf(ux_q20)}×{sf(t_q20)} = {sf(Rh_q20)} m. (c) Percentage increase = ({sf(Rh_q20)}−{sf(R0_q20)}) ÷ {sf(R0_q20)} × 100% = {sf(pctinc_q20)}%. Common mistake: assuming launch height has no effect on range, when in fact ANY positive launch height always slightly increases the flight time (and hence the range), compared with an otherwise identical ground-level launch.',
    answer=pctinc_q20, unit='%',
    figure=fig('2.14', 'q20', 'projectile', u=30, angleDeg=40, launchHeight=2.0))


# >>> INSERT_LESSONS_HERE <<<


# ════════════════════════════════════════════════════════════════════════
# Validate every lesson got exactly 20, Q1..Q20, before emitting anything.
# ════════════════════════════════════════════════════════════════════════
missing = [c for c in LESSONS if counters.get(c, 0) != 20]
if missing:
    raise SystemExit(f'Lessons not at exactly 20 questions: { {c: counters.get(c, 0) for c in missing} }')

for code in LESSONS:
    qs = [p for p in questions if p['code'] == code]
    numbers = sorted(p['number'] for p in qs)
    assert numbers == list(range(1, 21)), f'{code}: bad numbering {numbers}'

for p in questions:
    if p['figure']:
        key = p['figure'].replace('diagram:', '')
        assert key in diagrams, f"{p['code']} #{p['number']}: figure {p['figure']} was never registered"

print(f'{len(questions)} questions across {len(LESSONS)} lessons, {len(diagrams)} figures', file=sys.stderr)

# ════════════════════════════════════════════════════════════════════════
# SQL
# ════════════════════════════════════════════════════════════════════════
out = [
    '-- AS Level (9702) Kinematics (1.1-1.8) and Accelerated motion (2.1-2.14):',
    '-- a fresh, tier-ordered 20-question (Q1-Q20) bank for every lesson.',
    '-- GENERATED by 2026-10-09-as-kinematics-accelerated-motion.py: edit that, never this file.',
    '-- Replaces whatever AS questions these 22 lessons had. A DELETE against the live',
    '-- problems table hangs/times out in this environment (see PROJECT_STATUS), so',
    '-- existing rows (listed in _existing_as_rows.py) are overwritten in place via',
    '-- UPDATE, keeping their original id, and only the surplus beyond what already',
    '-- existed is a fresh INSERT. Idempotent either way: UPDATEs are naturally',
    '-- re-runnable, and fresh INSERTs use uuid5 ids with ON CONFLICT DO NOTHING.',
    'BEGIN;',
    '',
    'DO $$',
    'DECLARE missing INT;',
    'BEGIN',
    "  SELECT 22 - COUNT(*) INTO missing FROM topics WHERE id IN (" + ', '.join(q(L['topic']) for L in LESSONS.values()) + ") AND 'as' = ANY(curriculum_ids);",
    "  IF missing > 0 THEN RAISE EXCEPTION '% AS lesson(s) missing or not serving the AS curriculum', missing; END IF;",
    'END $$;',
    '',
]

for code in LESSONS:
    qs = sorted((p for p in questions if p['code'] == code), key=lambda p: p['number'])
    existing = EXISTING.get(code, [])
    for i, p in enumerate(qs):
        answer_type = 'multiple_choice' if p['kind'] == 'multiple_choice' else 'numeric'
        if i < len(existing):
            old = existing[i]
            old_id = old['id']
            out.append(
                'UPDATE problems SET '
                f"chapter_id = {q(p['chapter'])}, topic_id = {q(p['topic'])}, curriculum_id = 'as', "
                f"topic_code = {q(p['code'])}, syllabus_cite = {q(p['cite'])}, problem_number = {p['number']}, "
                f"\"order\" = {p['number']}, question_text = {q(p['text'])}, question_image_url = {opt(p['figure'])}, "
                f"difficulty_level = {p['difficulty']}, answer_type = '{answer_type}'::answer_type, "
                f"answer_correct = {q(p['answer'])}, answer_unit = {opt(p.get('unit'))}, "
                f"answer_unit_required = {b(p.get('unit_required', False))}, "
                f"answer_tolerance = {p['tolerance'] if p.get('tolerance') is not None else 'NULL'}, "
                f"answer_sign_sensitive = {b(p.get('sign_sensitive', False))}, explanation = {q(p['explanation'])}, "
                f"points = {p['marks']} WHERE id = {q(old_id)};"
            )
            if p['kind'] == 'multiple_choice':
                old_options = old.get('options') if old['type'] == 'multiple_choice' else None
                for oi, text in enumerate(p['options']):
                    letter = 'ABCD'[oi]
                    is_correct = b(oi == p['correct_idx'])
                    if old_options and oi < len(old_options):
                        out.append(
                            f"UPDATE problem_options SET problem_id = {q(old_id)}, option_text = {q(text)}, "
                            f"option_letter = {q(letter)}, is_correct = {is_correct}, \"order\" = {oi} "
                            f"WHERE id = {q(old_options[oi])};"
                        )
                    else:
                        opt_id = uid(f"option/{old_id}/{oi}")
                        out.append(
                            'INSERT INTO problem_options (id, problem_id, option_text, option_letter, is_correct, "order") VALUES ('
                            f"{q(opt_id)}, {q(old_id)}, {q(text)}, {q(letter)}, {is_correct}, {oi}) ON CONFLICT (id) DO NOTHING;"
                        )
        else:
            out.append(
                'INSERT INTO problems (id, chapter_id, topic_id, curriculum_id, topic_code, syllabus_cite, problem_number, "order", '
                'question_text, question_image_url, difficulty_level, answer_type, answer_correct, answer_unit, answer_unit_required, '
                'answer_tolerance, answer_sign_sensitive, explanation, points) VALUES ('
                f"{q(p['id'])}, {q(p['chapter'])}, {q(p['topic'])}, 'as', {q(p['code'])}, {q(p['cite'])}, "
                f"{p['number']}, {p['number']}, {q(p['text'])}, {opt(p['figure'])}, {p['difficulty']}, "
                f"'{answer_type}'::answer_type, "
                f"{q(p['answer'])}, {opt(p.get('unit'))}, {b(p.get('unit_required', False))}, "
                f"{p['tolerance'] if p.get('tolerance') is not None else 'NULL'}, {b(p.get('sign_sensitive', False))}, "
                f"{q(p['explanation'])}, {p['marks']}) ON CONFLICT (id) DO NOTHING;"
            )
            if p['kind'] == 'multiple_choice':
                for oi, text in enumerate(p['options']):
                    letter = 'ABCD'[oi]
                    opt_id = uid(f"option/{p['id']}/{oi}")
                    out.append(
                        'INSERT INTO problem_options (id, problem_id, option_text, option_letter, is_correct, "order") VALUES ('
                        f"{q(opt_id)}, {q(p['id'])}, {q(text)}, {q(letter)}, {b(oi == p['correct_idx'])}, {oi}) ON CONFLICT (id) DO NOTHING;"
                    )

out.append('')
out.append('COMMIT;')

with open(sys.argv[1], 'w') as fh:
    fh.write('\n'.join(out) + '\n')

# ════════════════════════════════════════════════════════════════════════
# Diagram data file consumed by components/practice/KinematicsDiagrams.tsx
# ════════════════════════════════════════════════════════════════════════
ts_lines = [
    '// GENERATED by database/seeds/2026-10-09-as-kinematics-accelerated-motion.py — do not hand-edit.',
    '// Each entry is the exact numbers used to build one question\'s figure; see KinematicsDiagrams.tsx',
    '// for the reusable components that render them.',
    '// eslint-disable-next-line @typescript-eslint/no-explicit-any',
    'export const KINEMATICS_DIAGRAM_DATA: Record<string, { kind: string; props: any }> = ' +
    json.dumps(diagrams, ensure_ascii=False, indent=1) + ';',
    '',
]
with open(sys.argv[2], 'w') as fh:
    fh.write('\n'.join(ts_lines))

if '--json' in sys.argv:
    with open(sys.argv[sys.argv.index('--json') + 1], 'w') as fh:
        json.dump(questions, fh, ensure_ascii=False, indent=1, default=str)
