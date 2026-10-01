-- Realign the 9702 course with the coursebook's own chapter structure.
--
-- Until now the AS & A Level course followed the published syllabus: 25 units
-- numbered 1-25, with AS ending at unit 11. Students work from "Physics for
-- Cambridge International AS & A Level Coursebook, 3rd edition" (Sang, Jones,
-- Chadha, Woodside, 2020), whose chapters are numbered differently and named
-- differently, so the site and the book disagreed on every chapter.
--
-- This migration rebuilds the 9702 chapters as the coursebook has them:
--   AS       chapters 1-15  (Kinematics ... Atomic structure) + P1
--   A Level  chapters 16-31 (Circular motion ... Astronomy)   + P2
--
-- `chapters.chapter_number` is an integer, so the lettered practical-skills
-- chapters are stored as 32 (P1) and 33 (P2); lib/curricula/index.ts maps
-- those two numbers back to their coursebook labels.
--
-- Every lesson keeps its identity (topics.id is unchanged), so all practice
-- questions, mastery records and simulation links survive: only the chapter a
-- lesson hangs off and the syllabus code it carries are rewritten.

BEGIN;


-- 1. Park the old syllabus chapters: UNIQUE (course_id, chapter_number) means
--    the new numbers cannot be inserted while the old ones still hold them.
UPDATE chapters SET chapter_number = chapter_number + 1000
WHERE course_id = '054471b1-6437-5190-89fe-3bd34e5cafdd' AND chapter_number < 1000;

-- 2. The coursebook's chapters.
INSERT INTO chapters (course_id, chapter_number, title, status, "order")
SELECT '054471b1-6437-5190-89fe-3bd34e5cafdd', n, t, 'published', n
FROM (VALUES
 (1,'Kinematics'),(2,'Accelerated motion'),(3,'Dynamics'),(4,'Forces'),
 (5,'Work, energy and power'),(6,'Momentum'),(7,'Matter and materials'),
 (8,'Electric current'),(9,'Kirchhoff''s laws'),(10,'Resistance and resistivity'),
 (11,'Practical circuits'),(12,'Waves'),(13,'Superposition of waves'),
 (14,'Stationary waves'),(15,'Atomic structure'),
 (16,'Circular motion'),(17,'Gravitational fields'),(18,'Oscillations'),
 (19,'Thermal physics'),(20,'Ideal gases'),(21,'Uniform electric fields'),
 (22,'Coulomb''s law'),(23,'Capacitance'),(24,'Magnetic fields and electromagnetism'),
 (25,'Motion of charged particles'),(26,'Electromagnetic induction'),
 (27,'Alternating currents'),(28,'Quantum physics'),(29,'Nuclear physics'),
 (30,'Medical imaging'),(31,'Astronomy and cosmology'),
 (32,'Practical skills at AS Level'),(33,'Practical skills at A Level')
) AS v(n,t);

