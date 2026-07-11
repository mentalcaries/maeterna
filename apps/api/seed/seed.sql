-- Local dev test-data seed: patients, doctors, readings, thresholds.
--
-- LOCAL DEVELOPMENT ONLY. Run via `pnpm db:seed:local`, which invokes
-- `wrangler d1 execute maeterna --local ...`. NEVER run this with --remote —
-- it deletes and recreates every row prefixed `seed-`.
--
-- Idempotent: safe to re-run. Almost every row uses a fixed, human-readable
-- id prefixed `seed-`, so the cleanup block below removes exactly what this
-- script creates (and nothing else) before re-inserting. The one exception
-- is the test institution/department: institutionId/departmentId are
-- UUID-validated by the real API (POST /profile/doctor/affiliations), so
-- they use fixed real-looking UUIDs instead and are cleaned up by literal
-- id match.

-- ── Cleanup (child → parent order) ──────────────────────────────────────────

DELETE FROM access_grant     WHERE id LIKE 'seed-%';
DELETE FROM threshold        WHERE id LIKE 'seed-%';
DELETE FROM reading          WHERE id LIKE 'seed-%';
DELETE FROM doctor_affiliation WHERE id LIKE 'seed-%';
DELETE FROM session           WHERE user_id LIKE 'seed-%';
DELETE FROM account           WHERE user_id LIKE 'seed-%';
DELETE FROM patient_profile   WHERE id LIKE 'seed-%';
DELETE FROM doctor_profile    WHERE id LIKE 'seed-%';
DELETE FROM user_preferences  WHERE user_id LIKE 'seed-%';
DELETE FROM user              WHERE id LIKE 'seed-%';
DELETE FROM department        WHERE id LIKE 'seed-%' OR id = '00000000-0000-4000-8000-000000000002';
DELETE FROM institution       WHERE id LIKE 'seed-%' OR id = '00000000-0000-4000-8000-000000000001';

-- ── Institution + department ────────────────────────────────────────────────
-- Fixed UUIDs (not `seed-`-prefixed like everything else here) so this
-- institution is actually selectable through the real, UUID-validated
-- POST /profile/doctor/affiliations endpoint.

INSERT INTO institution (id, name, type) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Seed Test Hospital', 'hospital');

INSERT INTO department (id, institution_id, name) VALUES
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Seed Test Department');

-- ── Doctors ──────────────────────────────────────────────────────────────────
-- Doctors self-attest a registration_number and phone_number at signup — no
-- external verification, all seeded doctors are simply user.status = 'active'.
-- Affiliation shapes vary to exercise the UI: hospital-only, practice-only,
-- hospital + practice, and no affiliations at all.

INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at, role, status, first_name, last_name) VALUES
  ('seed-doctor-verified', 'Vera Hospital', 'doctor.hospital@seed.test', 1, NULL, strftime('%s','now'), strftime('%s','now'), 'doctor', 'active', 'Vera', 'Hospital'),
  ('seed-doctor-unverified', 'Uma Practice', 'doctor.practice@seed.test', 1, NULL, strftime('%s','now'), strftime('%s','now'), 'doctor', 'active', 'Uma', 'Practice'),
  ('seed-doctor-hybrid', 'Hank Hybrid', 'doctor.hybrid@seed.test', 1, NULL, strftime('%s','now'), strftime('%s','now'), 'doctor', 'active', 'Hank', 'Hybrid'),
  ('seed-doctor-solo', 'Sam Solo', 'doctor.solo@seed.test', 1, NULL, strftime('%s','now'), strftime('%s','now'), 'doctor', 'active', 'Sam', 'Solo');

INSERT INTO doctor_profile (id, user_id, registration_number, phone_number, updated_at) VALUES
  ('seed-doctor-verified-profile', 'seed-doctor-verified', 'MB-2015-0110', '+18685550101', strftime('%s','now')),
  ('seed-doctor-unverified-profile', 'seed-doctor-unverified', 'MB-2018-0287', '+18685550102', strftime('%s','now')),
  ('seed-doctor-hybrid-profile', 'seed-doctor-hybrid', 'MB-2020-0356', '+18685550103', strftime('%s','now')),
  ('seed-doctor-solo-profile', 'seed-doctor-solo', 'MB-2021-0499', '+18685550104', strftime('%s','now'));

