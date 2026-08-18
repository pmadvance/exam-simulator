-- ================================================================
-- Seed attempts for test7@gmail.com (user_id=19)
-- 3 exams × multiple attempts each = varied performance data
-- ================================================================

-- Attempt 1: PMP Practice Test 01 — Score 18/30 (60%) — weaker in Business Environment
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0001-4000-a001-000000000001', 19, 24, 'submitted', 0,
  '{"65":"B","66":"C","67":"A","68":"B","69":"A","70":"C","71":"B","72":"C","73":"A","74":"B","75":"D","76":"B","77":"A","78":"B","79":"C","80":"A","81":"B","82":"D","83":"B","84":"C","85":"B","86":"A","87":"A","88":"B","89":"C","90":"C","91":"A","92":"B","93":"A","94":"B"}',
  '[]', 18, 30,
  '2026-04-01 09:00:00', '2026-04-01 09:45:00'
);

-- Attempt 2: PMP Practice Test 01 — Score 22/30 (73%) — improving
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0002-4000-a001-000000000002', 19, 24, 'submitted', 0,
  '{"65":"B","66":"C","67":"C","68":"B","69":"A","70":"B","71":"B","72":"C","73":"A","74":"B","75":"B","76":"B","77":"B","78":"B","79":"A","80":"B","81":"B","82":"B","83":"B","84":"C","85":"B","86":"B","87":"A","88":"B","89":"B","90":"C","91":"A","92":"B","93":"B","94":"A"}',
  '[]', 22, 30,
  '2026-04-05 10:00:00', '2026-04-05 10:50:00'
);

-- Attempt 3: PMP Practice Test 01 — Score 25/30 (83%) — strong improvement
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0003-4000-a001-000000000003', 19, 24, 'submitted', 0,
  '{"65":"B","66":"C","67":"C","68":"B","69":"A","70":"B","71":"B","72":"C","73":"B","74":"B","75":"B","76":"B","77":"B","78":"B","79":"B","80":"B","81":"B","82":"B","83":"B","84":"A","85":"B","86":"B","87":"B","88":"B","89":"B","90":"C","91":"A","92":"B","93":"B","94":"C"}',
  '[]', 25, 30,
  '2026-04-10 14:00:00', '2026-04-10 14:48:00'
);

-- Attempt 4: PMP Practice Test 02 — Score 16/30 (53%) — first try, struggling
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0004-4000-a001-000000000004', 19, 25, 'submitted', 0,
  '{"95":"A","96":"A","97":"C","98":"B","99":"A","100":"B","101":"A","102":"C","103":"B","104":"A","105":"C","106":"A","107":"B","108":"A","109":"B","110":"A","111":"B","112":"C","113":"A","114":"B","115":"C","116":"C","117":"C","118":"A","119":"B","120":"C","121":"A","122":"B","123":"A","124":"C"}',
  '[]', 16, 30,
  '2026-04-03 11:00:00', '2026-04-03 11:55:00'
);

-- Attempt 5: PMP Practice Test 02 — Score 20/30 (67%) — moderate improvement
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0005-4000-a001-000000000005', 19, 25, 'submitted', 0,
  '{"95":"A","96":"B","97":"B","98":"B","99":"B","100":"A","101":"B","102":"B","103":"B","104":"A","105":"B","106":"B","107":"A","108":"B","109":"A","110":"B","111":"B","112":"A","113":"B","114":"B","115":"A","116":"A","117":"C","118":"B","119":"B","120":"A","121":"B","122":"A","123":"B","124":"A"}',
  '[]', 20, 30,
  '2026-04-08 09:30:00', '2026-04-08 10:20:00'
);

-- Attempt 6: PMP Practice Test 02 — Score 24/30 (80%) — good progress
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0006-4000-a001-000000000006', 19, 25, 'submitted', 0,
  '{"95":"A","96":"B","97":"B","98":"B","99":"B","100":"B","101":"B","102":"B","103":"B","104":"B","105":"A","106":"B","107":"B","108":"B","109":"B","110":"B","111":"B","112":"B","113":"B","114":"B","115":"C","116":"A","117":"C","118":"B","119":"B","120":"B","121":"A","122":"B","123":"B","124":"A"}',
  '[]', 24, 30,
  '2026-04-12 15:00:00', '2026-04-12 15:42:00'
);