-- 3. Move each 9702 lesson to the coursebook section that covers it. A lesson
--    that AS also lists keeps an as_topic_code; A Level-only lessons do not.
WITH m(old_ch, tname, code) AS (VALUES
 (1,'SI base units and homogeneity','3.7'),(1,'Errors and uncertainties','P1.4'),
 (2,'Equations of motion','2.8'),(2,'Projectile motion','2.13'),
 (3,'Momentum and Newton''s laws of motion','6.6'),(3,'Drag and terminal velocity','3.5'),
 (3,'Conservation of momentum and collisions','6.2'),
 (4,'Couples and torque','4.5'),(4,'Equilibrium and the triangle of forces','4.1'),
 (4,'Upthrust and Archimedes’ principle','7.3'),
 (5,'Work, efficiency and power','5.1'),(5,'Gravitational potential energy and kinetic energy','5.4'),
 (6,'Stress, strain and the Young modulus','7.5'),(6,'Elastic and plastic behaviour','7.6'),
 (7,'Progressive waves','12.1'),(7,'Transverse and longitudinal waves','12.2'),
 (7,'Doppler effect for sound waves','12.5'),(7,'The electromagnetic spectrum','12.6'),
 (7,'Polarisation and Malus’s law','12.10'),
 (8,'Stationary waves','14.3'),(8,'Diffraction','13.2'),(8,'The diffraction grating','13.5'),
 (9,'Electric current and charge carriers','8.3'),(9,'Potential difference and power','8.6'),
 (9,'Resistivity and I–V characteristics','10.4'),
 (10,'EMF and internal resistance','11.1'),(10,'Kirchhoff''s laws','9.3'),(10,'Potential dividers','11.2'),
 (11,'The nuclear atom and radioactive decay','15.2'),(11,'Quarks, hadrons and leptons','15.10'),
 (12,'Radians and angular speed','16.2'),
 (13,'Gravitational fields and field lines','17.1'),(13,'Field strength of a point mass','17.2'),
 (13,'Gravitational potential','17.4'),
 (14,'Thermal equilibrium','19.4'),(14,'Temperature scales','19.5'),
 (14,'Specific heat capacity and latent heat','19.6'),
 (15,'The mole and the Avogadro constant','20.3'),(15,'The ideal gas equation','20.6'),
 (15,'Kinetic theory of gases','20.7'),
 (16,'Internal energy','19.3'),(16,'The first law of thermodynamics','19.2'),
 (17,'Simple harmonic motion','18.4'),(17,'Energy in simple harmonic motion','18.8'),
 (17,'Damped and forced oscillations, resonance','18.10'),
 (18,'Electric fields and field lines','21.2'),(18,'Uniform electric fields','21.3'),
 (18,'Field strength of a point charge','22.3'),(18,'Electric potential','22.4'),
 (19,'Capacitors and capacitance','23.1'),(19,'Energy stored in a capacitor','23.2'),
 (19,'Discharging a capacitor','23.7'),
 (20,'Magnetic fields and flux density','24.3'),(20,'Force on a current-carrying conductor','24.2'),
 (20,'Force on a moving charge','25.1'),(20,'Magnetic fields due to currents','24.1'),
 (20,'Electromagnetic induction','26.3'),
 (21,'Alternating current and r.m.s. values','27.1'),(21,'Rectification and smoothing','27.4'),
 (22,'Photons: energy and momentum','28.2'),(22,'The photoelectric effect','28.3'),
 (22,'Wave–particle duality','28.10'),(22,'Energy levels and line spectra','28.6'),
 (23,'Mass defect and binding energy','29.4'),
 (24,'Ultrasound','30.5'),(24,'X-ray imaging and CT','30.1'),(24,'PET scanning','30.8'),
 (25,'Standard candles and luminosity','31.1'),(25,'Stellar radii: Wien and Stefan–Boltzmann','31.3'),
 (25,'Hubble’s law and the Big Bang','31.4')
),
resolved AS (
  SELECT t.id AS topic_id, m.code,
         CASE WHEN m.code LIKE 'P1.%' THEN 32
              WHEN m.code LIKE 'P2.%' THEN 33
              ELSE split_part(m.code,'.',1)::int END AS new_ch,
         split_part(m.code,'.',2)::int AS new_order,
         ('as' = ANY(t.curriculum_ids)) AS is_as
  FROM m
  JOIN chapters oc ON oc.course_id='054471b1-6437-5190-89fe-3bd34e5cafdd'
                  AND oc.chapter_number = m.old_ch + 1000
  JOIN topics t ON t.chapter_id = oc.id AND t.topic_name = m.tname
)
UPDATE topics t
SET chapter_id = nc.id,
    "order" = r.new_order,
    a_level_topic_code = r.code,
    as_topic_code = CASE WHEN r.is_as THEN r.code ELSE NULL END
FROM resolved r
JOIN chapters nc ON nc.course_id='054471b1-6437-5190-89fe-3bd34e5cafdd'
                AND nc.chapter_number = r.new_ch
WHERE t.id = r.topic_id;

-- 4. Questions follow their lesson, and cite the coursebook section.
UPDATE problems p
SET chapter_id = t.chapter_id,
    topic_code = COALESCE(
      CASE WHEN p.curriculum_id = 'as' THEN t.as_topic_code ELSE t.a_level_topic_code END,
      t.a_level_topic_code),
    syllabus_cite = '9702 coursebook ' ||
      COALESCE(CASE WHEN p.curriculum_id = 'as' THEN t.as_topic_code ELSE t.a_level_topic_code END,
               t.a_level_topic_code) || ' · ' || t.topic_name
FROM topics t
JOIN chapters c ON c.id = t.chapter_id
WHERE p.topic_id = t.id
  AND c.course_id = '054471b1-6437-5190-89fe-3bd34e5cafdd'
  AND p.curriculum_id IN ('as','a-level');

-- IB questions sit on shared 9702 lessons: keep their IB code, follow the chapter.
UPDATE problems p SET chapter_id = t.chapter_id
FROM topics t WHERE p.topic_id = t.id AND p.chapter_id <> t.chapter_id;

-- 5. Shared IGCSE-course lessons that AS / A Level also list need coursebook codes.
WITH m(tname, code, as_too) AS (VALUES
 ('Unit Prefixes','3.7',true),
 ('Order of Magnitude & Estimation','3.7',true),
 ('Vectors: Addition & Resolution','1.5',true),
 ('2.2 Distance-time graphs','1.4',true),
 ('3.4 Force, mass and acceleration','3.1',true),
 ('3.7 Circular motion (extension)','16.1',false),
 ('4.2 Calculating moments','4.4',true),
 ('5.3 The limit of proportionality and the spring constant','7.5',true),
 ('5.5 Calculating pressure','7.2',true),
 ('9.5 The gas laws','20.4',false),
 ('14.3 Explaining wave phenomena','13.1',true),
 ('17.4 Coulomb''s law (extension)','22.2',false),
 ('18.3 Electrical resistance','8.5',true),
 ('19.2 Combinations of resistors','9.4',true),
 ('23.3 Activity and half-life','29.8',false),
 ('24.3 Gravitation and orbits (extension)','17.5',false)
)
UPDATE topics t
SET a_level_topic_code = m.code,
    as_topic_code = CASE WHEN m.as_too THEN m.code ELSE NULL END
FROM m WHERE t.topic_name = m.tname;

-- 6. The parked syllabus chapters are now empty; drop them.
DELETE FROM chapters
WHERE course_id = '054471b1-6437-5190-89fe-3bd34e5cafdd' AND chapter_number >= 1000;

COMMIT;
