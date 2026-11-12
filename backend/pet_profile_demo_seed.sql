START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

-- Clean up all related pet entities
DELETE FROM pet_care_task WHERE pet_id BETWEEN 5001 AND 5020;
DELETE FROM pet_feeding_log WHERE pet_id BETWEEN 5001 AND 5020;
DELETE FROM pet_nutrition_profile WHERE pet_id BETWEEN 5001 AND 5020;
DELETE FROM pet_health_record WHERE pet_id BETWEEN 5001 AND 5020;
DELETE FROM pet WHERE id BETWEEN 5001 AND 5020;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. PET PROFILES
-- ============================================================
INSERT INTO pet
    (
    id, user_id, name, species, breed, weight, date_of_birth, gender, photo_url, created_at, updated_at
    )
VALUES
    (5001, 1005, 'Max', 'DOG', 'Golden Retriever', 32.50, '2025-07-15', 'MALE', 'https://i.pinimg.com/736x/c9/6b/cd/c96bcd9d4e2e871deba0f76d47ca0ea8.jpg', '2026-01-10 10:00:00', '2026-03-18 08:00:00'),
    (5002, 1005, 'Luna', 'CAT', 'British Shorthair', 4.50, '2023-02-28', 'FEMALE', 'https://i.pinimg.com/1200x/3a/37/87/3a37879b6c88faeaac9098a6806abd18.jpg', '2026-01-15 14:30:00', '2026-03-17 09:15:00'),
    (5003, 1006, 'Whiskers', 'CAT', 'Persian', 3.80, '2022-05-10', 'MALE', 'https://i.pinimg.com/736x/5c/1f/8e/5c1f8e0c23050f0966b9d22fdfa539b4.jpg', '2026-02-01 11:00:00', '2026-03-16 15:45:00'),
    (5004, 1006, 'Buddy', 'DOG', 'Labrador Retriever', 28.00, '2024-11-03', 'MALE', 'https://hips.hearstapps.com/hmg-prod/images/labrador-puppy-royalty-free-image-1626252338.jpg?crop=0.88847xw:1xh;center,top&resize=1200:*', '2026-02-05 09:30:00', '2026-03-18 07:20:00'),
    (5006, 1007, 'Sadie', 'DOG', 'German Shepherd', 35.50, '2023-04-18', 'FEMALE', 'https://i.pinimg.com/736x/1b/1a/7b/1b1a7b7a8f0246b8cfa9c9bca66b1858.jpg', '2026-02-15 16:00:00', '2026-03-17 11:10:00'),
    (5007, 1008, 'Simba', 'CAT', 'Bengal', 4.80, '2023-09-05', 'MALE', 'https://i.pinimg.com/736x/ef/b3/cd/efb3cd5248f920a6e992e2c606a540e4.jpg', '2026-02-20 10:15:00', '2026-03-18 08:45:00'),
    (5008, 1008, 'Rocky', 'DOG', 'Rottweiler', 45.00, '2022-01-12', 'MALE', 'https://i.pinimg.com/736x/65/e4/ac/65e4ac10cf531833b7a729de9e6912c0.jpg', '2026-02-25 14:40:00', '2026-03-16 10:20:00'),
    (5009, 1009, 'Whisky', 'DOG', 'Corgi', 12.50, '2025-03-20', 'MALE', 'https://i.pinimg.com/736x/c7/1e/1a/c71e1a3ff950e78e85d96d72747bddb7.jpg', '2026-03-01 09:00:00', '2026-03-18 07:50:00'),
    (5011, 1010, 'Zeus', 'DOG', 'Husky', 28.50, '2024-08-30', 'MALE', 'https://i.pinimg.com/736x/a0/58/87/a058874e2b6f90384a40be3b39b27078.jpg', '2026-03-08 11:20:00', '2026-03-18 08:30:00'),
    (5012, 1010, 'Bella', 'DOG', 'Poodle', 18.00, '2023-12-25', 'FEMALE', 'https://i.pinimg.com/736x/d6/3e/3a/d63e3aa8bd335088d62a451c21e0a49f.jpg', '2026-03-10 13:45:00', '2026-03-17 14:55:00'),
    (5013, 1011, 'Bruno', 'CAT', 'Tabby', 4.50, '2025-03-28', 'MALE', 'https://scontent-pmo1-1.xx.fbcdn.net/v/t1.15752-9/656985466_1500634271594362_8796994098896792831_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=104&ccb=1-7&_nc_sid=9f807c&_nc_ohc=JLVOOdFxmk0Q7kNvwEbovaO&_nc_oc=AdpXR_bpJsdd69iO2835i-ix4T5R1I3n-cQeL-ggM6dbQtZtS5nE1ZMYQL8RUNwGjq4&_nc_zt=23&_nc_ht=scontent-pmo1-1.xx&_nc_ss=7a32e&oh=03_Q7cD4wGNH9WqGYvqFUBT6XJnxbPB2gY1rl0EqLziCSf-idHfPA&oe=69F0A248', '2026-03-15 10:00:00', '2026-03-18 09:00:00'),
    (5014, 1011, 'Perla', 'CAT', 'Russian Blue', 3.80, '2019-01-01', 'FEMALE', 'https://i.ibb.co/d49J2jhd/image.png', '2026-03-18 09:15:00', '2026-03-18 09:15:00');

