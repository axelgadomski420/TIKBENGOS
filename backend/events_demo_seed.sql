-- Elif events demo seed data
-- Import with:
--   mysql -u root Elif < backend/events_demo_seed.sql
--

START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM event_virtual_attendance WHERE id BETWEEN 9001 AND 9099;
DELETE FROM pet_competition_entry WHERE id BETWEEN 9101 AND 9199;
DELETE FROM event_interaction WHERE id BETWEEN 8801 AND 8899;
DELETE FROM event_reminder WHERE id BETWEEN 8601 AND 8699;
DELETE FROM event_review WHERE id BETWEEN 8501 AND 8599;
DELETE FROM event_waitlist WHERE id BETWEEN 8401 AND 8499;
DELETE FROM event_participant WHERE id BETWEEN 8301 AND 8399;
DELETE FROM event_virtual_session WHERE id BETWEEN 8901 AND 8999;
DELETE FROM event_eligibility_rule WHERE id BETWEEN 8701 AND 8799;
DELETE FROM event WHERE id BETWEEN 8201 AND 8299;
DELETE FROM event_category WHERE id BETWEEN 8101 AND 8199;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO event_category
  (id, name, icon, description, requires_approval, competition_mode)
VALUES
  (8101, 'Training Workshop', 'school', 'Hands-on training sessions for daily obedience, recall, and confidence building.', 0, 0),
  (8102, 'Community Meetup', 'groups', 'Open social events for pet owners, adopters, and local volunteers.', 0, 0),
  (8103, 'Health Webinar', 'medical_services', 'Expert-led online sessions on nutrition, prevention, and first aid.', 0, 0),
  (8104, 'Agility Competition', 'emoji_events', 'Competitive formats with scoring, judging, and eligibility checks.', 1, 1),
  (8105, 'Grooming Masterclass', 'content_cut', 'Technique-focused sessions for grooming quality and coat care.', 0, 0),
  (8106, 'Rescue Bootcamp', 'favorite', 'Practical onboarding for foster and rescue volunteers.', 0, 0);

INSERT INTO event
  (id, title, description, location, start_date, end_date, max_participants, remaining_slots, cover_image_url, status, category_id, created_by_user_id, created_at, is_online)
