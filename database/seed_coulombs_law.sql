-- Coulomb's law practice question set (41 questions) for Chapter 17, topic 17.4.
--
-- Block 1 creates the topic if needed and REPLACES the whole question set for
-- it, so the file is safe to re-run while content is being edited. Replacing
-- the problems also clears any problem_submissions rows referencing them (FK
-- cascade) — fine while seeding, worth knowing later. Run the blocks in order.
--
-- Diagrams are internal keys ("diagram:coulomb-…") drawn by
-- components/practice/CoulombDiagrams.tsx, not hosted image files.
-- Every numeric answer was recomputed independently before seeding.

-- Block 1/4 — topic, and a clean slate for its question set.
DO $seed$
DECLARE
  v_chapter uuid;
  v_topic   uuid;
  v_problem uuid;
BEGIN
  SELECT id INTO v_chapter FROM chapters WHERE chapter_number = 17;
  IF v_chapter IS NULL THEN
    RAISE EXCEPTION 'Chapter 17 (Static Electricity) not found';
  END IF;

  SELECT id INTO v_topic FROM topics
   WHERE chapter_id = v_chapter AND topic_name = '17.4 Coulomb''s law (extension)';
  IF v_topic IS NULL THEN
    INSERT INTO topics (chapter_id, topic_name, description, "order", required_tier)
    VALUES (v_chapter, '17.4 Coulomb''s law (extension)', 'Coulomb’s law for the force between point charges: F = kq₁q₂/r². Extension material — it goes beyond the Cambridge IGCSE 0625 core, but follows naturally from 17.3 Electric fields and is standard groundwork for AS/A Level and AP Physics.', 4, 1)
    RETURNING id INTO v_topic;
  END IF;

  DELETE FROM problems WHERE topic_id = v_topic;
END
$seed$;

-- Block 2/4 — questions 1–14.
DO $seed$
DECLARE
  v_chapter uuid;
  v_topic   uuid;
  v_problem uuid;