-- ============================================================
-- 2. PET HEALTH RECORDS
-- ============================================================
INSERT INTO pet_health_record
    (
    id, pet_id, record_date, visit_type, veterinarian, clinic_name, blood_type, spayed_neutered,
    allergies, chronic_conditions, previous_operations, vaccination_history, special_diet,
    parasite_prevention, emergency_instructions, diagnosis, treatment, medications, notes,
    next_visit_date, created_at, updated_at
    )
VALUES
    (13001, 5001, '2026-03-22', 'ANNUAL_CHECKUP', 'Dr. Nadia Ben Ali', 'Happy Paws Clinic', 'A+', 'YES',
     'None', 'None', 'None', 'Rabies 2025-03-20; DHPP 2025-03-20', 'High-protein kibble',
     'Monthly spot-on treatment', 'Call owner immediately if persistent vomiting', 'Healthy',
     'Routine wellness guidance', 'None', 'Weight stable, active and alert.', '2026-09-22',
     '2026-03-22 10:00:00', '2026-03-22 10:00:00'),

    (13002, 5002, '2026-03-25', 'VACCINATION', 'Dr. Sami Khlifi', 'City Vet Center', 'B+', 'NO',
     'Chicken allergy', 'Sensitive digestion', 'Dental cleaning 2025', 'FVRCP 2025-09-01',
     'Hypoallergenic wet food', 'Quarterly deworming', 'Avoid chicken-based medication flavoring',
     'Mild skin irritation', 'Topical treatment for 7 days', 'Omega-3 supplement',
     'Monitor scratching frequency.', '2026-04-25', '2026-03-25 16:30:00', '2026-03-25 16:30:00'),

    (13003, 5003, '2026-03-19', 'DENTAL_CHECK', 'Dr. Meriem Trabelsi', 'North Vet House', 'AB+', 'YES',
     'None', 'None', 'Tooth extraction 2024', 'Rabies 2025-05-11; FVRCP 2025-05-11',
     'Soft kibble for 7 days', 'Monthly deworming', 'No hard treats for one week',
     'Mild tartar buildup', 'Professional cleaning performed', 'Post-cleaning rinse',
     'Recovered well within 24h.', '2026-06-19', '2026-03-19 11:20:00', '2026-03-19 11:20:00'),

    (13004, 5004, '2026-03-24', 'INJURY_VISIT', 'Dr. Oussama Gharsalli', 'Westside Animal Care', 'O+', 'NO',
     'None', 'Hip sensitivity', 'None', 'Rabies 2025-11-03; DHPP 2025-11-03',
     'Joint-support formula', 'Tick collar every 8 months',
     'Reduce running and stairs for 10 days', 'Front paw sprain',
     'Anti-inflammatory plan and rest', 'Carprofen 25mg daily x5',
     'Follow-up if limping continues.', '2026-04-03', '2026-03-24 09:40:00', '2026-03-24 09:40:00'),

    (13005, 5006, '2026-03-26', 'LAB_TEST', 'Dr. Aya Mzoughi', 'PetLife Diagnostics', 'A-', 'YES',
     'Pollen', 'None', 'Spay surgery 2024', 'Rabies 2025-04-20; DHPP 2025-04-20',
     'Weight-management diet', 'Topical flea prevention monthly',
     'Watch hydration and appetite', 'Routine blood panel',
     'No abnormalities detected', 'None', 'Results shared with owner by email.',
     '2026-09-26', '2026-03-26 13:15:00', '2026-03-26 13:15:00'),

    (13006, 5007, '2026-03-21', 'GROOMING_CLEARANCE', 'Dr. Hichem Saidi', 'Coastal Vet Clinic', 'B-', 'YES',
     'None', 'Mild dermatitis', 'None', 'Rabies 2025-09-06; FVRCP 2025-09-06',
     'Skin-sensitive nutrition', 'Deworm every 3 months',
     'Use hypoallergenic shampoo only', 'Dermatitis stable',
     'Topical care maintained', 'Skin spray as needed',
     'Cleared for grooming package.', '2026-06-21', '2026-03-21 08:55:00', '2026-03-21 08:55:00'),

    (13007, 5008, '2026-03-23', 'ANNUAL_CHECKUP', 'Dr. Rania Hammami', 'Prime Animal Center', 'O-', 'YES',
     'Beef protein', 'None', 'Knee surgery 2023', 'Rabies 2025-01-15; DHPP 2025-01-15',
     'Large-breed maintenance diet', 'Monthly tick and flea combo',
     'Avoid high-impact jumps', 'General health good',
     'Continue current conditioning plan', 'Glucosamine daily',
     'Slight overweight trend, monitor portions.', '2026-09-23',
     '2026-03-23 15:10:00', '2026-03-23 15:10:00'),

    (13008, 5009, '2026-03-27', 'VACCINATION', 'Dr. Khaled Ben Youssef', 'Central Pet Hospital', 'A+', 'NO',
     'None', 'None', 'None', 'Rabies 2026-03-27; DHPP 2026-03-27',
     'Puppy growth formula', 'Deworming every 6 weeks',
     'Observe for fever or fatigue 24h after shots', 'Vaccines administered on schedule',
     'Standard post-vaccine observation', 'None',
     'Owner advised on booster timeline.', '2026-04-27',
     '2026-03-27 17:00:00', '2026-03-27 17:00:00');

