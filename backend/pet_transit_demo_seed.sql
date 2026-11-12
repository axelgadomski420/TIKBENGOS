-- Elif pet transit demo seed data
-- Import after backend/community_demo_seed.sql so users and pets already exist.

START
TRANSACTION;

SET FOREIGN_KEY_CHECKS
= 0;

DELETE FROM travel_feedback WHERE id BETWEEN 14301 AND 14400;
DELETE FROM safety_checklist WHERE id BETWEEN 14201 AND 14300;
DELETE FROM travel_document WHERE id BETWEEN 14101 AND 14200;
DELETE FROM travel_plan WHERE id BETWEEN 14001 AND 14100;
DELETE FROM travel_destination_image WHERE id BETWEEN 13101 AND 13200;
DELETE FROM travel_destination_required_documents WHERE travel_destination_id BETWEEN 13001 AND 13100;
DELETE FROM travel_destination WHERE id BETWEEN 13001 AND 13100;

SET FOREIGN_KEY_CHECKS
= 1;

INSERT INTO travel_destination
    (id, title, country, region, destination_type, recommended_transport_type, pet_friendly_level, description, safety_tips,
    cover_image_url, latitude, longitude, status, previous_status_before_archive, scheduled_publish_at, published_at, created_at, updated_at)
VALUES
    (13001, 'Mediterranean Coastal Weekend', 'Tunisia', 'Nabeul', 'BEACH', 'CAR', 4,
        'Beachside itinerary for pets needing calm pacing, hydration stops, and heat-aware timing.',
        'Avoid peak sun hours, keep fresh water in the car, and verify local leash requirements before arrival.',
        '/uploads/destinations/carousel/coastal-cover.jpg', 36.4556000, 10.7369000, 'PUBLISHED', NULL,
        NULL, '2026-03-16 10:00:00', '2026-03-14 10:00:00', '2026-03-16 10:00:00'),
    (13002, 'Alpine Escape Geneva', 'Switzerland', 'Geneva', 'INTERNATIONAL', 'PLANE', 3,
        'International travel profile with stricter document checks and airline carrier constraints.',
        'Carry printed copies of all certificates, confirm airline carrier dimensions, and arrive early for document validation.',
        '/uploads/destinations/carousel/geneva-cover.jpg', 46.2044000, 6.1432000, 'SCHEDULED', NULL,
        '2026-04-20 09:00:00', NULL, '2026-03-15 09:10:00', '2026-03-18 11:00:00'),
    (13003, 'Capital City Vet Corridor', 'Tunisia', 'Tunis', 'CITY', 'TRAIN', 5,
        'Urban route focused on short transfer time, nearby clinics, and frequent comfort breaks.',
        'Use a secured harness in stations and schedule hydration checks before every transfer.',
        '/uploads/destinations/carousel/tunis-cover.jpg', 36.8065000, 10.1815000, 'DRAFT', NULL,
        NULL, NULL, '2026-03-15 15:20:00', '2026-03-18 10:50:00');

INSERT INTO travel_destination_required_documents
    (travel_destination_id, document_type)
VALUES
    (13001, 'HEALTH_CERTIFICATE'),
    (13001, 'RABIES_VACCINE'),
    (13002, 'PET_PASSPORT'),
    (13002, 'RABIES_VACCINE'),
    (13002, 'TRANSPORT_AUTHORIZATION'),
    (13003, 'HEALTH_CERTIFICATE');

INSERT INTO travel_destination_image
    (id, destination_id, image_url, display_order, created_at)
VALUES
    (13101, 13001, '/uploads/destinations/carousel/coastal-1.jpg', 0, '2026-03-14 10:05:00'),
    (13102, 13001, '/uploads/destinations/carousel/coastal-2.jpg', 1, '2026-03-14 10:06:00'),
    (13103, 13002, '/uploads/destinations/carousel/geneva-1.jpg', 0, '2026-03-15 09:15:00'),
    (13104, 13002, '/uploads/destinations/carousel/geneva-2.jpg', 1, '2026-03-15 09:16:00'),
    (13105, 13003, '/uploads/destinations/carousel/tunis-1.jpg', 0, '2026-03-15 15:25:00');