BEGIN
  SELECT id INTO v_chapter FROM chapters WHERE chapter_number = 17;
  IF v_chapter IS NULL THEN
    RAISE EXCEPTION 'Chapter 17 (Static Electricity) not found';
  END IF;
  SELECT id INTO v_topic FROM topics
   WHERE chapter_id = v_chapter AND topic_name = '17.4 Coulomb''s law (extension)';
  IF v_topic IS NULL THEN
    RAISE EXCEPTION 'Topic % not found - run block 1 of this file first', '17.4 Coulomb''s law (extension)';
  END IF;

  -- Q1 (multiple choice, difficulty 1)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 1, 'What is the value of Coulomb''s constant, k?',
          NULL, 1, 'multiple_choice',
          '9.0 × 10⁹ N·m²/C²', 'k = 9.0 × 10⁹ N·m²/C². The other three are the gravitational constant G, the charge on a single electron, and the speed of light — all worth knowing, but none of them belong in Coulomb''s law.', 1, 1)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, '6.7 × 10⁻¹¹ N·m²/kg²', 'A', FALSE, 1),
    (v_problem, '9.0 × 10⁹ N·m²/C²', 'B', TRUE, 2),
    (v_problem, '1.6 × 10⁻¹⁹ C', 'C', FALSE, 3),
    (v_problem, '3.0 × 10⁸ m/s', 'D', FALSE, 4);

  -- Q2 (numeric, difficulty 1)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 2, 'Two point charges of +2.0 C and −4.0 C are placed 2.0 m apart. Calculate the magnitude of the electrostatic force between them. Use k = 9.0 × 10⁹ N·m²/C² and give your answer in newtons.',
          NULL, 1, 'numeric',
          '1.8e10', 'F = k|q₁q₂|/r² = (9.0 × 10⁹ × 2.0 × 4.0) ÷ 2.0² = 7.2 × 10¹⁰ ÷ 4.0 = 1.8 × 10¹⁰ N. The minus sign on the second charge only tells you the force is attractive — use the magnitudes when working out how big it is.', 1, 2)
  RETURNING id INTO v_problem;

  -- Q3 (multiple choice, difficulty 1)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 3, 'What is the SI unit of electric charge?',
          NULL, 1, 'multiple_choice',
          'The coulomb (C)', 'Charge is measured in coulombs (C). The ampere is the unit of current — one ampere is one coulomb of charge flowing past a point every second.', 1, 3)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'The newton (N)', 'A', FALSE, 1),
    (v_problem, 'The ampere (A)', 'B', FALSE, 2),
    (v_problem, 'The coulomb (C)', 'C', TRUE, 3),
    (v_problem, 'The volt (V)', 'D', FALSE, 4);

  -- Q4 (multiple choice, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 4, 'The distance between two point charges is doubled, with the charges unchanged. What happens to the electrostatic force between them?',
          NULL, 2, 'multiple_choice',
          'It falls to one quarter of its original value', 'Coulomb’s law is an inverse-square law: F ∝ 1/r². Doubling r divides the force by 2² = 4, so it drops to one quarter. Halving it would be the answer if the force went as 1/r, which it does not.', 2, 4)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'It is halved', 'A', FALSE, 1),
    (v_problem, 'It falls to one quarter of its original value', 'B', TRUE, 2),
    (v_problem, 'It doubles', 'C', FALSE, 3),
    (v_problem, 'It becomes four times larger', 'D', FALSE, 4);

  -- Q5 (numeric, difficulty 1)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 5, 'Two point charges of +5.0 C and −3.0 C are placed 3.0 m apart. Calculate the magnitude of the electrostatic force between them, in newtons.',
          NULL, 1, 'numeric',
          '1.5e10', 'F = k|q₁q₂|/r² = (9.0 × 10⁹ × 5.0 × 3.0) ÷ 3.0² = 1.35 × 10¹¹ ÷ 9.0 = 1.5 × 10¹⁰ N.', 1, 5)
  RETURNING id INTO v_problem;

  -- Q6 (multiple choice, difficulty 1)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 6, 'Two point charges carry the same sign. What can you say about the electrostatic force between them?',
          NULL, 1, 'multiple_choice',
          'It is repulsive — they are pushed apart', 'Like charges repel, unlike charges attract. Two negatives repel each other exactly as two positives do — what matters is that the signs MATCH, not which sign they are.', 1, 6)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'It is attractive — they are pulled together', 'A', FALSE, 1),
    (v_problem, 'It is zero', 'B', FALSE, 2),
    (v_problem, 'It is attractive if both are negative, but repulsive if both are positive', 'C', FALSE, 3),
    (v_problem, 'It is repulsive — they are pushed apart', 'D', TRUE, 4);

  -- Q7 (multiple choice, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 7, 'The distance between two point charges is halved, with the charges unchanged. What happens to the electrostatic force between them?',
          NULL, 2, 'multiple_choice',
          'It becomes four times larger', 'F ∝ 1/r². Halving r divides r² by 4, so the force is multiplied by 4. Bringing charges closer together strengthens the force fast.', 2, 7)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'It becomes four times larger', 'A', TRUE, 1),
    (v_problem, 'It doubles', 'B', FALSE, 2),
    (v_problem, 'It is halved', 'C', FALSE, 3),
    (v_problem, 'It falls to one quarter', 'D', FALSE, 4);

  -- Q8 (numeric, difficulty 1)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 8, 'Two point charges of +6.0 C and −2.0 C are placed 4.0 m apart. Calculate the magnitude of the electrostatic force between them, in newtons.',
          NULL, 1, 'numeric',
          '6.75e9', 'F = k|q₁q₂|/r² = (9.0 × 10⁹ × 6.0 × 2.0) ÷ 4.0² = 1.08 × 10¹¹ ÷ 16 = 6.75 × 10⁹ N.', 1, 8)
  RETURNING id INTO v_problem;

  -- Q9 (multiple choice, difficulty 1)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 9, 'What is the SI unit of electric force?',
          NULL, 1, 'multiple_choice',
          'The newton (N)', 'Electric force is a force like any other, so it is measured in newtons (N). Only the way it is caused is different — charge rather than contact or gravity.', 1, 9)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'The coulomb (C)', 'A', FALSE, 1),
    (v_problem, 'The newton (N)', 'B', TRUE, 2),
    (v_problem, 'The joule (J)', 'C', FALSE, 3),
    (v_problem, 'The ampere (A)', 'D', FALSE, 4);

  -- Q10 (multiple choice, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 10, 'The electrostatic force between two point charges is 10 N. One of the charges is then doubled, while the other charge and the separation stay the same. What is the new force?',
          NULL, 2, 'multiple_choice',
          '20 N', 'F ∝ q₁q₂. Doubling just one of the charges doubles the product, so the force doubles: 10 N → 20 N.', 2, 10)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, '5 N', 'A', FALSE, 1),
    (v_problem, '10 N', 'B', FALSE, 2),
    (v_problem, '20 N', 'C', TRUE, 3),
    (v_problem, '40 N', 'D', FALSE, 4);

  -- Q11 (multiple choice, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 11, 'The charge q₁ is tripled, while q₂ and the separation are unchanged. What happens to the force between the two charges?',
          NULL, 2, 'multiple_choice',
          'It is three times larger', 'The force is proportional to the product q₁q₂, so tripling one of them triples the force. (Nine times would be the answer if BOTH charges were tripled.)', 2, 11)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'It is three times larger', 'A', TRUE, 1),
    (v_problem, 'It is nine times larger', 'B', FALSE, 2),
    (v_problem, 'It falls to one third', 'C', FALSE, 3),
    (v_problem, 'It does not change', 'D', FALSE, 4);

  -- Q12 (multiple choice, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 12, 'The charge q₂ is quadrupled, while q₁ and the separation are unchanged. What happens to the force between the two charges?',
          NULL, 2, 'multiple_choice',
          'It is four times larger', 'F ∝ q₁q₂, so multiplying one charge by four multiplies the force by four. Charge enters the formula to the first power — only distance is squared.', 2, 12)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'It is twice as large', 'A', FALSE, 1),
    (v_problem, 'It falls to one quarter', 'B', FALSE, 2),
    (v_problem, 'It is four times larger', 'C', TRUE, 3),
    (v_problem, 'It is sixteen times larger', 'D', FALSE, 4);

  -- Q13 (multiple choice, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 13, 'Both q₁ and q₂ are tripled, with the separation unchanged. What happens to the force between them?',
          NULL, 3, 'multiple_choice',
          'It is nine times larger', 'The force depends on the PRODUCT of the charges, so tripling both multiplies it by 3 × 3 = 9. Adding the factors instead of multiplying them is the usual slip — that would wrongly give six.', 3, 13)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'It is three times larger', 'A', FALSE, 1),
    (v_problem, 'It is six times larger', 'B', FALSE, 2),
    (v_problem, 'It is nine times larger', 'C', TRUE, 3),
    (v_problem, 'It is twenty-seven times larger', 'D', FALSE, 4);

  -- Q14 (multiple choice, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 14, 'The distance between two charges is quadrupled, with the charges unchanged. What happens to the force between them?',
          NULL, 3, 'multiple_choice',
          'It falls to one sixteenth', 'F ∝ 1/r². Multiplying r by 4 multiplies r² by 16, so the force drops to one sixteenth of what it was. Forgetting to square the 4 gives one quarter — the commonest mistake here.', 3, 14)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'It falls to one quarter', 'A', FALSE, 1),
    (v_problem, 'It falls to one eighth', 'B', FALSE, 2),
    (v_problem, 'It falls to one sixteenth', 'C', TRUE, 3),
    (v_problem, 'It is sixteen times larger', 'D', FALSE, 4);
