"""Usage: python3 database/seeds/2026-09-22-circular-motion-gravitation-coulomb.py database/seeds/2026-09-22-circular-motion-gravitation-coulomb.sql

Builds the seed SQL for the circular motion / gravitation / Coulomb worksheets.

Every answer is computed here from the question's own numbers, and the
explanation's figures are formatted from the same computation, so the text
and the stored answer cannot disagree.
"""
import uuid
from math import pi, sqrt, sin, cos, tan, atan, acos, degrees, radians, hypot, atan2

g = 9.8
G = 6.67e-11
M_EARTH = 5.97e24
k = 9.0e9

CH3 = 'a86aff95-adbc-4634-af1f-528e375e2230'
CH17 = '7137f560-2406-4a69-9099-4c845ef53ea8'
CH24 = 'ac5e5832-2f40-4487-ba6b-19b47d21baac'
COULOMB_TOPIC = 'c6c1d1f5-1c6b-4ab4-a15b-beea25426304'
CIRC_TOPIC = str(uuid.uuid5(uuid.NAMESPACE_URL, 'ashphys/topic/3.7-circular-motion'))
GRAV_TOPIC = str(uuid.uuid5(uuid.NAMESPACE_URL, 'ashphys/topic/24.3-gravitation'))

SUP = str.maketrans('-0123456789', '⁻⁰¹²³⁴⁵⁶⁷⁸⁹')


def sf(x, n=3):
    """x to n significant figures, in standard form (× 10ⁿ) when very large or small."""
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


def sq(x):
    """x² written so a standard-form value is squared as a whole: (4.5 × 10⁻⁷)²."""
    return f'({sf(x)})²' if '×' in sf(x) else f'{sf(x)}²'


def stored(x, n=4):
    """Answer as stored for the grader: plain decimal or e-notation, 4 s.f."""
    e = int(f'{x:e}'.split('e')[1])
    trim = lambda s: s.rstrip('0').rstrip('.') if '.' in s else s
    if -3 <= e < 5:
        return trim(f'{x:.{max(n - 1 - e, 0)}f}')
    return f"{trim(f'{x / 10**e:.{n - 1}f}')}e{e}"


questions = []  # dicts


def num(topic, chapter, text, answer, unit, explanation, difficulty, figure=None, tolerance=None, sign=False):
    questions.append(dict(topic=topic, chapter=chapter, text=text, answer=stored(answer), unit=unit,
                          explanation=explanation, difficulty=difficulty, figure=figure,
                          tolerance=tolerance, sign=sign, type='numeric', options=None))


def mcq(topic, chapter, text, options, explanation, difficulty, figure=None):
    correct = [o for o, ok in options if ok]
    assert len(correct) == 1
    questions.append(dict(topic=topic, chapter=chapter, text=text, answer=correct[0], unit=None,
                          explanation=explanation, difficulty=difficulty, figure=figure,
                          tolerance=None, sign=False, type='multiple_choice', options=options))


C = (CIRC_TOPIC, CH3)

# ── Speed, period and centripetal acceleration ────────────────────────────
v = 2 * pi * 50 / 9.0
num(*C, 'A race car makes one lap around a circular track of radius 50 m in 9.0 s. Calculate the car’s average speed, in m/s.',
    v, 'm/s', f'One lap is one circumference, so v = 2πr/T = (2π × 50) ÷ 9.0 = {sf(v)} m/s. (Its average velocity over a whole lap is actually zero — it ends where it started — which is why the question asks for speed.)', 1, 'diagram:circular-horizontal')
a = v**2 / 50
num(*C, 'The same race car goes round the 50 m radius track once every 9.0 s. Calculate its centripetal acceleration, in m/s².',
    a, 'm/s²', f'First the speed: v = 2πr/T = (2π × 50) ÷ 9.0 = {sf(v)} m/s. Then a = v²/r = {sf(v)}² ÷ 50 = {sf(a)} m/s², directed towards the centre of the track.', 2)
v = 2 * pi * 1.5 / 0.5
num(*C, 'Normie Neutron swings a rubber ball on a string over his head in a horizontal circle. The string is 1.5 m long and the ball makes 120 complete turns each minute. Calculate the speed of the ball, in m/s.',
    v, 'm/s', f'120 turns per minute is 2 turns per second, so the period is T = 60 ÷ 120 = 0.50 s. The radius is the string length, 1.5 m. v = 2πr/T = (2π × 1.5) ÷ 0.50 = {sf(v)} m/s.', 2, 'diagram:circular-horizontal')
a = v**2 / 1.5
num(*C, 'Normie Neutron’s ball moves in a horizontal circle of radius 1.5 m, making 120 complete turns each minute. Calculate the ball’s centripetal acceleration, in m/s².',
    a, 'm/s²', f'T = 60 ÷ 120 = 0.50 s, so v = 2πr/T = {sf(v)} m/s. Then a = v²/r = {sf(v)}² ÷ 1.5 = {sf(a)} m/s². (Or in one step: a = 4π²r/T² = 4π² × 1.5 ÷ 0.50² = {sf(a)} m/s².)', 2)
num(*C, 'A car goes around a curve at 20 m/s. The radius of the curve is 50 m. Calculate the centripetal acceleration of the car, in m/s².',
    20**2 / 50, 'm/s²', 'a = v²/r = 20² ÷ 50 = 400 ÷ 50 = 8.0 m/s², towards the centre of the curve.', 1)