-- ============================================================
-- 3. PET NUTRITION PROFILES
-- ============================================================
INSERT INTO pet_nutrition_profile
    (
    id, pet_id, goal, activity_level, target_weight_kg, daily_calorie_target, meals_per_day,
    food_preference, allergies, forbidden_ingredients, created_at, updated_at
    )
VALUES
    (6001, 5001, 'MAINTAIN', 'MODERATE', 30.00, 1300, 2, 'Dry kibble', 'None', 'Artificial preservatives', '2026-01-10 10:00:00', '2026-03-18 08:00:00'),
    (6002, 5002, 'MAINTAIN', 'LOW', 4.50, 180, 2, 'Wet food', 'Chicken', 'Corn, wheat', '2026-01-15 14:30:00', '2026-03-17 09:15:00'),
    (6003, 5003, 'WEIGHT_GAIN', 'LOW', 4.00, 160, 2, 'Wet food', 'None', 'Fish by-products', '2026-02-01 11:00:00', '2026-03-16 15:45:00'),
    (6004, 5004, 'MAINTAIN', 'MODERATE', 28.50, 1100, 2, 'Dry kibble', 'None', 'High fat content', '2026-02-05 09:30:00', '2026-03-18 07:20:00'),
    (6006, 5006, 'WEIGHT_LOSS', 'HIGH', 33.00, 1400, 2, 'Dry kibble', 'Pollen (environmental)', 'Beef', '2026-02-15 16:00:00', '2026-03-17 11:10:00'),
    (6007, 5007, 'MAINTAIN', 'MODERATE', 4.80, 200, 2, 'Mixed', 'None', 'None', '2026-02-20 10:15:00', '2026-03-18 08:45:00'),
    (6008, 5008, 'WEIGHT_LOSS', 'MODERATE', 42.00, 1600, 2, 'Dry kibble', 'Beef protein', 'Soy', '2026-02-25 14:40:00', '2026-03-16 10:20:00'),
    (6009, 5009, 'MAINTAIN', 'HIGH', 13.00, 500, 2, 'Dry kibble', 'None', 'Grains', '2026-03-01 09:00:00', '2026-03-18 07:50:00'),
    (6011, 5011, 'MAINTAIN', 'HIGH', 28.00, 1200, 2, 'Dry kibble', 'None', 'Soy, corn', '2026-03-08 11:20:00', '2026-03-18 08:30:00'),
    (6012, 5012, 'WEIGHT_LOSS', 'MODERATE', 17.50, 700, 2, 'Dry kibble', 'None', 'Artificial colors', '2026-03-10 13:45:00', '2026-03-17 14:55:00'),
    (6013, 5013, 'MAINTAIN', 'LOW', 4.50, 170, 2, 'Wet food', 'None', 'Soy, corn', '2026-03-15 10:00:00', '2026-03-18 09:00:00'),
    (6014, 5014, 'WEIGHT_GAIN', 'LOW', 4.00, 150, 2, 'Wet food', 'None', 'Wheat', '2026-03-18 09:15:00', '2026-03-18 09:15:00');