-- Attempt 7: PMP Practice Test 03 — Score 14/30 (47%) — first attempt, weakest
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0007-4000-a001-000000000007', 19, 26, 'submitted', 0,
  '{"125":"A","126":"C","127":"A","128":"B","129":"A","130":"C","131":"A","132":"B","133":"A","134":"C","135":"A","136":"B","137":"A","138":"C","139":"B","140":"A","141":"B","142":"C","143":"A","144":"B","145":"C","146":"A","147":"B","148":"C","149":"B","150":"A","151":"C","152":"A","153":"B","154":"C"}',
  '[]', 14, 30,
  '2026-04-06 16:00:00', '2026-04-06 16:58:00'
);

-- Attempt 8: PMP Practice Test 03 — Score 19/30 (63%) — improving
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0008-4000-a001-000000000008', 19, 26, 'submitted', 0,
  '{"125":"B","126":"B","127":"A","128":"B","129":"B","130":"B","131":"A","132":"B","133":"B","134":"A","135":"B","136":"B","137":"A","138":"B","139":"A","140":"B","141":"B","142":"A","143":"B","144":"B","145":"A","146":"B","147":"A","148":"B","149":"B","150":"A","151":"B","152":"A","153":"B","154":"B"}',
  '[]', 19, 30,
  '2026-04-11 08:00:00', '2026-04-11 08:52:00'
);

-- Attempt 9: PMP Practice Test 03 — Score 23/30 (77%) — solid improvement
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0009-4000-a001-000000000009', 19, 26, 'submitted', 0,
  '{"125":"B","126":"B","127":"B","128":"B","129":"B","130":"B","131":"B","132":"B","133":"B","134":"A","135":"B","136":"B","137":"B","138":"B","139":"B","140":"A","141":"B","142":"B","143":"B","144":"B","145":"B","146":"A","147":"B","148":"B","149":"B","150":"B","151":"A","152":"B","153":"A","154":"B"}',
  '[]', 23, 30,
  '2026-04-15 13:00:00', '2026-04-15 13:45:00'
);

-- Attempt 10: PMP Practice Test 01 — Score 27/30 (90%) — mastery level
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0010-4000-a001-000000000010', 19, 24, 'submitted', 0,
  '{"65":"B","66":"C","67":"C","68":"B","69":"A","70":"B","71":"B","72":"C","73":"B","74":"B","75":"B","76":"B","77":"B","78":"B","79":"B","80":"B","81":"B","82":"B","83":"B","84":"B","85":"B","86":"B","87":"B","88":"B","89":"B","90":"C","91":"B","92":"B","93":"B","94":"A"}',
  '[]', 27, 30,
  '2026-04-18 10:00:00', '2026-04-18 10:38:00'
);

-- Attempt 11: PMP Practice Test 02 — Score 26/30 (87%) — near mastery
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0011-4000-a001-000000000011', 19, 25, 'submitted', 0,
  '{"95":"A","96":"B","97":"B","98":"B","99":"B","100":"B","101":"B","102":"B","103":"B","104":"B","105":"B","106":"B","107":"B","108":"B","109":"B","110":"B","111":"B","112":"B","113":"B","114":"B","115":"B","116":"A","117":"C","118":"B","119":"A","120":"B","121":"B","122":"B","123":"B","124":"A"}',
  '[]', 26, 30,
  '2026-04-20 09:00:00', '2026-04-20 09:35:00'
);

-- Attempt 12: PMP Practice Test 03 — Score 26/30 (87%) — late mastery
INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, score, total_questions, started_at, submitted_at)
VALUES (
  'a1000001-0012-4000-a001-000000000012', 19, 26, 'submitted', 0,
  '{"125":"B","126":"B","127":"B","128":"B","129":"B","130":"B","131":"B","132":"B","133":"B","134":"B","135":"B","136":"B","137":"B","138":"B","139":"B","140":"B","141":"B","142":"B","143":"B","144":"B","145":"B","146":"A","147":"B","148":"B","149":"B","150":"B","151":"B","152":"B","153":"A","154":"A"}',
  '[]', 26, 30,
  '2026-04-21 14:00:00', '2026-04-21 14:40:00'
);