a = 4 * pi**2 * 4.0 / 3600**2
num(*C, 'Professor Brown holds on to the end of the minute hand of a clock on top of the city hall. The minute hand is 4.0 m long. Calculate the professor’s centripetal acceleration, in m/s².',
    a, 'm/s²', f'The minute hand goes round once an hour, so T = 3600 s, and the radius is its length, 4.0 m. a = 4π²r/T² = (4π² × 4.0) ÷ 3600² = {sf(a)} m/s² — tiny, because the hand turns so slowly.', 3, tolerance=0.05)
v = 2 * pi * 0.15 / 1.8
num(*C, 'A flea rides on the outer edge of a record of radius 15 cm. The record turns once every 1.8 s. Calculate the flea’s speed, in m/s.',
    v, 'm/s', f'Convert the radius to metres first: 15 cm = 0.15 m. v = 2πr/T = (2π × 0.15) ÷ 1.8 = {sf(v)} m/s.', 2)
a = v**2 / 0.15
num(*C, 'The flea on the edge of the 15 cm radius record goes round once every 1.8 s. Calculate its centripetal acceleration, in m/s².',
    a, 'm/s²', f'v = 2πr/T = (2π × 0.15) ÷ 1.8 = {sf(v)} m/s, so a = v²/r = {sf(v)}² ÷ 0.15 = {sf(a)} m/s².', 2)
T = 2 * pi * 0.35 / 8.0
num(*C, 'A bicycle wheel has a radius of 0.35 m. A point on the rim moves at 8.0 m/s. Calculate the period of rotation of the wheel, in seconds.',
    T, 's', f'Rearrange v = 2πr/T to T = 2πr/v = (2π × 0.35) ÷ 8.0 = {sf(T)} s.', 2, 'diagram:circular-horizontal')
num(*C, 'A 900 kg car rounds a flat, circular curve of radius 50 m at a constant speed of 15 m/s. Calculate the magnitude of the car’s centripetal acceleration, in m/s².',
    15**2 / 50, 'm/s²', 'a = v²/r = 15² ÷ 50 = 225 ÷ 50 = 4.5 m/s². The car’s mass is not needed for the acceleration — only for the force.', 1, 'diagram:circular-horizontal')
v = sqrt(78 * 2.0)
num(*C, 'A steel beam rotates in a horizontal circle to give trainee pilots a large centripetal acceleration. A pilot sits 2.0 m from the centre of rotation. At what speed must the pilot move to experience a centripetal acceleration of 78 m/s²?',
    v, 'm/s', f'Rearrange a = v²/r: v = √(a × r) = √(78 × 2.0) = √156 = {sf(v)} m/s.', 2)
num(*C, 'A 0.20 kg mass is spun in a horizontal circle on a string 0.60 m long. Its centripetal acceleration is measured to be 15 m/s². Calculate the speed of the mass, in m/s.',
    sqrt(15 * 0.60), 'm/s', 'The string length is the radius, 0.60 m. v = √(a × r) = √(15 × 0.60) = √9.0 = 3.0 m/s. The mass does not affect the answer.', 1, 'diagram:circular-horizontal')

# ── Centripetal force and tension, horizontal circles ─────────────────────
F = 0.75 * 4 * pi**2 * 1.1 / 5**2
num(*C, 'A 0.75 kg object on a string is swung in a horizontal circle of radius 1.1 m. It completes 12 revolutions every minute. Calculate the tension in the string, which provides the centripetal force, in newtons.',
    F, 'N', f'12 revolutions per minute gives T = 60 ÷ 12 = 5.0 s. F = m × 4π²r/T² = 0.75 × 4π² × 1.1 ÷ 5.0² = {sf(F)} N.', 2, 'diagram:circular-horizontal')
r = 50 * 4.0**2 / (4 * pi**2 * 25)
num(*C, 'A 25 kg child on a merry-go-round feels a centripetal force of 50 N. The merry-go-round has a period of 4.0 s. Calculate the radius of the child’s path, in metres.',
    r, 'm', f'Rearrange F = m × 4π²r/T² for r: r = F T²/(4π² m) = (50 × 4.0²) ÷ (4π² × 25) = 800 ÷ {sf(4 * pi**2 * 25)} = {sf(r)} m.', 3, 'diagram:circular-horizontal')
a = 4 * pi**2 * 0.75 / 0.80**2
num(*C, 'A 0.100 kg mass on a string 75 cm long swings in a horizontal circle, going round once every 0.80 s. Calculate the centripetal acceleration of the mass, in m/s².',
    a, 'm/s²', f'r = 75 cm = 0.75 m and T = 0.80 s. a = 4π²r/T² = 4π² × 0.75 ÷ 0.80² = {sf(a)} m/s².', 2, 'diagram:circular-horizontal')
num(*C, 'The 0.100 kg mass on a 75 cm string goes round its horizontal circle once every 0.80 s. Calculate the tension in the string, in newtons.',
    0.100 * a, 'N', f'The tension provides the centripetal force. a = 4π²r/T² = {sf(a)} m/s², so T = m a = 0.100 × {sf(a)} = {sf(0.1 * a)} N.', 2)
a = 4 * pi**2 * 1.0 / 0.5**2
num(*C, 'A 0.50 kg mass on a string 1.0 m long moves in a horizontal circle, completing one revolution every 0.50 s. Calculate the centripetal acceleration of the mass, in m/s².',
    a, 'm/s²', f'a = 4π²r/T² = 4π² × 1.0 ÷ 0.50² = {sf(a)} m/s².', 2, 'diagram:circular-horizontal')
num(*C, 'The 0.50 kg mass on a 1.0 m string completes one horizontal revolution every 0.50 s. Calculate the tension in the string, in newtons.',
    0.50 * a, 'N', f'a = 4π²r/T² = {sf(a)} m/s², and the tension supplies the centripetal force: F = m a = 0.50 × {sf(a)} = {sf(0.5 * a)} N.', 2)