-- ============================================================
-- 4. PET FEEDING LOGS (Recent meals)
-- ============================================================
INSERT INTO pet_feeding_log
    (
    id, pet_id, fed_at, meal_label, food_name, portion_grams, calories_actual, 
    protein_grams, fat_grams, carbs_grams, status, note, photo_url, created_at
    )
VALUES
    -- Max (Dog) - Multiple meals
    (7001, 5001, '2026-03-18 08:00:00', 'Breakfast', 'Royal Canin Adult Dry', 250.00, 360, 65.00, 35.00, 95.00, 'COMPLETED', 'Ate well', NULL, '2026-03-18 08:00:00'),
    (7002, 5001, '2026-03-18 18:00:00', 'Dinner', 'Royal Canin Adult Dry', 250.00, 360, 65.00, 35.00, 95.00, 'COMPLETED', 'Finished plate', NULL, '2026-03-18 18:00:00'),
    
    -- Luna (Cat) - Multiple meals
    (7003, 5002, '2026-03-18 07:30:00', 'Morning', 'Fancy Feast Chicken Pate', 85.00, 78, 8.50, 4.25, 2.55, 'COMPLETED', 'Enjoyed breakfast', NULL, '2026-03-18 07:30:00'),
    (7004, 5002, '2026-03-18 19:00:00', 'Evening', 'Fancy Feast Chicken Pate', 85.00, 78, 8.50, 4.25, 2.55, 'COMPLETED', 'Full appetite', NULL, '2026-03-18 19:00:00'),
    
    -- Whiskers (Cat) - Multiple meals
    (7005, 5003, '2026-03-18 08:00:00', 'Morning', 'Sheba Salmon Feast', 62.50, 53, 6.88, 2.50, 1.56, 'COMPLETED', 'Consumed all', NULL, '2026-03-18 08:00:00'),
    (7006, 5003, '2026-03-18 20:00:00', 'Evening', 'Sheba Salmon Feast', 62.50, 53, 6.88, 2.50, 1.56, 'COMPLETED', 'Healthy appetite', NULL, '2026-03-18 20:00:00'),
    
    -- Buddy (Dog) - Multiple meals
    (7007, 5004, '2026-03-18 07:00:00', 'Breakfast', 'Purina Pro Plan Adult', 200.00, 360, 52.00, 30.00, 88.00, 'COMPLETED', 'All eaten', NULL, '2026-03-18 07:00:00'),
    (7008, 5004, '2026-03-18 19:00:00', 'Dinner', 'Purina Pro Plan Adult', 200.00, 360, 52.00, 30.00, 88.00, 'COMPLETED', 'Good intake', NULL, '2026-03-18 19:00:00'),
    
    -- Sadie (Dog) - Multiple meals
    (7009, 5006, '2026-03-18 08:30:00', 'Breakfast', 'Royal Canin Large Breed', 280.00, 350, 73.00, 33.00, 123.00, 'COMPLETED', 'Finished quickly', NULL, '2026-03-18 08:30:00'),
    (7010, 5006, '2026-03-18 19:30:00', 'Dinner', 'Royal Canin Large Breed', 280.00, 350, 73.00, 33.00, 123.00, 'COMPLETED', 'Normal appetite', NULL, '2026-03-18 19:30:00'),
    
    -- Simba (Cat) - Multiple meals
    (7011, 5007, '2026-03-18 09:00:00', 'Morning', 'Friskies Tuna in Gravy', 78.00, 61, 7.02, 2.73, 3.12, 'COMPLETED', 'Licked bowl clean', NULL, '2026-03-18 09:00:00'),
    (7012, 5007, '2026-03-18 21:00:00', 'Night', 'Friskies Tuna in Gravy', 78.00, 61, 7.02, 2.73, 3.12, 'COMPLETED', 'Good appetite', NULL, '2026-03-18 21:00:00'),
    
    -- Rocky (Dog) - Multiple meals
    (7013, 5008, '2026-03-18 07:30:00', 'Breakfast', 'Purina Pro Plan Large', 320.00, 350, 83.00, 38.00, 141.00, 'COMPLETED', 'Eaten completely', NULL, '2026-03-18 07:30:00'),
    (7014, 5008, '2026-03-18 18:30:00', 'Dinner', 'Purina Pro Plan Large', 320.00, 350, 83.00, 38.00, 141.00, 'COMPLETED', 'Full meal consumed', NULL, '2026-03-18 18:30:00'),
    
    -- Whisky (Dog/Corgi) - Multiple meals
    (7015, 5009, '2026-03-18 08:00:00', 'Breakfast', 'Royal Canin Small Breed', 120.00, 350, 32.00, 19.00, 47.00, 'COMPLETED', 'Eagerly ate', NULL, '2026-03-18 08:00:00'),
    (7016, 5009, '2026-03-18 19:00:00', 'Dinner', 'Royal Canin Small Breed', 120.00, 350, 32.00, 19.00, 47.00, 'COMPLETED', 'Cleaned plate', NULL, '2026-03-18 19:00:00'),
    
    -- Zeus (Dog/Husky) - Multiple meals
    (7017, 5011, '2026-03-18 07:00:00', 'Breakfast', 'Blue Buffalo Grain-Free', 240.00, 390, 72.00, 38.40, 91.20, 'COMPLETED', 'Enjoyed breakfast', NULL, '2026-03-18 07:00:00'),
    (7018, 5011, '2026-03-18 20:00:00', 'Dinner', 'Blue Buffalo Grain-Free', 240.00, 390, 72.00, 38.40, 91.20, 'COMPLETED', 'High energy meal', NULL, '2026-03-18 20:00:00'),
    
    -- Bella (Dog/Poodle) - Multiple meals
    (7019, 5012, '2026-03-18 08:00:00', 'Breakfast', 'Hill''s Science Diet Small', 150.00, 370, 36.00, 22.50, 60.00, 'COMPLETED', 'Ate all food', NULL, '2026-03-18 08:00:00'),
    (7020, 5012, '2026-03-18 18:00:00', 'Dinner', 'Hill''s Science Diet Small', 150.00, 370, 36.00, 22.50, 60.00, 'COMPLETED', 'Normal appetite', NULL, '2026-03-18 18:00:00'),
    
    -- Bruno (Cat) - Multiple meals
    (7021, 5013, '2026-03-18 07:00:00', 'Morning', 'Fancy Feast Turkey & Giblets', 90.00, 81, 9.45, 4.05, 3.15, 'COMPLETED', 'Consumed completely', NULL, '2026-03-18 07:00:00'),
    (7022, 5013, '2026-03-18 19:00:00', 'Evening', 'Fancy Feast Turkey & Giblets', 90.00, 81, 9.45, 4.05, 3.15, 'COMPLETED', 'Great appetite', NULL, '2026-03-18 19:00:00'),
    
    -- Perla (Cat) - Multiple meals
    (7023, 5014, '2026-03-18 08:00:00', 'Morning', 'Sheba Salmon Feast', 60.00, 51, 6.60, 2.40, 1.50, 'COMPLETED', 'Finished meal', NULL, '2026-03-18 08:00:00'),
    (7024, 5014, '2026-03-18 20:00:00', 'Evening', 'Sheba Salmon Feast', 60.00, 51, 6.60, 2.40, 1.50, 'COMPLETED', 'Normal intake', NULL, '2026-03-18 20:00:00');

