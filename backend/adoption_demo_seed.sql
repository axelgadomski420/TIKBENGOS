-- Elif adoption demo seed data
-- Import after backend/community_demo_seed.sql so the shared demo users already exist.
--
-- Example:
--   mysql -u root Elif < backend/community_demo_seed.sql
--   mysql -u root Elif < backend/adoption_demo_seed.sql

START
TRANSACTION;

SET FOREIGN_KEY_CHECKS
= 0;

DELETE FROM notification WHERE id BETWEEN 9001 AND 9010;
DELETE FROM shelter_review WHERE id BETWEEN 8001 AND 8010;
DELETE FROM appointment WHERE id BETWEEN 7001 AND 7010;
DELETE FROM contract WHERE id BETWEEN 6001 AND 6010;
DELETE FROM adoption_request WHERE id BETWEEN 5001 AND 5020;
DELETE FROM adoption_pet WHERE id BETWEEN 4001 AND 4020;
DELETE FROM shelter WHERE id BETWEEN 3001 AND 3010;
DELETE FROM adoption_image WHERE id BETWEEN 9501 AND 9520;

SET FOREIGN_KEY_CHECKS
= 1;


INSERT INTO shelter
    (
    id, name, address, phone, email, license_number, verified, description, logo_url, created_at, updated_at, user_id
    )