END
$seed$;

-- Block 3/4 — questions 15–28.
DO $seed$
DECLARE
  v_chapter uuid;
  v_topic   uuid;
  v_problem uuid;
BEGIN
  SELECT id INTO v_chapter FROM chapters WHERE chapter_number = 17;
  IF v_chapter IS NULL THEN
    RAISE EXCEPTION 'Chapter 17 (Static Electricity) not found';
  END IF;
  SELECT id INTO v_topic FROM topics
   WHERE chapter_id = v_chapter AND topic_name = '17.4 Coulomb''s law (extension)';
  IF v_topic IS NULL THEN
    RAISE EXCEPTION 'Topic % not found - run block 1 of this file first', '17.4 Coulomb''s law (extension)';
  END IF;

  -- Q15 (numeric, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 15, 'Find the magnitude of the force between a charge of +10.0 µC and a charge of −50.0 µC placed 20.0 cm apart. Give your answer in newtons.',
          NULL, 2, 'numeric',
          '112.5', 'Convert everything first: q₁ = 1.00 × 10⁻⁵ C, q₂ = 5.00 × 10⁻⁵ C, r = 0.200 m. F = k|q₁q₂|/r² = (9.0 × 10⁹ × 1.00 × 10⁻⁵ × 5.00 × 10⁻⁵) ÷ 0.200² = 4.5 ÷ 0.0400 = 112.5 N. Leaving the distance in centimetres, or forgetting to square it, are the two classic ways to lose this one.', 2, 15)
  RETURNING id INTO v_problem;

  -- Q16 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 16, 'Two spheres carry identical charges and are 75 cm apart. The force between them is 0.30 N. What is the magnitude of the charge on each sphere, in coulombs?',
          NULL, 3, 'numeric',
          '4.33e-6', 'Because the charges are equal, F = kq²/r². Rearranging, q = √(Fr²/k) = √(0.30 × 0.75² ÷ 9.0 × 10⁹) = √(0.16875 ÷ 9.0 × 10⁹) = √(1.875 × 10⁻¹¹) = 4.33 × 10⁻⁶ C, or about 4.3 µC.', 3, 16)
  RETURNING id INTO v_problem;

  -- Q17 (multiple choice, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 17, 'Two spheres carrying identical charges push each other apart. What does that tell you about the signs of the charges?',
          NULL, 2, 'multiple_choice',
          'Both carry the same sign: either both positive or both negative', 'A repulsive force means like charges. You can tell the two signs MATCH, but not which sign they are — two negatives push apart exactly as hard as two positives, so "both positive" cannot be concluded on its own.', 2, 17)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'They carry opposite signs — one positive, one negative', 'A', FALSE, 1),
    (v_problem, 'Both carry the same sign: either both positive or both negative', 'B', TRUE, 2),
    (v_problem, 'One is charged and the other is neutral', 'C', FALSE, 3),
    (v_problem, 'Both must be positive, since the force is positive', 'D', FALSE, 4);

  -- Q18 (multiple choice, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 18, 'Two charged particles attract each other with a force F. The distance between them is then halved AND the charge on each particle is doubled. What is the new force?',
          NULL, 3, 'multiple_choice',
          '16F', 'Take the two changes one at a time. Doubling both charges multiplies the product q₁q₂ by 2 × 2 = 4. Halving the distance divides r² by 4, which multiplies the force by another 4. Together: 4 × 4 = 16F. For comparison — doubling one charge alone gives 2F, doubling both gives 4F, and doubling the distance alone gives F/4.', 3, 18)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, '2F', 'A', FALSE, 1),
    (v_problem, '4F', 'B', FALSE, 2),
    (v_problem, '8F', 'C', FALSE, 3),
    (v_problem, '16F', 'D', TRUE, 4);

  -- Q19 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 19, 'Two spheres each carry a charge of 2.5 × 10⁻⁶ C, and the force between them is 0.50 N. How far apart are they? Give your answer in metres.',
          NULL, 3, 'numeric',
          '0.335', 'Rearrange for r: r = √(kq₁q₂/F) = √(9.0 × 10⁹ × 2.5 × 10⁻⁶ × 2.5 × 10⁻⁶ ÷ 0.50) = √(0.05625 ÷ 0.50) = √0.1125 = 0.335 m, about 34 cm. Remember to take the square root at the end — stopping at 0.1125 leaves you with r², not r.', 3, 19)
  RETURNING id INTO v_problem;

  -- Q20 (numeric, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 20, 'A charge of −2.0 C and a charge of +3.0 C are separated by 80 m. Calculate the magnitude of the force between them, in newtons.',
          NULL, 2, 'numeric',
          '8.44e6', 'F = k|q₁q₂|/r² = (9.0 × 10⁹ × 2.0 × 3.0) ÷ 80² = 5.4 × 10¹⁰ ÷ 6400 = 8.4 × 10⁶ N. The signs are opposite, so this force is attractive.', 2, 20)
  RETURNING id INTO v_problem;

  -- Q21 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 21, 'A charge of −5.0 × 10⁻⁴ C exerts an attractive force of 9.0 N on a second charge 10 m away. What is the magnitude of the second charge, in coulombs?',
          NULL, 3, 'numeric',
          '2.0e-4', 'Rearrange for the unknown charge: q₂ = Fr²/(kq₁) = (9.0 × 10²) ÷ (9.0 × 10⁹ × 5.0 × 10⁻⁴) = 900 ÷ (4.5 × 10⁶) = 2.0 × 10⁻⁴ C. Because the force is attractive and the first charge is negative, the second one must be positive.', 3, 21)
  RETURNING id INTO v_problem;

  -- Q22 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 22, 'Two charges, both −3.0 C, push each other apart with a force of 19.2 N. How far apart are they? Give your answer in metres.',
          NULL, 3, 'numeric',
          '6.5e4', 'r = √(kq₁q₂/F) = √(9.0 × 10⁹ × 3.0 × 3.0 ÷ 19.2) = √(8.1 × 10¹⁰ ÷ 19.2) = √(4.22 × 10⁹) = 6.5 × 10⁴ m — about 65 km. The answer looks absurd because the question is: a charge of a whole coulomb is enormous, so the charges have to be kilometres apart before the force drops to a mere 19 N.', 3, 22)
  RETURNING id INTO v_problem;

  -- Q23 (numeric, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 23, 'A charge of −4.0 × 10⁻⁵ C and a charge of +7.0 × 10⁻⁵ C are separated by 0.15 m. Calculate the magnitude of the force between them, in newtons.',
          NULL, 2, 'numeric',
          '1120', 'F = k|q₁q₂|/r² = (9.0 × 10⁹ × 4.0 × 10⁻⁵ × 7.0 × 10⁻⁵) ÷ 0.15² = 25.2 ÷ 0.0225 = 1.12 × 10³ N. Watch the 0.15² = 0.0225 — squaring a number smaller than one makes it smaller still, which makes the force bigger.', 2, 23)
  RETURNING id INTO v_problem;

  -- Q24 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 24, 'A charge of −8.0 × 10⁻⁶ C exerts an attractive force of 12 N on a second charge 0.050 m away. What is the magnitude of the second charge, in coulombs?',
          NULL, 3, 'numeric',
          '4.17e-7', 'q₂ = Fr²/(kq₁) = (12 × 0.050²) ÷ (9.0 × 10⁹ × 8.0 × 10⁻⁶) = 0.030 ÷ (7.2 × 10⁴) = 4.2 × 10⁻⁷ C. The force is attractive and the first charge negative, so this one is positive.', 3, 24)
  RETURNING id INTO v_problem;

  -- Q25 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 25, 'Two charges, both −5.0 × 10⁻⁵ C, push each other apart with a force of 15 N. How far apart are they? Give your answer in metres.',
          NULL, 3, 'numeric',
          '1.22', 'r = √(kq₁q₂/F) = √(9.0 × 10⁹ × 5.0 × 10⁻⁵ × 5.0 × 10⁻⁵ ÷ 15) = √(22.5 ÷ 15) = √1.5 = 1.22 m.', 3, 25)
  RETURNING id INTO v_problem;

  -- Q26 (numeric, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 26, 'A distance of 16 cm separates a positive and a negative charge, each of magnitude 1.5 × 10⁻⁵ C. Find the magnitude of the force on each particle, in newtons.',
          NULL, 2, 'numeric',
          '79.1', 'F = k|q₁q₂|/r² = (9.0 × 10⁹ × 1.5 × 10⁻⁵ × 1.5 × 10⁻⁵) ÷ 0.16² = 2.025 ÷ 0.0256 = 79.1 N. Both particles feel the same size of force — they are a Newton’s third law pair — just in opposite directions.', 2, 26)
  RETURNING id INTO v_problem;

  -- Q27 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 27, 'A distance of 25 cm separates a positive and a negative charge, each of magnitude 1.8 C. Find the magnitude of the force on each particle, in newtons.',
          NULL, 3, 'numeric',
          '4.67e11', 'F = (9.0 × 10⁹ × 1.8 × 1.8) ÷ 0.25² = 2.916 × 10¹⁰ ÷ 0.0625 = 4.67 × 10¹¹ N. That is hundreds of billions of newtons, which tells you the question is not physically realistic: charges you can actually put on an object are micro-coulombs, not whole coulombs.', 3, 27)
  RETURNING id INTO v_problem;

  -- Q28 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 28, 'A distance of 1.0 m separates a positive and a negative charge, each of magnitude 1.95 C. Find the magnitude of the force on each particle, in newtons.',
          NULL, 3, 'numeric',
          '3.42e10', 'F = (9.0 × 10⁹ × 1.95 × 1.95) ÷ 1.0² = 3.42 × 10¹⁰ N. With r = 1.0 m the distance divides out entirely, so the whole calculation is just k × q₁ × q₂.', 3, 28)
  RETURNING id INTO v_problem;