-- seed-doctor-verified: single public institution.
-- seed-doctor-unverified: private practice only, no institution.
-- seed-doctor-hybrid: public institution AND a named private practice.
-- seed-doctor-solo: no affiliation rows at all.
INSERT INTO doctor_affiliation (id, doctor_id, institution_id, department_id, practice_name, created_at) VALUES
  ('seed-affiliation-verified', 'seed-doctor-verified', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', NULL, strftime('%s','now')),
  ('seed-affiliation-practice', 'seed-doctor-unverified', NULL, NULL, 'Westshore Medical', strftime('%s','now')),
  ('seed-affiliation-hybrid-inst', 'seed-doctor-hybrid', '00000000-0000-4000-8000-000000000001', NULL, NULL, strftime('%s','now')),
  ('seed-affiliation-hybrid-practice', 'seed-doctor-hybrid', NULL, NULL, 'Eastside Wellness Clinic', strftime('%s','now'));

-- ── Patients ─────────────────────────────────────────────────────────────────

INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at, role, status, first_name, last_name) VALUES
  ('seed-patient-a', 'Alice Anderson', 'patient.a@seed.test', 1, NULL, strftime('%s','now'), strftime('%s','now'), 'patient', 'active', 'Alice', 'Anderson'),
  ('seed-patient-b', 'Bianca Brooks',  'patient.b@seed.test', 1, NULL, strftime('%s','now'), strftime('%s','now'), 'patient', 'active', 'Bianca', 'Brooks'),
  ('seed-patient-c', 'Carla Chen',     'patient.c@seed.test', 1, NULL, strftime('%s','now'), strftime('%s','now'), 'patient', 'active', 'Carla', 'Chen'),
  ('seed-patient-d', 'Diana Dawson',   'patient.d@seed.test', 1, NULL, strftime('%s','now'), strftime('%s','now'), 'patient', 'active', 'Diana', 'Dawson'),
  ('seed-patient-e', 'Elena Ellis',    'patient.e@seed.test', 1, NULL, strftime('%s','now'), strftime('%s','now'), 'patient', 'active', 'Elena', 'Ellis');

INSERT INTO patient_profile (id, user_id, date_of_birth, updated_at) VALUES
  ('seed-patient-a-profile', 'seed-patient-a', '1990-03-14', strftime('%s','now')),
  ('seed-patient-b-profile', 'seed-patient-b', '1988-07-22', strftime('%s','now')),
  ('seed-patient-c-profile', 'seed-patient-c', '1992-11-05', strftime('%s','now')),
  ('seed-patient-d-profile', 'seed-patient-d', '1995-01-30', strftime('%s','now')),
  ('seed-patient-e-profile', 'seed-patient-e', '1991-09-18', strftime('%s','now'));

-- ── Thresholds ───────────────────────────────────────────────────────────────
-- Patient C has a custom (looser) threshold row; patient D deliberately has
-- none, to exercise the DEFAULT_THRESHOLDS fallback in resolveThresholds().
-- Defaults for reference: fastingGlucoseHigh 95, postMealGlucoseHigh 140,
-- systolicHigh 140, diastolicHigh 90.

INSERT INTO threshold (id, patient_id, doctor_id, fasting_glucose_high, post_meal_glucose_high, systolic_high, diastolic_high, updated_at) VALUES
  ('seed-threshold-c', 'seed-patient-c', 'seed-doctor-verified', 110, 160, 150, 95, strftime('%s','now'));

-- ── Readings ─────────────────────────────────────────────────────────────────
-- Glucose contexts: fasted (high if >= 95 default), post_meal (high if > 140 default).
-- BP contexts: morning / evening (high if systolic >= 140 or diastolic >= 90 default).
--
-- The web app's glucose history table (apps/web/src/components/readings/
-- GlucoseHistoryTable.tsx) splits post_meal readings into Breakfast/Lunch/
-- Dinner columns by the *local* hour of `timestamp` (glucoseSlotFor() in
-- apps/web/src/lib/reading-history.ts: hour < 11 -> breakfast, < 16 -> lunch,
-- else dinner; `fasted` and BP are bucketed by `context` alone, not hour).
--
-- All timestamps below are UTC literals with a fixed +4h offset baked in,
-- targeting Trinidad & Tobago local time (AST, UTC-4, no DST — this app's
-- locale is "en-TT", see apps/web/src/lib/reading-history.ts). We tried
-- SQLite's `datetime('now','localtime', ..., 'utc')` round-trip so this
-- would be timezone-portable, but it proved unreliable inside a large
-- multi-statement `wrangler d1 execute --file` batch (worked in isolated
-- tests, silently became a no-op once folded into the full seed script) —
-- so we fall back to a hardcoded, deterministic offset instead. If you're
-- developing outside AST, the meal-slot columns will still populate
-- correctly relative to each other, just not at these exact local hours.
--
-- Target local hours -> stored UTC hours: fasted 07:00->11:00, breakfast
-- 08:00->12:00, lunch 13:00->17:00, dinner 19:00->23:00, BP morning
-- 08:00->12:00 (patient C uses 09:00->13:00), BP evening 20:00->24:00(+1day).