VALUES
  (8201, 'Basic Obedience Bootcamp', 'A practical obedience session focused on recall, loose-leash walking, and impulse control drills for daily city life.', 'Tunis Lake Arena', '2026-05-15 09:00:00', '2026-05-15 12:00:00', 40, 18, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80', 'PLANNED', 8101, 1007, '2026-04-05 10:00:00', 0),
  (8202, 'Sunset Community Walk', 'A social meetup for owners and adopters with guided walking groups, hydration checkpoints, and quick behavior tips.', 'Sidi Bou Said Seafront', '2026-05-20 18:00:00', '2026-05-20 20:00:00', 120, 72, 'https://images.unsplash.com/photo-1522276498395-f4f68f7f8454?auto=format&fit=crop&w=1200&q=80', 'PLANNED', 8102, 1005, '2026-04-06 11:15:00', 0),
  (8203, 'Senior Pet Nutrition Webinar', 'Veterinary nutritionists explain meal structure, hydration support, and supplement timing for senior dogs and cats.', 'Online', '2026-06-02 19:00:00', '2026-06-02 20:30:00', 250, 210, 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=80', 'PLANNED', 8103, 1008, '2026-04-08 09:40:00', 1),
  (8204, 'Summer Agility Cup Qualifier', 'Regional qualifier with timed lanes, judge scoring, and category-based admissions for licensed competitors.', 'El Menzah Sports Complex', '2026-06-08 08:30:00', '2026-06-08 16:00:00', 80, 12, 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80', 'PLANNED', 8104, 1002, '2026-04-09 13:20:00', 0),
  (8205, 'First Aid for Pet Parents (Live Webinar)', 'Emergency-first response basics: choking protocol, wound handling, transport readiness, and vet escalation checklists.', 'Online', '2026-06-14 10:00:00', '2026-06-14 12:30:00', 180, 95, 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=80', 'PLANNED', 8103, 1004, '2026-04-10 15:05:00', 1),
  (8206, 'Urban Cat Enrichment Lab', 'Apartment-friendly enrichment workshop with puzzle rotations, climbing layouts, and stress-reduction routines.', 'Lafayette Cat Cafe', '2026-06-22 17:00:00', '2026-06-22 19:30:00', 35, 5, 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=1200&q=80', 'PLANNED', 8105, 1006, '2026-04-12 10:10:00', 0),
  (8207, 'Beach Recall Challenge', 'High-distraction outdoor recall challenge with lane checkpoints, whistle cues, and trainer scorecards.', 'Hammamet Beach Arena', '2026-07-05 07:30:00', '2026-07-05 11:00:00', 60, 0, 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1200&q=80', 'FULL', 8101, 1007, '2026-04-14 08:50:00', 0),
  (8208, 'Rescue Foster Onboarding Day', 'Volunteer onboarding for foster families: intake process, medication logs, emergency transfers, and handoff quality control.', 'Ariana Rescue Hub', '2026-07-12 09:30:00', '2026-07-12 15:00:00', 50, 31, 'https://images.unsplash.com/photo-1535930749574-1399327ce78f?auto=format&fit=crop&w=1200&q=80', 'PLANNED', 8106, 1002, '2026-04-16 12:35:00', 0),
  (8209, 'National Grooming Showcase', 'Demonstration and practice tracks for coat styling, hygiene routines, and judge-ready presentation standards.', 'Carthage Expo Hall', '2026-08-03 13:00:00', '2026-08-03 18:00:00', 90, 44, 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80', 'PLANNED', 8105, 1006, '2026-04-18 11:25:00', 0),
  (8210, 'Elite Agility Finals', 'Final championship round with strict eligibility checks, advanced lane complexity, and panel scoring.', 'Monastir Arena', '2026-08-18 08:00:00', '2026-08-18 17:00:00', 70, 7, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80', 'PLANNED', 8104, 1002, '2026-04-19 16:45:00', 0);

INSERT INTO event_eligibility_rule
  (id, event_id, category_id, criteria, value_type, list_values, numeric_value, boolean_value, hard_reject, rejection_message, priority, active, created_at, updated_at)
VALUES
  (8701, NULL, 8104, 'ALLOWED_SPECIES', 'LIST', 'DOG', NULL, NULL, 1, 'Only dogs can enter agility competitions.', 1, 1, '2026-04-09 14:00:00', '2026-04-09 14:00:00'),
  (8702, NULL, 8104, 'MIN_AGE_MONTHS', 'NUMBER', NULL, 12, NULL, 1, 'Participants must be at least 12 months old.', 2, 1, '2026-04-09 14:05:00', '2026-04-09 14:05:00'),
  (8703, NULL, 8104, 'VACCINATION_REQUIRED', 'BOOLEAN', NULL, NULL, 1, 1, 'Valid vaccination records are mandatory.', 3, 1, '2026-04-09 14:10:00', '2026-04-09 14:10:00'),
  (8704, NULL, 8104, 'LICENSE_REQUIRED', 'BOOLEAN', NULL, NULL, 1, 0, 'A recognized license improves approval priority.', 4, 1, '2026-04-09 14:15:00', '2026-04-09 14:15:00'),
  (8705, NULL, 8104, 'MIN_EXPERIENCE_LEVEL', 'NUMBER', NULL, 2, NULL, 0, 'Handlers with less than level 2 may require manual review.', 5, 1, '2026-04-09 14:20:00', '2026-04-09 14:20:00'),
  (8706, 8210, NULL, 'MIN_EXPERIENCE_LEVEL', 'NUMBER', NULL, 4, NULL, 1, 'Finals require experience level 4 or higher.', 1, 1, '2026-04-19 17:05:00', '2026-04-19 17:05:00'),
  (8707, 8210, NULL, 'MAX_WEIGHT_KG', 'NUMBER', NULL, 45, NULL, 0, 'Dogs above 45kg are reviewed manually for lane safety.', 2, 1, '2026-04-19 17:10:00', '2026-04-19 17:10:00'),
  (8708, 8210, NULL, 'MEDICAL_CERT_REQUIRED', 'BOOLEAN', NULL, NULL, 1, 1, 'Medical certificate is required for finals.', 3, 1, '2026-04-19 17:15:00', '2026-04-19 17:15:00');

INSERT INTO event_participant
  (id, event_id, user_id, number_of_seats, status, registered_at, eligibility_score)
VALUES
  (8301, 8201, 1003, 1, 'CONFIRMED', '2026-04-20 09:00:00', NULL),
  (8302, 8201, 1005, 1, 'CONFIRMED', '2026-04-20 09:12:00', NULL),
  (8303, 8201, 1011, 2, 'CONFIRMED', '2026-04-20 10:05:00', NULL),
  (8304, 8202, 1006, 1, 'CONFIRMED', '2026-04-20 11:00:00', NULL),
  (8305, 8202, 1009, 2, 'CONFIRMED', '2026-04-20 11:15:00', NULL),
  (8306, 8203, 1004, 1, 'CONFIRMED', '2026-04-21 08:20:00', NULL),
  (8307, 8203, 1013, 1, 'CONFIRMED', '2026-04-21 08:32:00', NULL),
  (8308, 8204, 1008, 1, 'PENDING', '2026-04-21 09:10:00', 66),
  (8309, 8204, 1010, 1, 'CONFIRMED', '2026-04-21 09:18:00', 82),
  (8310, 8204, 1014, 1, 'PENDING', '2026-04-21 09:24:00', 58),
  (8311, 8205, 1005, 1, 'CONFIRMED', '2026-04-22 10:05:00', NULL),
  (8312, 8206, 1012, 1, 'CONFIRMED', '2026-04-22 10:40:00', NULL),
  (8313, 8206, 1003, 1, 'CONFIRMED', '2026-04-22 11:00:00', NULL),
  (8314, 8207, 1007, 1, 'CONFIRMED', '2026-04-23 07:45:00', NULL),
  (8315, 8207, 1006, 1, 'CONFIRMED', '2026-04-23 08:05:00', NULL),
  (8316, 8208, 1015, 1, 'CONFIRMED', '2026-04-23 12:20:00', NULL),
  (8317, 8209, 1004, 1, 'CONFIRMED', '2026-04-24 09:30:00', NULL),
  (8318, 8210, 1009, 1, 'PENDING', '2026-04-24 16:10:00', 68),
  (8319, 8210, 1011, 1, 'CONFIRMED', '2026-04-24 16:18:00', 88),
  (8320, 8210, 1013, 1, 'PENDING', '2026-04-24 16:25:00', 63);

INSERT INTO event_waitlist
  (id, event_id, user_id, number_of_seats, position, joined_at, notified, status, notified_at, confirmation_deadline, confirmed_participant_id)
VALUES
  (8401, 8207, 1010, 1, 1, '2026-04-25 10:00:00', 0, 'WAITING', NULL, NULL, NULL),
  (8402, 8207, 1012, 1, 2, '2026-04-25 10:08:00', 0, 'WAITING', NULL, NULL, NULL),
  (8403, 8210, 1006, 1, 1, '2026-04-26 08:30:00', 1, 'NOTIFIED', '2026-04-26 09:00:00', '2026-04-27 09:00:00', NULL),
  (8404, 8210, 1014, 1, 2, '2026-04-26 09:10:00', 0, 'WAITING', NULL, NULL, NULL),
  (8405, 8206, 1008, 1, 1, '2026-04-24 18:40:00', 0, 'WAITING', NULL, NULL, NULL),
  (8406, 8204, 1015, 1, 1, '2026-04-23 12:00:00', 0, 'WAITING', NULL, NULL, NULL);

INSERT INTO event_review
  (id, event_id, user_id, rating, comment, created_at)
VALUES
  (8501, 8201, 1003, 5, 'Great pace and very practical drills from the previous bootcamp edition.', '2026-04-10 14:00:00'),
  (8502, 8201, 1005, 4, 'Clear trainer instructions and useful take-home routine.', '2026-04-11 09:20:00'),
  (8503, 8203, 1004, 5, 'Excellent nutrition guidance with concrete feeding templates.', '2026-04-12 20:10:00'),
  (8504, 8204, 1010, 5, 'Well organized lanes and professional judge feedback.', '2026-04-13 18:45:00'),
  (8505, 8204, 1008, 4, 'Strong event format, review queue was slightly long.', '2026-04-13 19:05:00'),
  (8506, 8206, 1012, 4, 'Helpful enrichment ideas for small apartments.', '2026-04-14 12:30:00'),
  (8507, 8207, 1007, 5, 'Best recall challenge setup we have seen this season.', '2026-04-15 07:55:00'),
  (8508, 8208, 1015, 4, 'Rescue workflow was practical and easy to follow.', '2026-04-16 16:40:00'),
  (8509, 8209, 1004, 5, 'Great grooming demonstrations with clear standards.', '2026-04-17 17:10:00'),
  (8510, 8210, 1011, 5, 'Finals briefing was excellent and highly structured.', '2026-04-18 19:50:00');

INSERT INTO event_reminder
  (id, event_id, user_id, reminder_time, type, created_at)
VALUES
  (8601, 8201, 1003, '2026-05-14 09:00:00', 'H24', '2026-04-26 09:00:00'),
  (8602, 8202, 1006, '2026-05-18 18:00:00', 'J2', '2026-04-26 09:02:00'),
  (8603, 8203, 1004, '2026-06-02 17:00:00', 'H2', '2026-04-26 09:04:00'),
  (8604, 8204, 1010, '2026-06-06 08:30:00', 'J2', '2026-04-26 09:06:00'),
  (8605, 8205, 1005, '2026-06-13 10:00:00', 'H24', '2026-04-26 09:08:00'),
  (8606, 8206, 1012, '2026-06-20 17:00:00', 'J2', '2026-04-26 09:10:00'),
  (8607, 8207, 1007, '2026-07-03 07:30:00', 'J2', '2026-04-26 09:12:00'),
  (8608, 8208, 1015, '2026-07-11 09:30:00', 'H24', '2026-04-26 09:14:00'),
  (8609, 8209, 1004, '2026-08-01 13:00:00', 'J2', '2026-04-26 09:16:00'),
  (8610, 8210, 1011, '2026-08-16 08:00:00', 'J2', '2026-04-26 09:18:00');

INSERT INTO event_virtual_session
  (id, event_id, access_token, room_url, early_access_minutes, attendance_threshold_percent, status, opened_at, closed_at, created_at, moderator_password, session_started)
VALUES
  (8901, 8203, 'evt8203toknA93X', 'https://meet.elif.app/events/8203-room', 15, 80, 'OPEN', '2026-06-02 18:45:00', NULL, '2026-04-22 12:00:00', 'ELIF-8203-2026-A9X3', 1),
  (8902, 8205, 'evt8205toknB72Q', 'https://meet.elif.app/events/8205-room', 15, 75, 'SCHEDULED', NULL, NULL, '2026-04-22 12:10:00', 'ELIF-8205-2026-B7Q2', 0);

INSERT INTO event_virtual_attendance
  (id, certificate_token, session_id, participant_id, user_id, joined_at, left_at, total_seconds_present, is_moderator, attendance_percent, certificate_earned, certificate_url)
VALUES
  (9001, 'CERT-8203-1004-A1', 8901, 8306, 1004, '2026-06-02 19:00:12', '2026-06-02 20:20:10', 4798, 0, 88.9, 1, 'https://cdn.elif.app/certificates/CERT-8203-1004-A1.pdf'),
  (9002, 'CERT-8203-1013-B2', 8901, 8307, 1013, '2026-06-02 19:05:00', '2026-06-02 20:00:15', 3315, 0, 61.4, 0, NULL),
  (9003, NULL, 8901, NULL, 1008, '2026-06-02 18:50:00', '2026-06-02 20:25:00', 5700, 1, 100.0, 0, NULL);

INSERT INTO event_interaction
  (id, event_id, user_id, type, session_id, ip_address, metadata, created_at)
VALUES
  (8801, 8201, 1003, 'VIEW', 'sess-1003-a', '197.12.10.23', '{"source":"catalog"}', '2026-04-20 09:01:00'),
  (8802, 8201, 1003, 'DETAIL_OPEN', 'sess-1003-a', '197.12.10.23', '{"source":"card_click"}', '2026-04-20 09:03:00'),
  (8803, 8201, 1005, 'SEARCH_CLICK', 'sess-1005-a', '197.12.10.24', '{"keyword":"obedience"}', '2026-04-20 09:11:00'),
  (8804, 8202, 1006, 'VIEW', 'sess-1006-a', '197.12.10.25', '{"source":"home"}', '2026-04-20 11:01:00'),
  (8805, 8202, 1009, 'REGISTRATION', 'sess-1009-a', '197.12.10.26', '{"seats":2}', '2026-04-20 11:16:00'),
  (8806, 8203, 1004, 'REGISTRATION', 'sess-1004-a', '197.12.10.27', '{"seats":1}', '2026-04-21 08:21:00'),
  (8807, 8203, 1013, 'DETAIL_OPEN', 'sess-1013-a', '197.12.10.28', '{"source":"recommendation"}', '2026-04-21 08:33:00'),
  (8808, 8204, 1010, 'REGISTRATION', 'sess-1010-a', '197.12.10.29', '{"eligibility_score":82}', '2026-04-21 09:19:00'),
  (8809, 8204, 1008, 'REGISTRATION', 'sess-1008-a', '197.12.10.30', '{"eligibility_score":66}', '2026-04-21 09:12:00'),
  (8810, 8204, 1014, 'DETAIL_OPEN', 'sess-1014-a', '197.12.10.31', '{"source":"category_filter"}', '2026-04-21 09:20:00'),
  (8811, 8205, 1005, 'REGISTRATION', 'sess-1005-b', '197.12.10.24', '{"seats":1}', '2026-04-22 10:06:00'),
  (8812, 8206, 1012, 'REGISTRATION', 'sess-1012-a', '197.12.10.32', '{"seats":1}', '2026-04-22 10:41:00'),
  (8813, 8207, 1010, 'WAITLIST_JOIN', 'sess-1010-b', '197.12.10.29', '{"position":1}', '2026-04-25 10:01:00'),
  (8814, 8207, 1012, 'WAITLIST_JOIN', 'sess-1012-b', '197.12.10.32', '{"position":2}', '2026-04-25 10:09:00'),
  (8815, 8210, 1011, 'REGISTRATION', 'sess-1011-a', '197.12.10.33', '{"eligibility_score":88}', '2026-04-24 16:19:00'),
  (8816, 8210, 1009, 'REGISTRATION', 'sess-1009-b', '197.12.10.26', '{"eligibility_score":68}', '2026-04-24 16:11:00'),
  (8817, 8210, 1006, 'WAITLIST_JOIN', 'sess-1006-b', '197.12.10.25', '{"position":1}', '2026-04-26 08:31:00'),
  (8818, 8210, NULL, 'VIEW', 'anon-evt-8210', '197.13.10.44', '{"source":"home_hero"}', '2026-04-26 08:40:00'),
  (8819, 8209, 1004, 'REVIEW_POSTED', 'sess-1004-b', '197.12.10.27', '{"rating":5}', '2026-04-17 17:11:00'),
  (8820, 8203, 1004, 'REVIEW_POSTED', 'sess-1004-a', '197.12.10.27', '{"rating":5}', '2026-04-12 20:11:00');

INSERT INTO pet_competition_entry
  (id, participant_id, event_id, user_id, pet_name, species, breed, age_months, weight_kg, sex, color, is_vaccinated, has_license, has_medical_cert, experience_level, additional_info, eligibility_score, eligibility_verdict, satisfied_rules, warnings, created_at)
VALUES
  (9101, 8308, 8204, 1008, 'Nova', 'DOG', 'BORDER_COLLIE', 24, 19.5, 'FEMALE', 'BLACK_WHITE', 1, 1, 1, 3, 'Agility class graduate, first regional qualifier.', 66, 'WARNING', 'ALLOWED_SPECIES,MIN_AGE_MONTHS,VACCINATION_REQUIRED,LICENSE_REQUIRED', 'MIN_EXPERIENCE_LEVEL not fully met for automatic admission.', '2026-04-21 09:14:00'),
  (9102, 8309, 8204, 1010, 'Rex', 'DOG', 'BELGIAN_MALINOIS', 30, 28.0, 'MALE', 'BROWN_BLACK', 1, 1, 1, 5, 'Previous podium in local agility league.', 82, 'ELIGIBLE', 'ALLOWED_SPECIES,MIN_AGE_MONTHS,VACCINATION_REQUIRED,LICENSE_REQUIRED,MIN_EXPERIENCE_LEVEL', NULL, '2026-04-21 09:20:00'),
  (9103, 8310, 8204, 1014, 'Milo', 'DOG', 'GERMAN_SHEPHERD', 14, 33.0, 'MALE', 'BLACK_TAN', 1, 0, 1, 2, 'Strong beginner profile, pending document update.', 58, 'WARNING', 'ALLOWED_SPECIES,MIN_AGE_MONTHS,VACCINATION_REQUIRED', 'LICENSE_REQUIRED not satisfied; manual review needed.', '2026-04-21 09:26:00'),
  (9104, 8318, 8210, 1009, 'Luna', 'DOG', 'AUSTRALIAN_SHEPHERD', 26, 21.0, 'FEMALE', 'MERLE', 1, 1, 1, 3, 'Consistent regional participation in 2025 season.', 68, 'WARNING', 'ALLOWED_SPECIES,MIN_AGE_MONTHS,VACCINATION_REQUIRED,LICENSE_REQUIRED,MEDICAL_CERT_REQUIRED', 'MIN_EXPERIENCE_LEVEL=4 required for finals.', '2026-04-24 16:12:00'),
  (9105, 8319, 8210, 1011, 'Bolt', 'DOG', 'BORDER_COLLIE', 36, 20.0, 'MALE', 'BLACK_WHITE', 1, 1, 1, 5, 'National podium in 2025 agility circuit.', 88, 'ELIGIBLE', 'ALLOWED_SPECIES,MIN_AGE_MONTHS,VACCINATION_REQUIRED,LICENSE_REQUIRED,MEDICAL_CERT_REQUIRED,MIN_EXPERIENCE_LEVEL', NULL, '2026-04-24 16:20:00'),
  (9106, 8320, 8210, 1013, 'Kira', 'DOG', 'BELGIAN_SHEPHERD', 22, 24.0, 'FEMALE', 'FAWN', 1, 1, 1, 3, 'Solid technical level, pending finals experience threshold.', 63, 'WARNING', 'ALLOWED_SPECIES,MIN_AGE_MONTHS,VACCINATION_REQUIRED,LICENSE_REQUIRED,MEDICAL_CERT_REQUIRED', 'Experience level below finals threshold; pending admin decision.', '2026-04-24 16:27:00');

COMMIT;