-- ============================================================
-- 5. PET CARE TASKS
-- ============================================================
INSERT INTO pet_care_task
    (
    id, pet_id, title, category, urgency, status, due_date, notes, recurrence, created_at, updated_at
    )
VALUES
    -- Max's care tasks
    (8001, 5001, 'Vet Annual Checkup', 'Healthcare', 'HIGH', 'DONE', '2026-03-22', 'Annual physical examination and vaccinations', 'NONE', '2026-01-10 10:00:00', '2026-03-22 10:00:00'),
    (8002, 5001, 'Flea and Tick Prevention', 'Health', 'HIGH', 'NEXT', '2026-04-10', 'Apply monthly spot-on treatment', 'WEEKLY', '2026-03-10 08:00:00', '2026-03-18 08:00:00'),
    (8003, 5001, 'Dental Cleaning', 'Health', 'MEDIUM', 'NEXT', '2026-06-01', 'Professional dental cleaning at vet', 'NONE', '2026-01-10 10:00:00', '2026-03-18 08:00:00'),
    (8004, 5001, 'Nail Trim', 'Grooming', 'MEDIUM', 'NEXT', '2026-04-01', 'Trim nails when they click on floor', 'WEEKLY', '2026-02-01 10:00:00', '2026-03-18 08:00:00'),
    
    -- Luna's care tasks
    (8005, 5002, 'Vaccination Booster', 'Healthcare', 'HIGH', 'NEXT', '2026-04-25', 'FVRCP booster vaccination', 'NONE', '2026-01-15 14:30:00', '2026-03-18 09:15:00'),
    (8006, 5002, 'Deworming', 'Health', 'HIGH', 'DONE', '2026-03-18', 'Quarterly deworming treatment', 'WEEKLY', '2026-01-20 10:00:00', '2026-03-18 09:15:00'),
    (8007, 5002, 'Litter Box Cleaning', 'Daily Care', 'MEDIUM', 'NEXT', '2026-03-19', 'Daily litter maintenance', 'DAILY', '2026-03-18 09:15:00', '2026-03-18 09:15:00'),
    
    -- Whiskers' care tasks
    (8008, 5003, 'Dental Check', 'Healthcare', 'HIGH', 'DONE', '2026-03-19', 'Professional dental examination', 'NONE', '2026-02-01 11:00:00', '2026-03-19 11:20:00'),
    (8009, 5003, 'Grooming Session', 'Grooming', 'MEDIUM', 'NEXT', '2026-04-15', 'Professional grooming and bath', 'WEEKLY', '2026-02-01 11:00:00', '2026-03-16 15:45:00'),
    (8010, 5003, 'Weight Monitoring', 'Health', 'LOW', 'NEXT', '2026-04-01', 'Monitor weight and appetite', 'WEEKLY', '2026-01-01 10:00:00', '2026-03-16 15:45:00'),
    
    -- Buddy's care tasks
    (8011, 5004, 'Injury Rehabilitation', 'Healthcare', 'HIGH', 'NOW', '2026-04-03', 'Limit physical activity, monitor paw sprain', 'WEEKLY', '2026-03-24 09:40:00', '2026-03-24 09:40:00'),
    (8012, 5004, 'Anti-inflammatory Medication', 'Health', 'HIGH', 'NEXT', '2026-03-23', 'Give Carprofen 25mg daily for 5 days', 'NONE', '2026-03-23 08:00:00', '2026-03-24 09:40:00'),
    (8013, 5004, 'Exercise Restriction', 'Health', 'HIGH', 'NOW', '2026-03-31', 'No running or stairs for 10 days', 'WEEKLY', '2026-03-24 10:00:00', '2026-03-24 10:00:00'),
    
    -- Sadie's care tasks
    (8014, 5006, 'Weight Management', 'Health', 'MEDIUM', 'NEXT', '2026-04-01', 'Monitor portions and increase exercise', 'WEEKLY', '2026-02-15 16:00:00', '2026-03-17 11:10:00'),
    (8015, 5006, 'Flea/Tick Prevention', 'Health', 'HIGH', 'NEXT', '2026-04-20', 'Monthly topical flea prevention', 'WEEKLY', '2026-02-15 16:00:00', '2026-03-17 11:10:00'),
    (8016, 5006, 'Blood Work Follow-up', 'Healthcare', 'MEDIUM', 'NEXT', '2026-06-26', 'Repeat blood panel in 3 months', 'NONE', '2026-03-26 13:15:00', '2026-03-26 13:15:00'),
    
    -- Simba's care tasks
    (8017, 5007, 'Skin Care Routine', 'Health', 'HIGH', 'NEXT', '2026-04-21', 'Apply topical skin spray as needed', 'WEEKLY', '2026-02-20 10:15:00', '2026-03-18 08:45:00'),
    (8018, 5007, 'Deworming', 'Health', 'HIGH', 'NEXT', '2026-05-21', 'Deworming every 3 months', 'WEEKLY', '2026-02-20 10:15:00', '2026-03-18 08:45:00'),
    (8019, 5007, 'Hypoallergenic Shampoo Bath', 'Grooming', 'MEDIUM', 'NEXT', '2026-04-10', 'Use hypoallergenic shampoo only', 'WEEKLY', '2026-02-20 10:15:00', '2026-03-18 08:45:00'),
    
    -- Rocky's care tasks
    (8020, 5008, 'Joint Supplement Daily', 'Health', 'HIGH', 'NEXT', '2026-09-23', 'Daily Glucosamine supplement', 'DAILY', '2026-02-25 14:40:00', '2026-03-16 10:20:00'),
    (8021, 5008, 'Weight Reduction Program', 'Health', 'MEDIUM', 'NOW', '2026-09-23', 'Monitor portions, increase walks', 'DAILY', '2026-02-25 14:40:00', '2026-03-16 10:20:00'),
    (8022, 5008, 'Tick and Flea Combo', 'Health', 'HIGH', 'NEXT', '2026-04-23', 'Apply monthly combination treatment', 'WEEKLY', '2026-02-25 14:40:00', '2026-03-16 10:20:00'),
    
    -- Whisky's care tasks
    (8023, 5009, 'Puppy Vaccination Schedule', 'Healthcare', 'HIGH', 'NOW', '2026-04-27', 'Complete puppy vaccination series', 'NONE', '2026-03-27 17:00:00', '2026-03-27 17:00:00'),
    (8024, 5009, 'Deworming Schedule', 'Health', 'HIGH', 'NEXT', '2026-05-08', 'Deworming every 6 weeks for puppies', 'WEEKLY', '2026-03-01 09:00:00', '2026-03-18 07:50:00'),
    (8025, 5009, 'Puppy Socialization', 'Training', 'MEDIUM', 'NOW', '2026-06-01', 'Puppy socialization classes', 'WEEKLY', '2026-03-01 09:00:00', '2026-03-18 07:50:00'),
    
    -- Zeus' care tasks
    (8026, 5011, 'Flea/Tick Collar', 'Health', 'HIGH', 'NEXT', '2026-04-30', 'Tick collar renewal every 8 months', 'WEEKLY', '2026-03-08 11:20:00', '2026-03-18 08:30:00'),
    (8027, 5011, 'High-Energy Exercise', 'Daily Care', 'MEDIUM', 'NEXT', '2026-03-19', 'Daily vigorous exercise sessions', 'DAILY', '2026-03-08 11:20:00', '2026-03-18 08:30:00'),
    (8028, 5011, 'Ear Cleaning', 'Grooming', 'MEDIUM', 'NEXT', '2026-04-08', 'Weekly ear cleaning to prevent issues', 'WEEKLY', '2026-03-08 11:20:00', '2026-03-18 08:30:00'),
    
    -- Bella's care tasks
    (8029, 5012, 'Vaccination Booster', 'Healthcare', 'HIGH', 'NEXT', '2026-12-25', 'Annual vaccination booster', 'NONE', '2026-03-10 13:45:00', '2026-03-17 14:55:00'),
    (8030, 5012, 'Grooming Appointment', 'Grooming', 'MEDIUM', 'NEXT', '2026-04-10', 'Professional grooming for Poodle coat', 'WEEKLY', '2026-03-10 13:45:00', '2026-03-17 14:55:00'),
    (8031, 5012, 'Nail Trim', 'Grooming', 'MEDIUM', 'NEXT', '2026-04-01', 'Trim nails regularly', 'WEEKLY', '2026-03-10 13:45:00', '2026-03-17 14:55:00'),
    
    -- Bruno's care tasks
    (8032, 5013, 'Vaccination Update', 'Healthcare', 'HIGH', 'NEXT', '2026-09-28', 'Complete vaccination series', 'NONE', '2026-03-15 10:00:00', '2026-03-18 09:00:00'),
    (8033, 5013, 'Litter Box Maintenance', 'Daily Care', 'MEDIUM', 'NEXT', '2026-03-19', 'Clean litter box daily', 'DAILY', '2026-03-15 10:00:00', '2026-03-18 09:00:00'),
    (8034, 5013, 'Parasite Prevention', 'Health', 'HIGH', 'NEXT', '2026-06-28', 'Quarterly deworming and flea treatment', 'WEEKLY', '2026-03-15 10:00:00', '2026-03-18 09:00:00'),
    
    -- Perla's care tasks
    (8035, 5014, 'Annual Vet Check', 'Healthcare', 'HIGH', 'NEXT', '2026-12-01', 'Annual comprehensive physical exam', 'NONE', '2026-03-18 09:15:00', '2026-03-18 09:15:00'),
    (8036, 5014, 'Litter Maintenance', 'Daily Care', 'MEDIUM', 'NEXT', '2026-03-19', 'Clean litter box daily', 'DAILY', '2026-03-18 09:15:00', '2026-03-18 09:15:00'),
    (8037, 5014, 'Wellness Monitoring', 'Health', 'LOW', 'NEXT', '2026-04-18', 'Regular health check and behavior monitoring', 'WEEKLY', '2026-03-18 09:15:00', '2026-03-18 09:15:00');

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