F = 900 * 4 * pi**2 * 90.0 / 12.3**2
num(*C, 'A 900 kg racing car takes 12.3 s to go once around a circular racetrack of radius 90.0 m at a uniform speed. Calculate the centripetal force acting on the car, in newtons.',
    F, 'N', f'F = m × 4π²r/T² = 900 × 4π² × 90.0 ÷ 12.3² = {sf(F)} N. (Equivalently, v = 2πr/T = {sf(2 * pi * 90 / 12.3)} m/s and F = mv²/r.)', 3, 'diagram:circular-horizontal')
mcq(*C, 'A racing car drives round a flat circular track at a steady speed. Which force provides the centripetal force that keeps it on the circle?',
    [('Friction between the tyres and the road', True), ('The weight of the car', False), ('The driving force from the engine', False), ('Air resistance', False)],
    'On a flat track the only horizontal force that can point towards the centre is the sideways friction between the tyres and the road. Weight acts downwards, the engine’s driving force acts forwards and air resistance acts backwards — none of them points towards the centre.', 1)
v = 2 * pi * 4.0 / 3.0
num(*C, 'A 2.0 kg object tied to a cord is whirled in a horizontal circle of radius 4.0 m, completing 2 revolutions every 6.0 s. Calculate the speed of the object, in m/s.',
    v, 'm/s', f'2 revolutions in 6.0 s means one every 3.0 s, so T = 3.0 s. v = 2πr/T = (2π × 4.0) ÷ 3.0 = {sf(v)} m/s.', 2, 'diagram:circular-horizontal')
a = v**2 / 4.0
num(*C, 'The 2.0 kg object whirls round a horizontal circle of radius 4.0 m, completing 2 revolutions every 6.0 s. Calculate its centripetal acceleration, in m/s².',
    a, 'm/s²', f'T = 3.0 s, so v = 2πr/T = {sf(v)} m/s and a = v²/r = {sf(v)}² ÷ 4.0 = {sf(a)} m/s².', 2)
num(*C, 'The 2.0 kg object whirls round a horizontal circle of radius 4.0 m, completing 2 revolutions every 6.0 s. Calculate the pull (tension) in the cord, in newtons.',
    2.0 * a, 'N', f'The cord’s pull is the centripetal force. a = {sf(a)} m/s² (from v = {sf(v)} m/s and a = v²/r), so F = m a = 2.0 × {sf(a)} = {sf(2 * a)} N.', 2)
mcq(*C, 'An object is being whirled in a horizontal circle on a cord when the cord suddenly breaks. What does the object do immediately afterwards?',
    [('It moves off in a straight line along the tangent to the circle', True), ('It moves straight outwards, directly away from the centre', False), ('It carries on moving round the same circle', False), ('It moves straight towards the centre of the circle', False)],
    'Once the cord breaks there is no longer a centripetal force, so (ignoring gravity) no force changes the object’s direction. It keeps the velocity it had at that instant, and that velocity points along the tangent — so it flies off in a straight line at a tangent, at the speed it was already moving.', 1)

# ── Vertical circles ──────────────────────────────────────────────────────
v = 2 * pi * 0.90 / 1.8
Tb = 0.50 * (g + v**2 / 0.90)
num(*C, 'A 0.50 kg mass on a string 0.90 m long is swung in a vertical circle, taking 1.8 s for each revolution. Treating its speed as constant, calculate the tension in the string at the bottom of the circle, in newtons. Take g = 9.8 m/s².',
    Tb, 'N', f'v = 2πr/T = (2π × 0.90) ÷ 1.8 = {sf(v)} m/s. At the bottom the tension pulls up (towards the centre) and the weight pulls down, and their difference provides the centripetal force: T − mg = mv²/r. So T = m(g + v²/r) = 0.50 × (9.8 + {sf(v)}² ÷ 0.90) = 0.50 × (9.8 + {sf(v**2 / 0.9)}) = {sf(Tb)} N.', 3, 'diagram:circular-vertical-bottom', 0.05)
a = 4 * pi**2 * 1.2 / 1.5**2
Tt = 2.1 * (a - g)
num(*C, 'A 2.1 kg object is swung on the end of a 1.2 m string in a vertical circle, taking 1.5 s for each revolution. Treating its speed as constant, calculate the tension in the string at the top of the circle, in newtons. Take g = 9.8 m/s².',
    Tt, 'N', f'The centripetal acceleration is a = 4π²r/T² = 4π² × 1.2 ÷ 1.5² = {sf(a)} m/s². At the top both the tension and the weight point down, towards the centre: T + mg = ma. So T = m(a − g) = 2.1 × ({sf(a)} − 9.8) = {sf(Tt)} N.', 3, 'diagram:circular-vertical-top', 0.05)
v = sqrt(g * 7.5)
num(*C, 'A roller coaster car goes round a vertical loop of radius 7.5 m. Calculate the minimum speed the car needs at the top of the loop so that it does not lose contact with the track, in m/s. Take g = 9.8 m/s².',
    v, 'm/s', f'At the minimum speed the track pushes with zero force at the top, so the weight alone provides the centripetal force: mg = mv²/r. The mass cancels, leaving v = √(g r) = √(9.8 × 7.5) = {sf(v)} m/s.', 3, 'diagram:circular-vertical-top', 0.05)
T = 4.0 * (g + 5.0**2 / 1.5)
num(*C, 'A 4.0 kg bucket of water is swung in a vertical circle of radius 1.5 m. Its speed at the bottom of the circle is 5.0 m/s. Calculate the tension in the rope at the bottom, in newtons. Take g = 9.8 m/s².',
    T, 'N', f'At the bottom, T − mg = mv²/r, so T = m(g + v²/r) = 4.0 × (9.8 + 5.0² ÷ 1.5) = 4.0 × (9.8 + {sf(25 / 1.5)}) = {sf(T)} N — much more than the bucket’s weight of 39 N.', 3, 'diagram:circular-vertical-bottom', 0.05)