VALUES
    (3001, 'Sunrise Animal Rescue', '14 Avenue Habib Bourguiba, Tunis, Tunisia', '+216 71 555 120', 'contact@sunrise-rescue.tn', 'TN-AR-2026-3001', 1, 'A calm city shelter focused on dogs and cats that need short-term care, behavior assessment, and carefully matched placements.', 'https://images.unsplash.com/photo-1558944351-c7f3f6f0c0b6?auto=format&fit=crop&w=900&q=80', '2026-03-12 09:00:00', '2026-03-18 09:00:00', 1004),
    (3002, 'Green Paws Haven', '8 Rue du Lac, La Marsa, Tunisia', '+216 70 444 225', 'hello@greenpawshaven.tn', 'TN-AR-2026-3002', 1, 'A verified shelter that rehabilitates social, medium energy pets and runs a steady stream of meet-and-greet appointments.', 'https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=900&q=80', '2026-03-12 10:15:00', '2026-03-18 09:15:00', 1003),
    (3003, 'Little Hearts Foster Center', '21 Avenue de l''Independance, Sousse, Tunisia', '+216 73 222 640', 'foster@littlehearts.tn', 'TN-AR-2026-3003', 0, 'A foster-led network for kittens, small dogs, and special care animals that need patient adopters and home visits.', 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?auto=format&fit=crop&w=900&q=80', '2026-03-13 08:45:00', '2026-03-17 17:30:00', 1002),
    (3004, 'Coastal Companions Shelter', '55 Corniche Road, Hammamet, Tunisia', '+216 72 888 904', 'team@coastalcompanions.tn', 'TN-AR-2026-3004', 1, 'A seaside shelter that highlights low-stress adoption events, transparent medical records, and follow-up check-ins after placement.', 'https://images.unsplash.com/photo-1503256207526-0d5a4a3d0b8f?auto=format&fit=crop&w=900&q=80', '2026-03-13 11:00:00', '2026-03-18 10:00:00', 1015),
    (3005, 'Harbor Safe Haven', '101 Port Avenue, Sfax, Tunisia', '+216 74 555 410', 'shelter.approved@elif.com', 'TN-AR-2026-3005', 1, 'Verified shelter account used for shelter-dashboard and moderation workflows in demos.', 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=900&q=80', '2026-03-13 12:00:00', '2026-03-18 11:20:00', 1016),
    (3006, 'Olive Branch Rescue', '33 Olive Road, Bizerte, Tunisia', '+216 72 440 333', 'shelter.pending@elif.com', 'TN-AR-2026-3006', 0, 'Pending shelter account for admin approval scenarios.', 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?auto=format&fit=crop&w=900&q=80', '2026-03-13 12:30:00', '2026-03-17 18:10:00', 1017);

INSERT INTO adoption_pet
    (
    id, name, type, breed, age, gender, size, color, health_status, spayed_neutered, special_needs, description, photos, available, shelter_id, created_at, adopted_at
    )
VALUES
    (4001, 'Milo', 'CHIEN', 'Labrador Retriever', 2, 'MALE', 'GRAND', 'Honey', 'Healthy', 1, NULL, 'Friendly young dog who enjoys long walks, treat puzzles, and calm family routines.', '["https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80"]', 1, 3001, '2026-03-14 09:30:00', NULL),
    (4002, 'Luna', 'CHAT', 'Domestic Shorthair', 1, 'FEMELLE', 'PETIT', 'Black and white', 'Healthy', 1, NULL, 'Curious cat who likes window seats, toys on strings, and soft blankets.', '["https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=900&q=80"]', 1, 3001, '2026-03-14 10:00:00', NULL),
    (4003, 'Thyme', 'RONGEUR', 'Guinea Pig', 3, 'FEMELLE', 'PETIT', 'Brown and white', 'Healthy', 0, 'Needs a quiet setup with predictable feeding times.', 'Gentle guinea pig who does best in calm homes with a consistent routine and fresh vegetables.', '["https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80"]', 0, 3002, '2026-03-14 10:30:00', '2026-03-25 15:00:00'),
    (4004, 'Pip', 'OISEAU', 'Cockatiel', 4, 'MALE', 'PETIT', 'Grey and yellow', 'Healthy', 0, NULL, 'Hand-friendly cockatiel with a good recall whistle and steady morning singing habit.', '["https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?auto=format&fit=crop&w=900&q=80"]', 1, 3003, '2026-03-14 11:00:00', NULL),
    (4005, 'Mochi', 'LAPIN', 'Mini Lop', 2, 'FEMELLE', 'PETIT', 'Cream', 'Healthy', 1, NULL, 'Quiet rabbit that likes hay tunnels, low shelving, and gentle handling.', '["https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=900&q=80"]', 1, 3003, '2026-03-14 11:30:00', NULL),
    (4006, 'Bruno', 'CHIEN', 'Mixed breed', 5, 'MALE', 'MOYEN', 'Brindle', 'Recovering from mild skin allergy', 1, 'Needs hypoallergenic shampoo once a week.', 'House-trained dog with a loyal temperament and strong progress on leash manners.', '["https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80"]', 0, 3002, '2026-03-14 12:10:00', '2026-03-26 18:00:00'),
    (4007, 'Nala', 'CHAT', 'Siamese mix', 2, 'FEMELLE', 'PETIT', 'Seal point', 'Healthy', 1, NULL, 'Affectionate cat that likes lap time, elevated shelves, and interactive feeding games.', '["https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=900&q=80"]', 1, 3004, '2026-03-14 12:45:00', NULL),
    (4008, 'Cedar', 'REPTILE', 'Leopard Gecko', 1, 'MALE', 'PETIT', 'Spotted tan', 'Healthy', 0, 'Needs heat gradient and nightly feeding schedule.', 'Calm gecko accustomed to handled care with a proper terrarium setup.', '["https://images.unsplash.com/photo-1543946207-39bd91e70ca7?auto=format&fit=crop&w=900&q=80"]', 1, 3004, '2026-03-14 13:20:00', NULL),
    (4009, 'Sunny', 'CHIEN', 'Beagle', 4, 'FEMELLE', 'MOYEN', 'Tri-color', 'Healthy', 1, NULL, 'Food-motivated dog that thrives with scent work, structured walks, and patient adopters.', '["https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80"]', 0, 3001, '2026-03-14 13:55:00', '2026-03-28 16:00:00'),
    (4010, 'Maple', 'CHAT', 'Tabby', 6, 'FEMELLE', 'PETIT', 'Orange tabby', 'Healthy', 1, 'Prefers low-stress homes without loud children.', 'Older cat with a gentle personality, easy litter habits, and a love for sunny napping spots.', '["https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&w=900&q=80"]', 1, 3002, '2026-03-14 14:30:00', NULL),
    (4011, 'Atlas', 'CHIEN', 'Border Collie mix', 3, 'MALE', 'MOYEN', 'Black and white', 'Healthy', 1, NULL, 'Energetic and trainable dog suited to active adopters who enjoy agility and enrichment play.', '["https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=900&q=80"]', 1, 3005, '2026-03-15 10:10:00', NULL),
    (4012, 'Ivy', 'CHAT', 'European Shorthair', 2, 'FEMELLE', 'PETIT', 'Gray', 'Healthy', 1, 'Needs a quiet home without frequent visitors.', 'Shy at first but affectionate after settling, with excellent litter habits and calm behavior indoors.', '["https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=900&q=80"]', 1, 3005, '2026-03-15 10:40:00', NULL);

INSERT INTO adoption_request
    (
    id, pet_id, adopter_id, status, date_requested, approved_date, notes, rejection_reason, housing_type, has_garden, has_children, other_pets, experience_level, created_at, updated_at
    )
VALUES
    (5001, 4001, 1005, 'PENDING', '2026-03-20 09:10:00', NULL, 'Looking for a companion for daily walks and calm evenings at home.', NULL, 'Apartment', 0, 0, 'None', 'Intermediate', '2026-03-20 09:10:00', '2026-03-20 09:10:00'),
    (5002, 4002, 1006, 'UNDER_REVIEW', '2026-03-20 10:05:00', NULL, 'Applicant has already visited the shelter and provided references.', NULL, 'House', 1, 1, 'One calm senior dog', 'Experienced', '2026-03-20 10:05:00', '2026-03-21 14:20:00'),
    (5003, 4003, 1007, 'APPROVED', '2026-03-19 11:45:00', '2026-03-22 16:30:00', 'Applicant prepared a quiet room and sent photos of the enclosure setup.', NULL, 'Apartment', 0, 0, 'None', 'First-time adopter', '2026-03-19 11:45:00', '2026-03-22 16:30:00'),
    (5004, 4004, 1008, 'REJECTED', '2026-03-21 08:30:00', NULL, 'Very interested, but the home does not yet have the required bird-safe setup.', 'No appropriate indoor enclosure was available at the time of review.', 'Apartment', 0, 1, 'Two cats', 'Beginner', '2026-03-21 08:30:00', '2026-03-23 10:00:00'),
    (5005, 4005, 1009, 'CANCELLED', '2026-03-21 10:20:00', NULL, 'Applicant had to pause the adoption process due to travel plans.', NULL, 'House', 1, 0, 'None', 'Intermediate', '2026-03-21 10:20:00', '2026-03-22 09:00:00'),
    (5006, 4006, 1010, 'APPROVED', '2026-03-22 09:15:00', '2026-03-24 12:00:00', 'Family has a secure yard and experience with rescue dogs.', NULL, 'House', 1, 1, 'One cat', 'Experienced', '2026-03-22 09:15:00', '2026-03-24 12:00:00'),
    (5007, 4007, 1011, 'UNDER_REVIEW', '2026-03-22 13:00:00', NULL, 'Great match on paper, waiting for the home visit results.', NULL, 'Apartment', 0, 0, 'None', 'Intermediate', '2026-03-22 13:00:00', '2026-03-23 17:30:00'),
    (5008, 4008, 1012, 'PENDING', '2026-03-23 08:45:00', NULL, 'Interested in a terrarium pet and ready to learn the setup details.', NULL, 'Apartment', 0, 0, 'None', 'Beginner', '2026-03-23 08:45:00', '2026-03-23 08:45:00'),
    (5009, 4009, 1013, 'APPROVED', '2026-03-23 10:10:00', '2026-03-25 15:20:00', 'Applicant sent a detailed enrichment plan and weekly walking schedule.', NULL, 'House', 1, 0, 'One adult cat', 'Experienced', '2026-03-23 10:10:00', '2026-03-25 15:20:00'),
    (5010, 4010, 1014, 'PENDING', '2026-03-24 16:35:00', NULL, 'Calm indoor home with a dedicated quiet room for decompression.', NULL, 'Apartment', 0, 1, 'None', 'First-time adopter', '2026-03-24 16:35:00', '2026-03-24 16:35:00'),
    (5011, 4011, 1006, 'UNDER_REVIEW', '2026-03-25 10:15:00', NULL, 'Applicant provided references and requested a weekend meet-and-greet.', NULL, 'House', 1, 1, 'One senior dog', 'Experienced', '2026-03-25 10:15:00', '2026-03-25 12:00:00'),
    (5012, 4012, 1009, 'PENDING', '2026-03-25 14:05:00', NULL, 'Interested in adopting a calm indoor cat with a predictable routine.', NULL, 'Apartment', 0, 0, 'None', 'Intermediate', '2026-03-25 14:05:00', '2026-03-25 14:05:00');

INSERT INTO contract
    (
    id, numero_contrat, refuge_id, adoptant_id, animal_id, date_signature, date_adoption, statut, conditions_generales, conditions_specifiques, frais_adoption, document_url, temoin_nom, temoin_email, created_at, updated_at
    )
VALUES
    (6001, 'CTR-2026-3001-4003', 3002, 1007, 4003, '2026-03-22 16:30:00', '2026-03-25 15:00:00', 'SIGNE', 'The adopter agrees to provide safe housing, routine care, and prompt veterinary follow-up when required.', 'Quiet feeding schedule, low-stress handling, and daily fresh vegetables are required for the first month.', 45.00, '/contracts/ctr-2026-3001-4003.pdf', 'Amel K.', 'amel.k@example.com', '2026-03-22 16:30:00', '2026-03-25 15:00:00'),
    (6002, 'CTR-2026-3002-4006', 3002, 1010, 4006, '2026-03-24 12:00:00', '2026-03-26 18:00:00', 'ACTIF', 'The adopter agrees to maintain secure outdoor access, regular grooming, and documented veterinary care.', 'Weekly hypoallergenic shampoo and a steady leash-training routine are required during the transition period.', 60.00, '/contracts/ctr-2026-3002-4006.pdf', 'Omar S.', 'omar.s@example.com', '2026-03-24 12:00:00', '2026-03-26 18:00:00'),
    (6003, 'CTR-2026-3001-4009', 3001, 1013, 4009, '2026-03-25 15:20:00', '2026-03-28 16:00:00', 'TERMINE', 'The adopter agrees to provide a secure home and keep the rescue informed of any major medical updates during the follow-up window.', 'Scent-work enrichment and a structured morning walk help keep this dog settled and engaged.', 55.00, '/contracts/ctr-2026-3001-4009.pdf', 'Sara M.', 'sara.m@example.com', '2026-03-25 15:20:00', '2026-03-28 16:00:00');

INSERT INTO appointment
    (
    id, request_id, pet_id, adopter_id, shelter_id, appointment_date, status, shelter_notes, consultation_result, response_message, compatibility_score, created_at, updated_at
    )
VALUES
    (7001, 5002, 4002, 1006, 3001, '2026-03-21 15:00:00', 'SCHEDULED', 'Bring a carrier and a printed list of household questions for the home visit.', 'PENDING', 'We reviewed the application and scheduled the next step for a quieter afternoon slot.', 78, '2026-03-21 11:00:00', '2026-03-21 11:00:00'),
    (7002, 5003, 4003, 1007, 3002, '2026-03-22 15:30:00', 'COMPLETED', 'Confirmed enclosure size, hay storage, and daily feeding habits.', 'APPROVED', 'The meeting went well and the home setup matched the care plan.', 92, '2026-03-22 15:30:00', '2026-03-22 17:00:00'),
    (7003, 5006, 4006, 1010, 3002, '2026-03-24 14:00:00', 'SCHEDULED', 'Please bring proof of yard access and a recent veterinarian reference.', 'PENDING', 'The appointment is confirmed and the shelter team is happy with the submitted documents.', 85, '2026-03-24 10:00:00', '2026-03-24 10:00:00'),
    (7004, 5007, 4007, 1011, 3004, '2026-03-23 16:00:00', 'NO_SHOW', 'Shelter waited 20 minutes and then moved to the next appointment slot.', 'PENDING', 'We did not complete the meeting, so the request remains open for rescheduling.', 61, '2026-03-23 16:00:00', '2026-03-23 16:35:00'),
    (7005, 5008, 4008, 1012, 3004, '2026-03-24 11:15:00', 'CANCELLED', 'The adopter asked to postpone until the terrarium setup is complete.', 'PENDING', 'No worries. Please rebook once the enclosure and lighting are ready.', 74, '2026-03-24 09:00:00', '2026-03-24 09:15:00'),
    (7006, 5009, 4009, 1013, 3001, '2026-03-25 14:45:00', 'COMPLETED', 'Observed calm leash handling and a strong bond with the household adults.', 'APPROVED', 'Great visit. The shelter team approved the placement after the demo walk.', 95, '2026-03-25 14:45:00', '2026-03-25 15:20:00'),
    (7007, 5011, 4011, 1006, 3005, '2026-03-27 10:30:00', 'SCHEDULED', 'Bring proof of vaccination history for current household pets.', 'PENDING', 'Appointment confirmed. Shelter team will include a short outdoor compatibility walk.', 82, '2026-03-26 08:50:00', '2026-03-26 08:50:00');

INSERT INTO shelter_review
    (
    id, shelter_id, user_id, rating, comment, is_approved, is_deleted, created_at, updated_at
    )
VALUES
    (8001, 3001, 1005, 5, 'The team was organized, kind, and clear about each pet''s history. It felt easy to ask detailed questions.', 1, 0, '2026-03-18 18:10:00', '2026-03-18 18:10:00'),
    (8002, 3001, 1007, 4, 'Good communication and a calm visit flow. I would suggest adding a little more shade to the waiting area.', 1, 0, '2026-03-19 09:25:00', '2026-03-19 09:25:00'),
    (8003, 3002, 1010, 5, 'We received very practical advice and the staff followed up after the appointment without being pushy.', 1, 0, '2026-03-20 17:30:00', '2026-03-20 17:30:00'),
    (8004, 3002, 1013, 4, 'Strong shelter overall. The matching process felt thoughtful and they explained the medical notes clearly.', 1, 0, '2026-03-21 14:00:00', '2026-03-21 14:00:00'),
    (8005, 3003, 1009, 5, 'The foster team gave detailed guidance for first-time adopters and made the next steps very easy to follow.', 1, 0, '2026-03-22 11:05:00', '2026-03-22 11:05:00'),
    (8006, 3004, 1011, 4, 'Nice staff and a clean space. I would love to see more appointment slots on weekends.', 1, 0, '2026-03-23 13:40:00', '2026-03-23 13:40:00'),
    (8007, 3005, 1006, 5, 'Very clear communication and a structured process. The team shared useful transition advice after the visit.', 1, 0, '2026-03-26 16:00:00', '2026-03-26 16:00:00');

INSERT INTO notification
    (
    id, user_id, title, message, type, reference_id, is_read, created_at
    )
VALUES
    (9001, 1007, 'Adoption request approved', 'Your adoption request for Thyme has been approved and the contract is ready for the next step.', 'ADOPTION_APPROVED', 5003, 0, '2026-03-22 16:40:00'),
    (9002, 1007, 'Contract generated', 'The adoption contract for Thyme has been generated and signed by the shelter.', 'CONTRACT_GENERATED', 6001, 0, '2026-03-22 16:45:00'),
    (9003, 1010, 'Adoption request approved', 'Your request for Bruno has been approved. The shelter team has scheduled the final handoff.', 'ADOPTION_APPROVED', 5006, 0, '2026-03-24 12:10:00'),
    (9004, 1013, 'Contract generated', 'Sunny''s adoption contract has been issued and the placement is marked active.', 'CONTRACT_GENERATED', 6003, 1, '2026-03-25 15:25:00'),
    (9005, 1008, 'Adoption request rejected', 'The team could not approve the bird adoption request because the home setup was incomplete.', 'ADOPTION_REJECTED', 5004, 0, '2026-03-23 10:05:00'),
    (9006, 1011, 'Appointment reminder', 'Your shelter visit for Nala is still awaiting a rescheduled time slot.', 'APPOINTMENT_REMINDER', 7004, 0, '2026-03-23 16:40:00'),
    (9007, 1006, 'Appointment scheduled', 'Your meet-and-greet for Atlas has been scheduled by Harbor Safe Haven.', 'APPOINTMENT_REMINDER', 7007, 0, '2026-03-26 08:55:00');

INSERT INTO adoption_image
    (
    id, category, file_name, content_type, file_data, created_at
    )
VALUES
    (9501, 'PET', 'atlas-demo.png', 'image/png', UNHEX('89504E470D0A1A0A'), '2026-03-18 10:30:00'),
    (9502, 'SHELTER_LOGO', 'harbor-safe-haven.png', 'image/png', UNHEX('89504E470D0A1A0A'), '2026-03-18 10:35:00');

COMMIT;

SET FOREIGN_KEY_CHECKS
= 1;