END
$seed$;

-- Block 4/4 — questions 29–41.
DO $seed$
DECLARE
  v_chapter uuid;
  v_topic   uuid;
  v_problem uuid;
BEGIN
  SELECT id INTO v_chapter FROM chapters WHERE chapter_number = 17;
  IF v_chapter IS NULL THEN
    RAISE EXCEPTION 'Chapter 17 (Static Electricity) not found';
  END IF;
  SELECT id INTO v_topic FROM topics
   WHERE chapter_id = v_chapter AND topic_name = '17.4 Coulomb''s law (extension)';
  IF v_topic IS NULL THEN
    RAISE EXCEPTION 'Topic % not found - run block 1 of this file first', '17.4 Coulomb''s law (extension)';
  END IF;

  -- Q29 (numeric, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 29, 'How many excess electrons are on a ball carrying a charge of −5.00 × 10⁻¹⁷ C? Take the charge on one electron to be 1.60 × 10⁻¹⁹ C.',
          NULL, 2, 'numeric',
          '313', 'Number of electrons = total charge ÷ charge per electron = 5.00 × 10⁻¹⁷ ÷ 1.60 × 10⁻¹⁹ = 312.5, so about 313 electrons. Charge is quantised — it only ever comes in whole multiples of 1.60 × 10⁻¹⁹ C — so the half-electron here just means the figure in the question was rounded.', 2, 29)
  RETURNING id INTO v_problem;

  -- Q30 (numeric, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 30, 'A strong lightning bolt transfers about 30 C of charge to the earth. How many electrons is that? Take the charge on one electron to be 1.60 × 10⁻¹⁹ C.',
          NULL, 2, 'numeric',
          '1.875e20', 'Number of electrons = 30 ÷ 1.60 × 10⁻¹⁹ = 1.88 × 10²⁰ electrons. Dividing by such a tiny number makes the answer enormous — nearly 200 billion billion electrons in a single flash.', 2, 30)
  RETURNING id INTO v_problem;

  -- Q31 (multiple choice, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 31, 'By how much does the electric force between a pair of charged bodies diminish when their separation is tripled?',
          NULL, 2, 'multiple_choice',
          'It falls to one ninth', 'F ∝ 1/r², so tripling the separation divides the force by 3² = 9 — it falls to one ninth. For comparison, doubling the separation would leave one quarter of the force.', 2, 31)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'It falls to one third', 'A', FALSE, 1),
    (v_problem, 'It falls to one sixth', 'B', FALSE, 2),
    (v_problem, 'It falls to one ninth', 'C', TRUE, 3),
    (v_problem, 'It becomes nine times larger', 'D', FALSE, 4);

  -- Q32 (multiple choice, difficulty 2)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 32, 'Coulomb''s law is written F = kq₁q₂/r². Which of these puts that relationship correctly into words?',
          NULL, 2, 'multiple_choice',
          'The force is proportional to the product of the charges and inversely proportional to the square of the separation', 'Read the formula a piece at a time. The charges are multiplied together on the top, so the force is proportional to their PRODUCT — double either charge and the force doubles. The separation is squared on the bottom, so the force is inversely proportional to the SQUARE of the distance — double the distance and the force falls to a quarter.', 2, 32)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'The force is proportional to the product of the charges and inversely proportional to the separation', 'A', FALSE, 1),
    (v_problem, 'The force is proportional to the sum of the charges and inversely proportional to the square of the separation', 'B', FALSE, 2),
    (v_problem, 'The force is inversely proportional to the product of the charges and proportional to the square of the separation', 'C', FALSE, 3),
    (v_problem, 'The force is proportional to the product of the charges and inversely proportional to the square of the separation', 'D', TRUE, 4);

  -- Q33 (multiple choice, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 33, 'Two charged spheres rest on a frictionless horizontal surface, as shown. Sphere q₁ carries +3.0 × 10⁻⁶ C and sphere q₂ carries +6.0 × 10⁻⁶ C. If you sketched the electrostatic force acting on each sphere, with arrow lengths drawn in proportion to the strength of the force, what would the two arrows look like?',
          'diagram:coulomb-two-spheres-unequal', 3, 'multiple_choice',
          'Equal in length, each pointing away from the other sphere', 'Both spheres are positive, so the force is repulsive and each arrow points away from the other sphere. The two forces are equal in size even though the charges are not: they are a Newton’s third law pair, and Coulomb’s law gives each sphere the same kq₁q₂/r² because the same product of charges appears in both. Expecting the smaller charge to feel a smaller force is the trap here — what CAN differ is their accelerations, if the spheres have different masses.', 3, 33)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'Equal in length, each pointing away from the other sphere', 'A', TRUE, 1),
    (v_problem, 'The arrow on q₁ twice as long as the one on q₂, both pointing away from the other sphere', 'B', FALSE, 2),
    (v_problem, 'The arrow on q₂ twice as long as the one on q₁, both pointing away from the other sphere', 'C', FALSE, 3),
    (v_problem, 'Equal in length, each pointing towards the other sphere', 'D', FALSE, 4);

  -- Q34 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 34, 'Two positive charges of 6.0 × 10⁻⁶ C each are separated by 0.50 m, as shown. Calculate the magnitude of the force between them, in newtons.',
          'diagram:coulomb-two-positive-equal', 3, 'numeric',
          '1.296', 'F = kq₁q₂/r² = (9.0 × 10⁹ × 6.0 × 10⁻⁶ × 6.0 × 10⁻⁶) ÷ 0.50² = 0.324 ÷ 0.25 = 1.3 N. Both charges are positive, so the force is repulsive: on a force diagram each charge gets one arrow, pointing directly away from the other, and the two arrows are the same length.', 3, 34)
  RETURNING id INTO v_problem;

  -- Q35 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 35, 'A negative charge of 2.0 × 10⁻⁴ C and a positive charge of 8.0 × 10⁻⁴ C are separated by 0.30 m. Calculate the magnitude of the force between them, in newtons.',
          NULL, 3, 'numeric',
          '16000', 'F = k|q₁q₂|/r² = (9.0 × 10⁹ × 2.0 × 10⁻⁴ × 8.0 × 10⁻⁴) ÷ 0.30² = 1440 ÷ 0.09 = 1.6 × 10⁴ N. The charges have opposite signs, so the force is attractive — each charge is pulled towards the other.', 3, 35)
  RETURNING id INTO v_problem;

  -- Q36 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 36, 'A young man picks up a charge q₁ of +2.0 × 10⁻⁵ C sliding out of a car seat. His girlfriend carries a charge q₂ of −8.0 × 10⁻⁵ C. Estimate the magnitude of the electrostatic force between them when they are 6.0 m apart, in newtons.',
          NULL, 3, 'numeric',
          '0.4', 'F = k|q₁q₂|/r² = (9.0 × 10⁹ × 2.0 × 10⁻⁵ × 8.0 × 10⁻⁵) ÷ 6.0² = 14.4 ÷ 36 = 0.40 N. The signs are opposite, so the force is attractive. It is worth noticing how big that is for static charge — 0.4 N is roughly the weight of a 40 g object.', 3, 36)
  RETURNING id INTO v_problem;

  -- Q37 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 37, 'The same two people (q₁ = +2.0 × 10⁻⁵ C and q₂ = −8.0 × 10⁻⁵ C) now move towards each other until their separation is one tenth of what it was — 0.60 m instead of 6.0 m. Calculate the new magnitude of the force between them, in newtons.',
          NULL, 3, 'numeric',
          '40', 'You can shortcut this with the inverse-square rule: dividing the separation by 10 multiplies the force by 10² = 100, so 0.40 N × 100 = 40 N. Working it out from scratch agrees: F = 14.4 ÷ 0.60² = 14.4 ÷ 0.36 = 40 N. A hundredfold jump from a tenfold move is the inverse-square law at its most dramatic.', 3, 37)
  RETURNING id INTO v_problem;

  -- Q38 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 38, 'Two pith balls of mass 1.0 g each carry equal charges. One hangs from an insulating thread; the other is brought up to 3.0 cm from it, and the suspended ball swings out until the thread makes 30° with the vertical, as shown. Calculate the charge on each ball, in coulombs. Take g = 9.8 N/kg.',
          'diagram:coulomb-pith-balls', 3, 'numeric',
          '2.38e-8', 'Start with the force diagram for the suspended ball: its weight mg acts straight down, the tension T acts along the thread, and the electrostatic repulsion Fe acts horizontally, away from the other ball. The ball hangs in equilibrium, so the components balance: T sin30° = Fe and T cos30° = mg. Dividing one by the other removes T and gives Fe = mg tan30°. Now put the numbers in: mg = 0.0010 kg × 9.8 = 9.8 × 10⁻³ N, so Fe = 9.8 × 10⁻³ × 0.577 = 5.66 × 10⁻³ N. Finally rearrange Coulomb’s law for equal charges: q = √(Fe r²/k) = √(5.66 × 10⁻³ × 0.030² ÷ 9.0 × 10⁹) = √(5.66 × 10⁻¹⁶) = 2.4 × 10⁻⁸ C.', 3, 38)
  RETURNING id INTO v_problem;

  -- Q39 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 39, 'Three point charges lie along the x-axis as shown: q₂ = −4.0 × 10⁻⁶ C sits 0.20 m to the left of q₁ = +6.0 × 10⁻⁶ C, and q₃ = −7.0 × 10⁻⁶ C sits 0.15 m to its right. Calculate the magnitude of the net electrostatic force on charge q₁, in newtons.',
          'diagram:coulomb-three-inline', 3, 'numeric',
          '11.4', 'Work out each pair separately, then combine. q₂ is negative and q₁ positive, so q₂ ATTRACTS q₁ and pulls it to the left: F = (9.0 × 10⁹ × 6.0 × 10⁻⁶ × 4.0 × 10⁻⁶) ÷ 0.20² = 0.216 ÷ 0.040 = 5.4 N. q₃ is also negative, so it attracts q₁ too, pulling it to the right: F = (9.0 × 10⁹ × 6.0 × 10⁻⁶ × 7.0 × 10⁻⁶) ÷ 0.15² = 0.378 ÷ 0.0225 = 16.8 N. The two pulls act along the same line in opposite directions, so they subtract: 16.8 − 5.4 = 11.4 N, directed to the right, towards q₃.', 3, 39)
  RETURNING id INTO v_problem;

  -- Q40 (numeric, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 40, 'Three charges sit at the corners of a right angle, as shown: q₁ = +4.5 × 10⁻⁵ C at the corner, q₂ = −1.2 × 10⁻⁵ C a distance 3.0 m directly above it, and q₃ = +1.8 × 10⁻⁵ C a distance 3.0 m directly to its right. Calculate the magnitude of the net electrostatic force on charge q₁, in newtons.',
          'diagram:coulomb-right-angle', 3, 'numeric',
          '0.974', 'The two forces on q₁ act at right angles to each other, so they combine by Pythagoras rather than by adding. q₂ has the opposite sign, so it ATTRACTS q₁ upwards: F₁₂ = (9.0 × 10⁹ × 4.5 × 10⁻⁵ × 1.2 × 10⁻⁵) ÷ 3.0² = 4.86 ÷ 9.0 = 0.54 N. q₃ has the same sign, so it REPELS q₁ to the left: F₁₃ = (9.0 × 10⁹ × 4.5 × 10⁻⁵ × 1.8 × 10⁻⁵) ÷ 3.0² = 7.29 ÷ 9.0 = 0.81 N. Net force = √(0.54² + 0.81²) = √0.948 = 0.97 N, pointing up and to the left, at an angle of tan⁻¹(0.54 ÷ 0.81) = 34° above the horizontal.', 3, 40)
  RETURNING id INTO v_problem;

  -- Q41 (multiple choice, difficulty 3)
  INSERT INTO problems (chapter_id, topic_id, problem_number, question_text,
                        question_image_url, difficulty_level, answer_type,
                        answer_correct, explanation, points, "order")
  VALUES (v_chapter, v_topic, 41, 'In the commonest isotope of hydrogen, the proton and the electron are about 5.3 × 10⁻¹¹ m apart. The electric force pulling them together is 8.2 × 10⁻⁸ N, while the gravitational force between them is 3.6 × 10⁻⁴⁷ N. Roughly how many orders of magnitude greater is the electric force than the gravitational one?',
          NULL, 3, 'multiple_choice',
          'About 39', 'Divide one by the other: 8.2 × 10⁻⁸ ÷ 3.6 × 10⁻⁴⁷ ≈ 2.3 × 10³⁹, which is about 39 orders of magnitude — a factor of two thousand billion billion billion billion. Working the two forces out from scratch: F = Gm₁m₂/r² = (6.67 × 10⁻¹¹ × 1.67 × 10⁻²⁷ × 9.11 × 10⁻³¹) ÷ (5.3 × 10⁻¹¹)² = 3.6 × 10⁻⁴⁷ N, and F = ke²/r² = (9.0 × 10⁹ × (1.6 × 10⁻¹⁹)²) ÷ (5.3 × 10⁻¹¹)² = 8.2 × 10⁻⁸ N. This is why gravity is simply ignored when working out what holds an atom together.', 3, 41)
  RETURNING id INTO v_problem;
  INSERT INTO problem_options (problem_id, option_text, option_letter, is_correct, "order") VALUES
    (v_problem, 'About 4', 'A', FALSE, 1),
    (v_problem, 'About 12', 'B', FALSE, 2),
    (v_problem, 'About 39', 'C', TRUE, 3),
    (v_problem, 'About 55', 'D', FALSE, 4);
END
$seed$;