v = sqrt(g * 12.0)
num(*C, 'An astronaut in a centrifuge moves round a vertical circle of radius 12.0 m. Calculate the minimum speed at the top of the circle that gives apparent weightlessness (zero normal force), in m/s. Take g = 9.8 m/s².',
    v, 'm/s', f'With zero normal force, the weight alone provides the centripetal force at the top: mg = mv²/r, so v = √(g r) = √(9.8 × 12.0) = {sf(v)} m/s.', 3, 'diagram:circular-vertical-top', 0.05)

# ── Conical pendulums ─────────────────────────────────────────────────────
T = 0.50 * g / cos(radians(35))
num(*C, 'A 0.50 kg ball on a 1.5 m string is swung in a horizontal circle, so that the string makes an angle of 35° with the vertical. Calculate the tension in the string, in newtons. Take g = 9.8 m/s².',
    T, 'N', f'The ball does not rise or fall, so the vertical component of the tension balances its weight: T cos35° = mg. T = mg ÷ cos35° = (0.50 × 9.8) ÷ {cos(radians(35)):.3f} = {sf(T)} N. (The string length is not needed.)', 3, 'diagram:circular-conical', 0.05)
r = 0.90 * sin(radians(25))
v = sqrt(g * r * tan(radians(25)))
num(*C, 'A conical pendulum has a string 0.90 m long, which makes an angle of 25° with the vertical. Calculate the speed of the mass, in m/s. Take g = 9.8 m/s².',
    v, 'm/s', f'The radius of the circle is r = L sin25° = 0.90 × {sin(radians(25)):.3f} = {sf(r)} m. Vertically T cos25° = mg; horizontally T sin25° = mv²/r. Dividing gives tan25° = v²/(r g), so v = √(r g tan25°) = √({sf(r)} × 9.8 × {tan(radians(25)):.3f}) = {sf(v)} m/s.', 4, 'diagram:circular-conical', 0.05)
th = degrees(acos(2.0 * g / 30))
num(*C, 'A 2.0 kg object swings as a conical pendulum. The tension in the string is 30 N. Calculate the angle θ that the string makes with the vertical, in degrees. Take g = 9.8 m/s².',
    th, '°', f'Vertically the forces balance: T cosθ = mg, so cosθ = mg/T = (2.0 × 9.8) ÷ 30 = {2 * g / 30:.3f}. θ = cos⁻¹({2 * g / 30:.3f}) = {th:.1f}°.', 3, 'diagram:circular-conical', 0.05)
T = 2 * pi * 0.45 / 3.0
num(*C, 'The mass on a conical pendulum moves round a circle of radius 0.45 m at a speed of 3.0 m/s. Calculate the period of rotation, in seconds.',
    T, 's', f'T = 2πr/v = (2π × 0.45) ÷ 3.0 = {sf(T)} s.', 2, 'diagram:circular-conical')
a = 4 * pi**2 * 0.70 / 2.2**2
th = degrees(atan(a / g))
num(*C, 'A conical pendulum has a period of 2.2 s and the mass moves round a circle of radius 0.70 m. Calculate the angle θ that the string makes with the vertical, in degrees. Take g = 9.8 m/s².',
    th, '°', f'The centripetal acceleration is a = 4π²r/T² = 4π² × 0.70 ÷ 2.2² = {sf(a)} m/s². For a conical pendulum tanθ = a/g (horizontal T sinθ = ma, vertical T cosθ = mg), so tanθ = {sf(a)} ÷ 9.8 = {a / g:.3f} and θ = {th:.1f}°.', 4, 'diagram:circular-conical', 0.05)
Fc = 0.25 * g * tan(radians(28))
T = sqrt(0.25 * 4 * pi**2 * 0.80 / Fc)
num(*C, 'A 0.25 kg toy plane on a string flies in a horizontal circle of radius 0.80 m. The string makes an angle of 28° with the vertical. Calculate the period of rotation, in seconds. Take g = 9.8 m/s².',
    T, 's', f'Weight: mg = 0.25 × 9.8 = 2.45 N. The tension’s vertical part balances the weight and its horizontal part is the centripetal force, so tan28° = Fc/mg and Fc = 2.45 × tan28° = 2.45 × {tan(radians(28)):.3f} = {sf(Fc)} N. Then Fc = m × 4π²r/T² gives T = √(m × 4π²r ÷ Fc) = √(0.25 × 4π² × 0.80 ÷ {sf(Fc)}) = {sf(T)} s.', 4, 'diagram:circular-conical', 0.05)

# ── Gravitation and orbits ────────────────────────────────────────────────
GR = (GRAV_TOPIC, CH24)
CONSTS = 'Use G = 6.67 × 10⁻¹¹ N·m²/kg²'
x = G * 5.0e23 / (4.0e6)**2
num(*GR, f'Calculate the gravitational field strength on the surface of a planet with a mass of 5.0 × 10²³ kg and a radius of 4.0 × 10⁶ m, in N/kg. {CONSTS}.',
    x, 'N/kg', f'g = GM/R² = (6.67 × 10⁻¹¹ × 5.0 × 10²³) ÷ (4.0 × 10⁶)² = {sf(G * 5e23)} ÷ {sf(1.6e13)} = {sf(x)} N/kg — about a fifth of the value on Earth.', 2, tolerance=0.05)