INSERT INTO travel_plan
    (id, owner_id, pet_id, destination_id, origin, transport_type, travel_date, return_date, estimated_travel_hours,
    estimated_travel_cost, currency, animal_weight, cage_length, cage_width, cage_height, hydration_interval_minutes,
    required_stops, safety_status, readiness_score, admin_decision_comment, status, submitted_at, reviewed_at,
    reviewed_by_admin_id, admin_visible, admin_hidden_at, admin_hidden_by_id, created_at, updated_at)
VALUES
    (14001, 1005, 5001, 13001, 'Sfax', 'CAR', '2026-05-10', '2026-05-14', 5,
        220.00, 'TND', 32.50, 90.00, 60.00, 65.00, 120,
        2, 'VALID', 88.00, 'All mandatory documents and checklist items are complete.', 'APPROVED',
        '2026-03-20 11:00:00', '2026-03-21 09:20:00', 1001, 1, NULL, NULL, '2026-03-20 10:40:00', '2026-03-21 09:20:00'),
    (14002, 1006, 5003, 13002, 'Tunis', 'PLANE', '2026-06-02', NULL, 12,
        980.00, 'EUR', 4.20, 50.00, 35.00, 35.00, 90,
        1, 'PENDING', 64.00, NULL, 'SUBMITTED',
        '2026-03-22 15:10:00', NULL, NULL, 1, NULL, NULL, '2026-03-22 14:45:00', '2026-03-22 15:10:00'),
    (14003, 1013, 5011, 13003, 'Monastir', 'TRAIN', '2026-04-25', '2026-04-25', 3,
        48.00, 'TND', 28.50, NULL, NULL, NULL, 120,
        0, 'ALERT', 42.00, 'One mandatory document is invalid and hydration checklist is incomplete.', 'REJECTED',
        '2026-03-24 08:30:00', '2026-03-24 13:10:00', 1001, 1, NULL, NULL, '2026-03-24 08:00:00', '2026-03-24 13:10:00');

INSERT INTO travel_document
    (id, travel_plan_id, document_type, file_url, document_number, holder_name, issue_date, expiry_date,
    issuing_organization, extracted_text, is_ocr_processed, validation_status, validation_comment, uploaded_at,
    updated_at, validated_at, validated_by_admin_id)
VALUES
    (14101, 14001, 'RABIES_VACCINE', '/uploads/travel-documents/rabies-14001.pdf', 'RB-14001', 'Max Peterson',
        '2026-01-08', '2027-01-08', 'Central Vet Clinic', 'Rabies vaccine valid until 2027-01-08.', 1,
        'VALID', 'Certificate is valid and readable.', '2026-03-20 10:50:00', '2026-03-21 09:00:00', '2026-03-21 09:00:00', 1001),
    (14102, 14001, 'HEALTH_CERTIFICATE', '/uploads/travel-documents/health-14001.pdf', 'HC-14001', 'Max Peterson',
        '2026-03-10', '2026-06-10', 'Elif Partner Vet', 'General exam completed and fit to travel.', 1,
        'VALID', 'No anomaly detected.', '2026-03-20 10:52:00', '2026-03-21 09:05:00', '2026-03-21 09:05:00', 1001),
    (14103, 14002, 'PET_PASSPORT', '/uploads/travel-documents/passport-14002.pdf', 'PP-14002', 'Whiskers Haddad',
        '2025-11-15', '2030-11-15', 'Municipal Office', 'Passport number PP-14002.', 1,
        'PENDING', NULL, '2026-03-22 14:55:00', '2026-03-22 14:55:00', NULL, NULL),
    (14104, 14002, 'TRANSPORT_AUTHORIZATION', '/uploads/travel-documents/transport-14002.pdf', 'TA-14002', 'Whiskers Haddad',
        '2026-03-20', '2026-07-20', 'Airline Operations Desk', 'Authorization attached for in-cabin transport.', 0,
        'PENDING', NULL, '2026-03-22 14:58:00', '2026-03-22 14:58:00', NULL, NULL),
    (14105, 14003, 'HEALTH_CERTIFICATE', '/uploads/travel-documents/health-14003.pdf', 'HC-14003', 'Zeus Ksouri',
        '2025-12-05', '2026-02-05', 'Downtown Vet', 'Certificate expired before planned travel date.', 1,
        'EXPIRED', 'Health certificate expired. Upload a valid document.', '2026-03-24 08:10:00', '2026-03-24 13:00:00', '2026-03-24 13:00:00', 1001);