-- Patient A — disciplined / "ideal": every slot shares the same ~90%-of-days
-- filter, so on a day she logs, she logs everything -- fasted + breakfast +
-- lunch + dinner + BP morning + BP evening (up to 6 readings/day).
WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-a-fasted-' || n, 'seed-patient-a', 'seed-patient-a', 'glucose',
  78 + (n * 3) % 14, NULL, 'mg/dL', 'fasted',
  CASE WHEN n % 6 = 0 THEN 'Morning fasted check' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+11 hours', '+' || (n % 15) || ' minutes')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+11 hours', '+' || (n % 15) || ' minutes'))
FROM days WHERE n % 10 <> 9;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-a-breakfast-' || n, 'seed-patient-a', 'seed-patient-a', 'glucose',
  100 + (n * 5) % 25, NULL, 'mg/dL', 'post_meal',
  CASE WHEN n % 4 = 0 THEN 'After breakfast' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours', '+' || (n % 20) || ' minutes')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours', '+' || (n % 20) || ' minutes'))
FROM days WHERE n % 10 <> 9;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-a-lunch-' || n, 'seed-patient-a', 'seed-patient-a', 'glucose',
  105 + (n * 4) % 30, NULL, 'mg/dL', 'post_meal',
  CASE WHEN n % 5 = 0 THEN 'After lunch' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+17 hours', '+' || (n % 25) || ' minutes')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+17 hours', '+' || (n % 25) || ' minutes'))
FROM days WHERE n % 10 <> 9;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-a-dinner-' || n, 'seed-patient-a', 'seed-patient-a', 'glucose',
  110 + (n * 8) % 25, NULL, 'mg/dL', 'post_meal',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+23 hours', '+' || (n % 20) || ' minutes')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+23 hours', '+' || (n % 20) || ' minutes'))
FROM days WHERE n % 10 <> 9;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-a-bp-am-' || n, 'seed-patient-a', 'seed-patient-a', 'blood_pressure',
  112 + n % 8, 72 + n % 6, 'mmHg', 'morning',
  CASE WHEN n % 7 = 0 THEN 'Feeling good' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours'))
FROM days WHERE n % 10 <> 9;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-a-bp-pm-' || n, 'seed-patient-a', 'seed-patient-a', 'blood_pressure',
  114 + n % 8, 74 + n % 6, 'mmHg', 'evening',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+24 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+24 hours'))
FROM days WHERE n % 10 <> 9;