x = G * 5.0e12 * 7.5e12 / 3500**2
num(*GR, f'Two asteroids, of masses 5.0 × 10¹² kg and 7.5 × 10¹² kg, are 3500 m apart. Calculate the gravitational force between them, in newtons. {CONSTS}.',
    x, 'N', f'F = G m₁m₂/r² = (6.67 × 10⁻¹¹ × 5.0 × 10¹² × 7.5 × 10¹²) ÷ 3500² = {sf(G * 5e12 * 7.5e12)} ÷ {sf(3500**2)} = {sf(x)} N.', 2, 'diagram:gravity-two-bodies', 0.05)
x = sqrt(G * M_EARTH / 4.0e7)
num(*GR, f'A weather satellite orbits the Earth at an orbital radius of 4.0 × 10⁷ m. Calculate its orbital speed, in m/s. {CONSTS} and take the mass of the Earth as 5.97 × 10²⁴ kg.',
    x, 'm/s', f'Gravity provides the centripetal force: GMm/r² = mv²/r, so v = √(GM/r) = √(6.67 × 10⁻¹¹ × 5.97 × 10²⁴ ÷ 4.0 × 10⁷) = √({sf(G * M_EARTH / 4e7)}) = {sf(x)} m/s.', 3, 'diagram:gravity-orbit', 0.05)
x = (G * M_EARTH * (8.0e4)**2 / (4 * pi**2)) ** (1 / 3)
num(*GR, f'A communications satellite orbits the Earth with a period of 8.0 × 10⁴ s. Calculate its orbital radius, in metres. {CONSTS} and take the mass of the Earth as 5.97 × 10²⁴ kg.',
    x, 'm', f'Gravity provides the centripetal force: GMm/r² = m × 4π²r/T², so r³ = GMT²/(4π²) = (6.67 × 10⁻¹¹ × 5.97 × 10²⁴ × (8.0 × 10⁴)²) ÷ 4π² = {sf(x**3)} m³. Taking the cube root, r = {sf(x)} m.', 4, 'diagram:gravity-orbit', 0.05)
x = 2 * pi * sqrt((1.0e8)**3 / (G * 1.90e27))
num(*GR, f'A probe orbits Jupiter (mass 1.90 × 10²⁷ kg) at a radius of 1.0 × 10⁸ m. Calculate the orbital period of the probe, in seconds. {CONSTS}.',
    x, 's', f'From GMm/r² = m × 4π²r/T², T = 2π√(r³/GM) = 2π√((1.0 × 10⁸)³ ÷ (6.67 × 10⁻¹¹ × 1.90 × 10²⁷)) = 2π × {sf(sqrt(1e24 / (G * 1.9e27)))} = {sf(x)} s — about {x / 3600:.1f} hours.', 4, 'diagram:gravity-orbit', 0.05)
r = 5220e3 + 351e3
x = 4 * pi**2 * r**3 / (G * (5.46e3)**2)
num(*GR, f'A spaceship goes into a circular orbit around a planet at a height of 351 km above the surface, with a period of 5.46 × 10³ s. The planet has a radius of 5220 km. Calculate the mass of the planet, in kg. {CONSTS}.',
    x, 'kg', f'The orbital radius is measured from the planet’s centre: r = 5220 km + 351 km = 5571 km = {sf(r, 4)} m. From GMm/r² = m × 4π²r/T², M = 4π²r³/(GT²) = 4π² × ({sf(r, 4)})³ ÷ (6.67 × 10⁻¹¹ × (5.46 × 10³)²) = {sf(x)} kg.', 5, 'diagram:gravity-orbit', 0.05)
x = 4 * pi**2 * (9.38e6)**3 / (G * (2.76e4)**2)
num(*GR, f'Phobos, one of the moons of Mars, orbits at a mean radius of 9.38 × 10⁶ m with a period of 2.76 × 10⁴ s. Calculate the mass of Mars, in kg. {CONSTS}.',
    x, 'kg', f'Gravity provides Phobos’s centripetal force: GMm/r² = m × 4π²r/T², so M = 4π²r³/(GT²) = 4π² × (9.38 × 10⁶)³ ÷ (6.67 × 10⁻¹¹ × (2.76 × 10⁴)²) = {sf(x)} kg.', 4, 'diagram:gravity-orbit', 0.05)

# ── Coulomb's law additions ───────────────────────────────────────────────
CO = (COULOMB_TOPIC, CH17)
K = 'Use k = 9.0 × 10⁹ N·m²/C²'


def net(target, others):
    fx = fy = 0.0
    parts = []
    for q, x, y in others:
        dx, dy = target[1] - x, target[2] - y
        d = hypot(dx, dy)
        f = k * target[0] * q / d**2
        fx += f * dx / d
        fy += f * dy / d
        parts.append(abs(f))
    return hypot(fx, fy), degrees(atan2(fy, fx)), parts


F, ang, (f2, f3) = net((2e-6, 0, 0), [(-3e-6, 0.40, 0), (1e-6, 0, 0.30)])
num(*CO, f'Three charges are arranged in an L-shape, as shown. q₁ = +2.0 × 10⁻⁶ C is at the origin, q₂ = −3.0 × 10⁻⁶ C is on the x-axis 0.40 m from q₁, and q₃ = +1.0 × 10⁻⁶ C is on the y-axis 0.30 m from q₁. Calculate the magnitude of the net electrostatic force on q₁, in newtons. {K}.',
    F, 'N', f'q₂ has the opposite sign, so it attracts q₁ along +x: F₁₂ = (9.0 × 10⁹ × 2.0 × 10⁻⁶ × 3.0 × 10⁻⁶) ÷ 0.40² = {sf(f2)} N. q₃ has the same sign, so it repels q₁ along −y: F₁₃ = (9.0 × 10⁹ × 2.0 × 10⁻⁶ × 1.0 × 10⁻⁶) ÷ 0.30² = {sf(f3)} N. The two are at right angles: F = √({sf(f2)}² + {sf(f3)}²) = {sf(F)} N, directed {abs(ang):.1f}° below the +x axis.', 3, 'diagram:coulomb-l-shape-origin', 0.05)
