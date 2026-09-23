-- The first two Three.js labs: circular motion (topic 3.7) and Coulomb's law (topic 17.4).
-- Idempotent: each row is only added if its url_path is not already there.

INSERT INTO simulations (chapter_id, topic_id, title, description, sim_type, url_path, difficulty_level, learning_objectives, "order", required_tier)
SELECT 'a86aff95-adbc-4634-af1f-528e375e2230', 'db2c98d5-dd86-5faf-9121-5533bdd5d212',
  'Circular Motion Lab: Horizontal, Vertical & Conical',
  'A 3D lab you can walk around: whirl a mass in a horizontal circle, swing it round a vertical circle, or send it round as a conical pendulum. Tension, weight, velocity and the resultant centripetal force are drawn to scale and update live; resolve the tension into T cos θ and T sin θ, drop below √(gr) to watch the string go slack at the top, or cut the string and see the mass leave along the tangent. Every practice-question setup is one click away.',
  'force_diagram', '/simulations/circular-motion', 3,
  'Apply F = mv²/r to horizontal circles, vertical circles (T − mg and T + mg) and the conical pendulum (T cos θ = mg, T sin θ = mv²/r); explain why the velocity is tangential and why a mass leaves along the tangent when the centripetal force is removed.',
  2, 0
WHERE NOT EXISTS (SELECT 1 FROM simulations WHERE url_path = '/simulations/circular-motion');

INSERT INTO simulations (chapter_id, topic_id, title, description, sim_type, url_path, difficulty_level, learning_objectives, "order", required_tier)
SELECT '7137f560-2406-4a69-9099-4c845ef53ea8', 'c6c1d1f5-1c6b-4ab4-a15b-beea25426304',
  'Coulomb''s Law Lab: Forces Between Charges',
  'Charges floating in 3D with their field lines traced live. With two charges, change q and r and watch the equal-and-opposite forces follow F = kq₁q₂/r²: double r and the force drops to a quarter. With three, drag the charges around and see the two forces on one of them add, parallelogram and all, to the net force, with every component in a table. Every practice-question arrangement is one click away.',
  'electric_field', '/simulations/coulombs-law', 3,
  'Use F = kq₁q₂/r² with charges in nC, µC and mC; recognise the inverse-square law and Newton''s third law for charges; find the net force on a charge from two others by adding components.',
  1, 0
WHERE NOT EXISTS (SELECT 1 FROM simulations WHERE url_path = '/simulations/coulombs-law');