-- Patient B — mixed severities, plus a glucose slot collision (two post_meal
-- readings before 11am local time, same day -> both bucket into Breakfast)
-- and a BP slot collision (two morning readings same day). Also one
-- fixed-date reading (~5 months back, well before "today") to exercise the
-- "All time" filter boundary.
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at) VALUES
  ('seed-reading-b-1', 'seed-patient-b', 'seed-patient-b', 'glucose', 105, NULL, 'mg/dL', 'fasted',
    'Skipped breakfast', strftime('%s', datetime('now','start of day','+10 hours','+45 minutes')), strftime('%s', datetime('now','start of day','+10 hours','+45 minutes'))),
  ('seed-reading-b-2', 'seed-patient-b', 'seed-patient-b', 'glucose', 155, NULL, 'mg/dL', 'post_meal',
    'Big lunch', strftime('%s', datetime('now','start of day','+12 hours')), strftime('%s', datetime('now','start of day','+12 hours'))),
  ('seed-reading-b-3', 'seed-patient-b', 'seed-patient-b', 'glucose', 130, NULL, 'mg/dL', 'post_meal',
    NULL, strftime('%s', datetime('now','start of day','+13 hours','+30 minutes')), strftime('%s', datetime('now','start of day','+13 hours','+30 minutes'))),
  ('seed-reading-b-4', 'seed-patient-b', 'seed-patient-b', 'glucose', 90, NULL, 'mg/dL', 'fasted',
    NULL, strftime('%s', datetime('now','-3 days','start of day','+11 hours')), strftime('%s', datetime('now','-3 days','start of day','+11 hours'))),
  ('seed-reading-b-5', 'seed-patient-b', 'seed-patient-b', 'glucose', 145, NULL, 'mg/dL', 'post_meal',
    'Post dinner', strftime('%s', datetime('now','-3 days','start of day','+23 hours')), strftime('%s', datetime('now','-3 days','start of day','+23 hours'))),
  ('seed-reading-b-6', 'seed-patient-b', 'seed-patient-b', 'blood_pressure', 148, 94, 'mmHg', 'morning',
    'Headache this morning', strftime('%s', datetime('now','start of day','+12 hours')), strftime('%s', datetime('now','start of day','+12 hours'))),
  ('seed-reading-b-7', 'seed-patient-b', 'seed-patient-b', 'blood_pressure', 116, 74, 'mmHg', 'morning',
    NULL, strftime('%s', datetime('now','start of day','+13 hours','+30 minutes')), strftime('%s', datetime('now','start of day','+13 hours','+30 minutes'))),
  ('seed-reading-b-8', 'seed-patient-b', 'seed-patient-b', 'blood_pressure', 120, 78, 'mmHg', 'evening',
    NULL, strftime('%s', datetime('now','-3 days','start of day','+25 hours')), strftime('%s', datetime('now','-3 days','start of day','+25 hours'))),
  ('seed-reading-b-9', 'seed-patient-b', 'seed-patient-b', 'glucose', 92, NULL, 'mg/dL', 'fasted',
    'Old reading for All time filter testing', strftime('%s','2026-02-15 11:00:00'), strftime('%s','2026-02-15 11:00:00'));

-- Patient B — generated background rows (days 4-29, after the anchor rows'
-- days 0 and 3, so ids/dates never collide with them). Uncontrolled means
-- frequently HIGH readings, not necessarily complete logging: each slot has
-- its own, largely independent day filter, so she rarely logs a full day.
WITH RECURSIVE days(n) AS (
  SELECT 4
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-b-fasted-' || n, 'seed-patient-b', 'seed-patient-b', 'glucose',
  85 + (n * 13) % 55, NULL, 'mg/dL', 'fasted',
  CASE WHEN n % 6 = 0 THEN 'Rough morning' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+11 hours', '+' || (n % 25) || ' minutes')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+11 hours', '+' || (n % 25) || ' minutes'))
FROM days WHERE n % 5 < 3;

WITH RECURSIVE days(n) AS (
  SELECT 4
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-b-breakfast-' || n, 'seed-patient-b', 'seed-patient-b', 'glucose',
  120 + (n * 11) % 70, NULL, 'mg/dL', 'post_meal',
  CASE WHEN n % 9 = 0 THEN 'Craving sweets' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours', '+' || (n % 30) || ' minutes')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours', '+' || (n % 30) || ' minutes'))
FROM days WHERE n % 3 = 0;

WITH RECURSIVE days(n) AS (
  SELECT 4
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-b-lunch-' || n, 'seed-patient-b', 'seed-patient-b', 'glucose',
  130 + (n * 13) % 80, NULL, 'mg/dL', 'post_meal',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+17 hours', '+' || (n % 30) || ' minutes')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+17 hours', '+' || (n % 30) || ' minutes'))
FROM days WHERE n % 4 = 0;

WITH RECURSIVE days(n) AS (
  SELECT 4
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-b-dinner-' || n, 'seed-patient-b', 'seed-patient-b', 'glucose',
  125 + (n * 9) % 75, NULL, 'mg/dL', 'post_meal',
  CASE WHEN n % 8 = 2 THEN 'Late dinner' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+23 hours', '+' || (n % 30) || ' minutes')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+23 hours', '+' || (n % 30) || ' minutes'))
FROM days WHERE n % 4 = 2;