F, ang, (f2, f3) = net((5e-3, 0, 0), [(-8e-3, 3.0, 0), (1e-3, 0, 4.0)])
num(*CO, f'Charge qA = +5.0 mC is at (0, 0), qB = −8.0 mC is at (3.0 m, 0) and qC = +1.0 mC is at (0, 4.0 m), as shown. Calculate the magnitude of the net electrostatic force on qA, in newtons. {K}.',
    F, 'N', f'1 mC = 1.0 × 10⁻³ C. qB attracts qA along +x: F = (9.0 × 10⁹ × 5.0 × 10⁻³ × 8.0 × 10⁻³) ÷ 3.0² = {sf(f2)} N. qC repels qA along −y: F = (9.0 × 10⁹ × 5.0 × 10⁻³ × 1.0 × 10⁻³) ÷ 4.0² = {sf(f3)} N. Net force = √({sf(f2)}² + {sf(f3)}²) = {sf(F)} N, pointing {abs(ang):.1f}° below the +x axis.', 3, 'diagram:coulomb-l-shape-millicoulomb', 0.05)
F, ang, (fa, fb) = net((2e-9, 0, 0.10), [(-4e-9, 0, 0), (5e-9, 0.20, 0)])
num(*CO, f'Two charges, qa = −4.0 × 10⁻⁹ C and qb = +5.0 × 10⁻⁹ C, are 0.20 m apart. A third charge, qc = +2.0 × 10⁻⁹ C, sits 0.10 m from qa so that the three form a right-angled triangle with the right angle at qa, as shown. Calculate the magnitude of the net electrostatic force on qc, in newtons. {K}.',
    F, 'N', f'qa attracts qc straight towards qa: F = (9.0 × 10⁹ × 2.0 × 10⁻⁹ × 4.0 × 10⁻⁹) ÷ 0.10² = {sf(fa)} N. qc is √(0.20² + 0.10²) = 0.224 m from qb, which repels it along the line from qb to qc: F = (9.0 × 10⁹ × 2.0 × 10⁻⁹ × 5.0 × 10⁻⁹) ÷ 0.050 = {sf(fb)} N. These are NOT at right angles, so resolve: the qb force has components {sf(fb * 0.2 / sqrt(0.05))} N away from qb (parallel to qa–qb) and {sf(fb * 0.1 / sqrt(0.05))} N away from qa. Net: {sf(fb * 0.2 / sqrt(0.05))} N sideways and {sf(fa - fb * 0.1 / sqrt(0.05))} N towards qa, so F = {sf(F)} N.', 4, 'diagram:coulomb-l-shape-nanocoulomb', 0.05)
F, ang, (fy, fz) = net((10e-9, 0, 0), [(5e-9, 1.0, 0), (-10e-9, 0, 1.0)])
num(*CO, f'Charge qx = +10 nC is at the origin. qy = +5.0 nC is 1.0 m to its right on the x-axis, and qz = −10 nC is 1.0 m directly above it on the y-axis, as shown. Calculate the magnitude of the net force on qx, in newtons. {K}.',
    F, 'N', f'1 nC = 1.0 × 10⁻⁹ C. qy repels qx to the left: F = (9.0 × 10⁹ × 10 × 10⁻⁹ × 5.0 × 10⁻⁹) ÷ 1.0² = {sf(fy)} N. qz attracts qx upwards: F = (9.0 × 10⁹ × 10 × 10⁻⁹ × 10 × 10⁻⁹) ÷ 1.0² = {sf(fz)} N. Net = √({sq(fy)} + {sq(fz)}) = {sf(F)} N, pointing up and to the left, {degrees(atan(fy / fz)):.1f}° from the vertical.', 3, 'diagram:coulomb-l-shape-unit', 0.05)
F, ang, (fa, fb) = net((2e-6, 0.25, 0.5 * sqrt(3) / 2), [(4e-6, 0, 0), (-6e-6, 0.5, 0)])
num(*CO, f'Three charges sit at the corners of an equilateral triangle of side 0.50 m, as shown: qA = +4.0 µC, qB = −6.0 µC and qC = +2.0 µC. Calculate the magnitude of the net electrostatic force on qC, in newtons. {K}.',
    F, 'N', f'1 µC = 1.0 × 10⁻⁶ C. qA repels qC along the line A→C: F = (9.0 × 10⁹ × 4.0 × 10⁻⁶ × 2.0 × 10⁻⁶) ÷ 0.50² = {sf(fa)} N. qB attracts qC along the line C→B: F = (9.0 × 10⁹ × 6.0 × 10⁻⁶ × 2.0 × 10⁻⁶) ÷ 0.50² = {sf(fb)} N. Each line is at 60° to the base. Horizontal components add: ({sf(fa)} + {sf(fb)}) × cos60° = {sf((fa + fb) / 2)} N. Vertical components oppose: ({sf(fb)} − {sf(fa)}) × sin60° = {sf((fb - fa) * sqrt(3) / 2)} N downwards. Net F = √({sf((fa + fb) / 2)}² + {sf((fb - fa) * sqrt(3) / 2)}²) = {sf(F)} N, pointing {abs(ang):.1f}° below the direction from qA to qB.', 4, 'diagram:coulomb-equilateral', 0.05)