INSERT INTO safety_checklist
    (id, travel_plan_id, title, task_code, category, priority_level, is_mandatory, is_completed, due_date,
    created_at, updated_at, completed_at)
VALUES
    (14201, 14001, 'Verify vaccination certificate', 'DOC_RABIES', 'DOCUMENT', 'HIGH', 1, 1, '2026-03-22',
        '2026-03-20 11:05:00', '2026-03-21 08:40:00', '2026-03-21 08:40:00'),
    (14202, 14001, 'Prepare travel hydration kit', 'HYDRATION_KIT', 'HYDRATION', 'MEDIUM', 1, 1, '2026-03-23',
        '2026-03-20 11:10:00', '2026-03-21 08:45:00', '2026-03-21 08:45:00'),
    (14203, 14002, 'Upload passport scan', 'DOC_PASSPORT', 'DOCUMENT', 'HIGH', 1, 1, '2026-03-26',
        '2026-03-22 15:15:00', '2026-03-22 15:30:00', '2026-03-22 15:30:00'),
    (14204, 14002, 'Confirm carrier dimensions', 'TRANSPORT_CARRIER_SIZE', 'TRANSPORT', 'MEDIUM', 1, 0, '2026-03-28',
        '2026-03-22 15:20:00', '2026-03-22 15:20:00', NULL),
    (14205, 14003, 'Renew health certificate', 'DOC_HEALTH_RENEW', 'DOCUMENT', 'HIGH', 1, 0, '2026-03-25',
        '2026-03-24 08:40:00', '2026-03-24 08:40:00', NULL),
    (14206, 14003, 'Define hydration stop schedule', 'HYDRATION_STOPS', 'HYDRATION', 'MEDIUM', 1, 0, '2026-03-25',
        '2026-03-24 08:45:00', '2026-03-24 08:45:00', NULL);

INSERT INTO travel_feedback
    (id, travel_plan_id, feedback_type, rating, title, message, incident_location, ai_sentiment_score,
    urgency_level, processing_status, admin_response, responded_by_admin_id, responded_at, created_at, updated_at)
VALUES
    (14301, 14001, 'REVIEW', 5, 'Very smooth trip', 'Checklist guidance was clear and travel day was stress-free for both pet and owner.',
        'Nabeul Coastal Route', 4.70, 'NORMAL', 'RESOLVED', 'Thanks for the feedback. We are glad the checklist helped.', 1001,
        '2026-03-26 10:00:00', '2026-03-25 17:20:00', '2026-03-26 10:00:00'),
    (14302, 14002, 'SUGGESTION', NULL, 'Add airport-specific guidance', 'A short section for airline check-in timing would be useful.',
        'Tunis-Carthage Airport', 3.10, 'NORMAL', 'PENDING', NULL, NULL,
        NULL, '2026-03-26 09:00:00', '2026-03-26 09:00:00'),
    (14303, 14003, 'INCIDENT', NULL, 'Document mismatch delayed review', 'The certificate date mismatch caused a same-day rejection and a missed train slot.',
        'Tunis Station', 1.20, 'HIGH', 'IN_PROGRESS', NULL, NULL,
        NULL, '2026-03-24 13:20:00', '2026-03-24 13:20:00');

COMMIT;

SET FOREIGN_KEY_CHECKS
= 1;