WITH RECURSIVE days(n) AS (
  SELECT 4
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-b-bp-am-' || n, 'seed-patient-b', 'seed-patient-b', 'blood_pressure',
  125 + (n * 5) % 45, 78 + (n * 4) % 25, 'mmHg', 'morning',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours'))
FROM days WHERE n % 7 = 0;

WITH RECURSIVE days(n) AS (
  SELECT 4
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-b-bp-pm-' || n, 'seed-patient-b', 'seed-patient-b', 'blood_pressure',
  118 + (n * 6) % 42, 74 + (n * 3) % 28, 'mmHg', 'evening',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+24 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+24 hours'))
FROM days WHERE n % 7 = 3;

-- Patient C — custom thresholds (fastingGlucoseHigh 110, postMealGlucoseHigh
-- 160, systolicHigh 150, diastolicHigh 95). Readings c-1/c-2/c-3 are chosen
-- to flip severity between the platform defaults and this patient's custom
-- thresholds, so the override is visibly exercised.
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at) VALUES
  ('seed-reading-c-1', 'seed-patient-c', 'seed-patient-c', 'glucose', 100, NULL, 'mg/dL', 'fasted',
    'High under default threshold, normal under custom', strftime('%s', datetime('now','start of day','+11 hours')), strftime('%s', datetime('now','start of day','+11 hours'))),
  ('seed-reading-c-2', 'seed-patient-c', 'seed-patient-c', 'glucose', 150, NULL, 'mg/dL', 'post_meal',
    NULL, strftime('%s', datetime('now','start of day','+12 hours')), strftime('%s', datetime('now','start of day','+12 hours'))),
  ('seed-reading-c-3', 'seed-patient-c', 'seed-patient-c', 'blood_pressure', 145, 92, 'mmHg', 'morning',
    'BP check', strftime('%s', datetime('now','-2 days','start of day','+13 hours')), strftime('%s', datetime('now','-2 days','start of day','+13 hours'))),
  ('seed-reading-c-4', 'seed-patient-c', 'seed-patient-c', 'glucose', 80, NULL, 'mg/dL', 'fasted',
    NULL, strftime('%s', datetime('now','-4 days','start of day','+11 hours')), strftime('%s', datetime('now','-4 days','start of day','+11 hours')));

-- Patient C — generated background rows (days 5-29). Moderate discipline:
-- each slot has its own filter (roughly half the frequency of patient B's),
-- values clustered near her custom thresholds so severity keeps depending
-- on the override across the added volume (not just the 3 anchor rows above).
WITH RECURSIVE days(n) AS (
  SELECT 5
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-c-fasted-' || n, 'seed-patient-c', 'seed-patient-c', 'glucose',
  95 + (n * 5) % 30, NULL, 'mg/dL', 'fasted',
  CASE WHEN n % 8 = 0 THEN 'Fasted, feeling okay' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+11 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+11 hours'))
FROM days WHERE n % 2 = 0;

WITH RECURSIVE days(n) AS (
  SELECT 5
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-c-breakfast-' || n, 'seed-patient-c', 'seed-patient-c', 'glucose',
  125 + (n * 7) % 40, NULL, 'mg/dL', 'post_meal',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours'))
FROM days WHERE n % 5 = 0;

WITH RECURSIVE days(n) AS (
  SELECT 5
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-c-lunch-' || n, 'seed-patient-c', 'seed-patient-c', 'glucose',
  135 + (n * 9) % 45, NULL, 'mg/dL', 'post_meal',
  CASE WHEN n % 10 = 2 THEN 'After lunch, feeling full' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+17 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+17 hours'))
FROM days WHERE n % 5 = 2;

WITH RECURSIVE days(n) AS (
  SELECT 5
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-c-dinner-' || n, 'seed-patient-c', 'seed-patient-c', 'glucose',
  128 + (n * 6) % 42, NULL, 'mg/dL', 'post_meal',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+23 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+23 hours'))
FROM days WHERE n % 5 = 4;

WITH RECURSIVE days(n) AS (
  SELECT 5
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-c-bp-am-' || n, 'seed-patient-c', 'seed-patient-c', 'blood_pressure',
  130 + (n * 7) % 30, 80 + (n * 5) % 20, 'mmHg', 'morning',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+13 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+13 hours'))
FROM days WHERE n % 6 = 0;

WITH RECURSIVE days(n) AS (
  SELECT 5
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-c-bp-pm-' || n, 'seed-patient-c', 'seed-patient-c', 'blood_pressure',
  125 + (n * 8) % 35, 78 + (n * 6) % 22, 'mmHg', 'evening',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+24 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+24 hours'))
FROM days WHERE n % 6 = 3;

-- Patient D — no threshold row; severity comes entirely from
-- DEFAULT_THRESHOLDS. Least disciplined of A-D: fully generated across
-- days 0-29, each slot its own (low) independent filter, natural normal/high mix.
WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-d-fasted-' || n, 'seed-patient-d', 'seed-patient-d', 'glucose',
  82 + (n * 11) % 30, NULL, 'mg/dL', 'fasted',
  CASE WHEN n % 9 = 0 THEN 'Fasted glucose' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+11 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+11 hours'))
FROM days WHERE n % 5 < 2;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-d-breakfast-' || n, 'seed-patient-d', 'seed-patient-d', 'glucose',
  105 + (n * 9) % 45, NULL, 'mg/dL', 'post_meal',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours'))
FROM days WHERE n % 6 = 0;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-d-lunch-' || n, 'seed-patient-d', 'seed-patient-d', 'glucose',
  112 + (n * 7) % 55, NULL, 'mg/dL', 'post_meal',
  'After big lunch',
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+17 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+17 hours'))
FROM days WHERE n % 7 = 0;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-d-dinner-' || n, 'seed-patient-d', 'seed-patient-d', 'glucose',
  108 + (n * 5) % 50, NULL, 'mg/dL', 'post_meal',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+23 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+23 hours'))
FROM days WHERE n % 8 = 0;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-d-bp-am-' || n, 'seed-patient-d', 'seed-patient-d', 'blood_pressure',
  120 + (n * 4) % 35, 75 + (n * 3) % 25, 'mmHg', 'morning',
  NULL,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+12 hours'))
FROM days WHERE n % 10 = 0;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at)
SELECT
  'seed-reading-d-bp-pm-' || n, 'seed-patient-d', 'seed-patient-d', 'blood_pressure',
  118 + (n * 6) % 38, 76 + (n * 4) % 22, 'mmHg', 'evening',
  CASE WHEN n = 5 THEN 'Stressful day' ELSE NULL END,
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+24 hours')),
  strftime('%s', datetime('now', '-' || n || ' days', 'start of day', '+24 hours'))
FROM days WHERE n % 10 = 5;

-- Patient E — sparse / slot-boundary edge case: two post_meal readings one
-- minute apart, straddling the local 10:59/11:00 breakfast->lunch boundary,
-- to exercise the web pivot table's meal-window bucketing at the edge.
INSERT INTO reading (id, patient_id, logged_by_id, type, value1, value2, unit, context, notes, timestamp, created_at) VALUES
  ('seed-reading-e-1', 'seed-patient-e', 'seed-patient-e', 'glucose', 125, NULL, 'mg/dL', 'post_meal',
    'Right before 11am', strftime('%s', datetime('now','-1 days','start of day','+14 hours','+59 minutes')), strftime('%s', datetime('now','-1 days','start of day','+14 hours','+59 minutes'))),
  ('seed-reading-e-2', 'seed-patient-e', 'seed-patient-e', 'glucose', 130, NULL, 'mg/dL', 'post_meal',
    NULL, strftime('%s', datetime('now','-1 days','start of day','+15 hours')), strftime('%s', datetime('now','-1 days','start of day','+15 hours')));

-- ── Access grants ────────────────────────────────────────────────────────────
-- Verified doctor has active access to every seeded patient.

INSERT INTO access_grant (id, patient_id, grant_type, grantee_id, granted_at, revoked_at) VALUES
  ('seed-grant-a', 'seed-patient-a', 'individual', 'seed-doctor-verified', strftime('%s','now'), NULL),
  ('seed-grant-b', 'seed-patient-b', 'individual', 'seed-doctor-verified', strftime('%s','now'), NULL),
  ('seed-grant-c', 'seed-patient-c', 'individual', 'seed-doctor-verified', strftime('%s','now'), NULL),
  ('seed-grant-d', 'seed-patient-d', 'individual', 'seed-doctor-verified', strftime('%s','now'), NULL),
  ('seed-grant-e', 'seed-patient-e', 'individual', 'seed-doctor-verified', strftime('%s','now'), NULL);