F, ang, (f1, f3) = net((-5e-9, 0.30, 0), [(8e-9, 0, 0), (6e-9, -0.25, sqrt(0.25 - 0.0625))])
num(*CO, f'q₁ = +8.0 nC is at the origin and q₂ = −5.0 nC is on the x-axis at (0.30 m, 0). q₃ = +6.0 nC is 0.50 m from q₁ and 0.70 m from q₂, as shown. Calculate the magnitude of the net electrostatic force on q₂, in newtons. {K}.',
    F, 'N', f'q₁ attracts q₂ along −x: F = (9.0 × 10⁹ × 8.0 × 10⁻⁹ × 5.0 × 10⁻⁹) ÷ 0.30² = {sf(f1)} N. q₃ attracts q₂ towards q₃: F = (9.0 × 10⁹ × 6.0 × 10⁻⁹ × 5.0 × 10⁻⁹) ÷ 0.70² = {sf(f3)} N. Solving for q₃’s position (x² + y² = 0.50², (x − 0.30)² + y² = 0.70²) puts it at (−0.25 m, 0.433 m), so the line from q₂ to q₃ makes {degrees(atan2(0.433, 0.55)):.1f}° with the −x direction. Components: x = −{sf(f1)} − {sf(f3)} × {0.55 / 0.7:.3f} = {sf(-(f1 + f3 * 0.55 / 0.7))} N; y = {sf(f3)} × {0.433 / 0.7:.3f} = {sf(f3 * 0.433 / 0.7)} N. F = {sf(F)} N, at {ang:.0f}° to the +x axis.', 4, 'diagram:coulomb-triangle-scalene', 0.05)

x = sqrt(k * 5e-6 * 8e-6 / 0.90)
num(*CO, f'Two point charges, q₁ = +5.0 × 10⁻⁶ C and q₂ = +8.0 × 10⁻⁶ C, repel each other with a force of 0.90 N. Calculate the distance between them, in metres. {K}.',
    x, 'm', f'Rearrange F = kq₁q₂/r²: r = √(kq₁q₂/F) = √(9.0 × 10⁹ × 5.0 × 10⁻⁶ × 8.0 × 10⁻⁶ ÷ 0.90) = √{sf(k * 4e-11 / 0.9)} = {sf(x)} m.', 2, 'diagram:coulomb-two-charges')
x = sqrt(k * (1.6e-19)**2 / 2.0e-8)
num(*CO, f'An electron (charge −1.60 × 10⁻¹⁹ C) and a proton (charge +1.60 × 10⁻¹⁹ C) attract each other with a force of 2.0 × 10⁻⁸ N. Calculate their separation, in metres. {K}.',
    x, 'm', f'r = √(k|q₁q₂|/F) = √(9.0 × 10⁹ × (1.60 × 10⁻¹⁹)² ÷ 2.0 × 10⁻⁸) = √({sf(k * 2.56e-38 / 2e-8)}) = {sf(x)} m — about the size of an atom.', 3, 'diagram:coulomb-two-charges', 0.05)
x = sqrt(k * 1e-3 * 2e-3 / 1.5)
num(*CO, f'Two oppositely charged spheres, carrying charges of magnitude 1.0 mC and 2.0 mC, attract each other with a force of 1.5 N. Calculate the distance between their centres, in metres. {K}.',
    x, 'm', f'1 mC = 1.0 × 10⁻³ C. r = √(k|q₁q₂|/F) = √(9.0 × 10⁹ × 1.0 × 10⁻³ × 2.0 × 10⁻³ ÷ 1.5) = √{sf(k * 2e-6 / 1.5)} = {sf(x)} m.', 2, 'diagram:coulomb-two-charges')
x = sqrt(k * (4e-9)**2 / 5.0e-4)
num(*CO, f'Two identical small metal spheres each carry a charge of −4.0 nC. They repel each other with a force of 5.0 × 10⁻⁴ N. How far apart are they, in metres? {K}.',
    x, 'm', f'1 nC = 1.0 × 10⁻⁹ C. r = √(kq²/F) = √(9.0 × 10⁹ × (4.0 × 10⁻⁹)² ÷ 5.0 × 10⁻⁴) = √({sf(k * 1.6e-17 / 5e-4)}) = {sf(x)} m, or about 1.7 cm.', 2, 'diagram:coulomb-two-charges')
x = sqrt(k * 25e-3 * 5e-3 / 1000)
num(*CO, f'A charge of 25 mC exerts a force of 1000 N on a second charge of 5.0 mC. Calculate the distance between the two charges, in metres. {K}.',
    x, 'm', f'r = √(kq₁q₂/F) = √(9.0 × 10⁹ × 25 × 10⁻³ × 5.0 × 10⁻³ ÷ 1000) = √{sf(k * 1.25e-4 / 1000, 4)} = {sf(x)} m.', 2, 'diagram:coulomb-two-charges')
x = 0.27 * 0.5**2 / (k * 3e-3)
num(*CO, f'A point charge q₁ = +3.0 mC is 0.50 m from a second charge q₂. The attractive force between them is 0.27 N. Calculate the magnitude of q₂, in coulombs. {K}.',
    x, 'C', f'Rearrange F = kq₁q₂/r²: q₂ = F r²/(k q₁) = (0.27 × 0.50²) ÷ (9.0 × 10⁹ × 3.0 × 10⁻³) = 0.0675 ÷ {sf(k * 3e-3)} = {sf(x)} C (2.5 nC). It must be negative, since the force is attractive.', 2, 'diagram:coulomb-two-charges')
x = 1.08 * 1.0**2 / (k * 4e-5)
num(*CO, f'Two charges are 1.0 m apart. One of them is +4.0 × 10⁻⁵ C, and the repulsive force between them is 1.08 N. Calculate the magnitude of the second charge, in coulombs. {K}.',
    x, 'C', f'q₂ = F r²/(k q₁) = (1.08 × 1.0²) ÷ (9.0 × 10⁹ × 4.0 × 10⁻⁵) = 1.08 ÷ {sf(k * 4e-5)} = {sf(x)} C. It is positive, like the first charge, because the force is repulsive.', 2, 'diagram:coulomb-two-charges')
x = sqrt(0.050 * 0.15**2 / k)
num(*CO, f'Two identical small plastic spheres are 0.15 m apart and repel each other with a force of 0.050 N. The charges on them are equal. Calculate the magnitude of the charge on each sphere, in coulombs. {K}.',
    x, 'C', f'With q₁ = q₂ = q, F = kq²/r², so q = √(F r²/k) = √(0.050 × 0.15² ÷ 9.0 × 10⁹) = √({sf(0.05 * 0.0225 / k)}) = {sf(x)} C.', 3, 'diagram:coulomb-two-charges', 0.05)
x = 3.375 * 0.2**2 / (k * 1.5e-6)
num(*CO, f'A charge of −1.5 × 10⁻⁶ C is 0.20 m from an unknown charge qx. The force between them is 3.375 N and it is attractive. Calculate qx in coulombs, including its sign. {K}.',
    x, 'C', f'Magnitude: |qx| = F r²/(k|q|) = (3.375 × 0.20²) ÷ (9.0 × 10⁹ × 1.5 × 10⁻⁶) = 0.135 ÷ {sf(k * 1.5e-6)} = {sf(x)} C. The force is attractive, so qx has the opposite sign to the negative charge: qx = +{sf(x)} C.', 3, 'diagram:coulomb-two-charges', 0.05, sign=True)
x = 0.15 * 0.030**2 / (k * 5e-9)
num(*CO, f'Two charges, qA and qB = −5.0 nC, are 0.030 m apart. The attractive force between them is 0.15 N. Calculate the magnitude of qA, in coulombs. {K}.',
    x, 'C', f'|qA| = F r²/(k|qB|) = (0.15 × 0.030²) ÷ (9.0 × 10⁹ × 5.0 × 10⁻⁹) = {sf(0.15 * 9e-4)} ÷ 45 = {sf(x)} C. (It is positive, since the force is attractive and qB is negative.)', 3, 'diagram:coulomb-two-charges', 0.05)


# ── SQL ───────────────────────────────────────────────────────────────────
def lit(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


out = [
    '-- Practice questions from the owner\'s circular motion, gravitation and',
    '-- Coulomb worksheets (2026-09-22). Generated: answers are computed from each',
    '-- question\'s own numbers. Run once; re-running is a no-op.',
    'BEGIN;',
    f"INSERT INTO topics (id, chapter_id, topic_name, description, \"order\", required_tier) VALUES",
    f"  ({lit(CIRC_TOPIC)}, {lit(CH3)}, '3.7 Circular motion (extension)', {lit('Motion in a circle at constant speed: v = 2πr/T, a = v²/r and F = mv²/r, then vertical circles and conical pendulums. Extension material — the Cambridge IGCSE 0625 core (3.3) only asks for the direction of the force; this is standard groundwork for AS/A Level and AP Physics.')}, 7, 0),",
    f"  ({lit(GRAV_TOPIC)}, {lit(CH24)}, '24.3 Gravitation and orbits (extension)', {lit('Newton’s law of gravitation, F = Gm₁m₂/r², and circular orbits: field strength, orbital speed, period and the mass of a planet from an orbit. Extension material beyond the Cambridge IGCSE 0625 core, following on from 24.2 The Solar System.')}, 3, 0)",
    'ON CONFLICT (id) DO NOTHING;',
]

counters = {CIRC_TOPIC: 0, GRAV_TOPIC: 0, COULOMB_TOPIC: 41}
for q in questions:
    counters[q['topic']] += 1
    n = counters[q['topic']]
    pid = str(uuid.uuid5(uuid.NAMESPACE_URL, f"ashphys/problem/{q['topic']}/{n}"))
    out.append(
        'INSERT INTO problems (id, chapter_id, topic_id, problem_number, "order", question_text, question_image_url, '
        'difficulty_level, answer_type, answer_correct, answer_unit, answer_tolerance, answer_sign_sensitive, explanation, points) VALUES '
        f"({lit(pid)}, {lit(q['chapter'])}, {lit(q['topic'])}, {n}, {n}, {lit(q['text'])}, {lit(q['figure'])}, "
        f"{q['difficulty']}, {lit(q['type'])}::answer_type, {lit(q['answer'])}, {lit(q['unit'])}, {lit(q['tolerance'])}, "
        f"{lit(q['sign'])}, {lit(q['explanation'])}, {min(q['difficulty'], 3)}) ON CONFLICT (id) DO NOTHING;"
    )
    if q['options']:
        for i, (text, ok) in enumerate(q['options']):
            oid = str(uuid.uuid5(uuid.NAMESPACE_URL, f'ashphys/option/{pid}/{i}'))
            out.append(
                'INSERT INTO problem_options (id, problem_id, option_text, option_letter, is_correct, "order") VALUES '
                f"({lit(oid)}, {lit(pid)}, {lit(text)}, {lit('ABCD'[i])}, {lit(ok)}, {i + 1}) ON CONFLICT (id) DO NOTHING;"
            )
out.append('COMMIT;')

import sys
open(sys.argv[1], 'w').write('\n'.join(out) + '\n')
print({t[:8]: c for t, c in counters.items()}, len(questions), 'questions')
