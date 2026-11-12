-- Pet Food Items Seed Data
-- Common pet foods with nutritional information

START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM pet_food_item WHERE id BETWEEN 1 AND 100;

SET FOREIGN_KEY_CHECKS = 1;

-- DOG FOODS (Dry Kibble)
INSERT INTO pet_food_item (id, name, brand, species, food_type, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, ingredients, is_system_food, user_id, created_at)
VALUES
(1, 'Adult Dry Dog Food', 'Royal Canin', 'DOG', 'Dry', 360, 26.0, 14.0, 38.0, 6.5, 'Chicken, rice, corn, wheat, chicken fat, beet pulp', true, null, NOW()),
(2, 'Science Diet Adult', 'Hill''s', 'DOG', 'Dry', 370, 24.0, 15.0, 40.0, 7.0, 'Chicken meal, whole grain wheat, cracked pearled barley', true, null, NOW()),
(3, 'Lamb & Rice Formula', 'Purina Pro Plan', 'DOG', 'Dry', 380, 26.0, 16.0, 42.0, 4.0, 'Lamb, rice, corn gluten meal, beef fat', true, null, NOW()),
(4, 'Grain-Free Chicken', 'Blue Buffalo', 'DOG', 'Dry', 390, 30.0, 16.0, 38.0, 5.0, 'Deboned chicken, chicken meal, peas, sweet potatoes', true, null, NOW()),
(5, 'Small Breed Adult', 'Royal Canin', 'DOG', 'Dry', 385, 27.0, 16.0, 39.0, 5.5, 'Chicken by-product meal, brewers rice, corn', true, null, NOW()),
(6, 'Large Breed Adult', 'Purina Pro Plan', 'DOG', 'Dry', 350, 26.0, 12.0, 44.0, 4.0, 'Chicken, rice, whole grain wheat, poultry by-product meal', true, null, NOW()),
(7, 'Puppy Growth Formula', 'Hill''s Science Diet', 'DOG', 'Dry', 395, 29.0, 18.0, 38.0, 3.5, 'Chicken, whole grain wheat, corn, chicken meal', true, null, NOW()),
(8, 'Senior 7+ Formula', 'Royal Canin', 'DOG', 'Dry', 340, 23.0, 13.0, 42.0, 7.0, 'Chicken by-product meal, brewers rice, corn', true, null, NOW()),

-- DOG FOODS (Wet/Canned)
(9, 'Chicken & Vegetables', 'Cesar', 'DOG', 'Wet', 95, 8.0, 5.0, 4.0, 1.0, 'Chicken, carrots, peas, gravy', true, null, NOW()),
(10, 'Beef Stew', 'Pedigree', 'DOG', 'Wet', 88, 7.5, 4.5, 5.0, 1.2, 'Beef, potatoes, carrots, gravy', true, null, NOW()),
(11, 'Turkey & Rice', 'Hill''s Science Diet', 'DOG', 'Wet', 102, 9.0, 5.5, 6.0, 1.5, 'Turkey, rice, carrots, chicken liver', true, null, NOW()),
(12, 'Salmon & Sweet Potato', 'Blue Buffalo', 'DOG', 'Wet', 110, 10.0, 6.0, 5.5, 1.0, 'Salmon, sweet potatoes, peas, fish broth', true, null, NOW()),

-- CAT FOODS (Dry Kibble)
(13, 'Adult Cat Food', 'Royal Canin', 'CAT', 'Dry', 380, 30.0, 13.0, 35.0, 6.0, 'Chicken meal, corn, wheat, chicken fat', true, null, NOW()),
(14, 'Indoor Cat Formula', 'Purina Pro Plan', 'CAT', 'Dry', 365, 33.0, 11.0, 38.0, 7.0, 'Chicken, rice, corn gluten meal, beef fat', true, null, NOW()),
(15, 'Hairball Control', 'Hill''s Science Diet', 'CAT', 'Dry', 355, 29.0, 12.0, 40.0, 9.0, 'Chicken, whole grain wheat, corn, chicken meal', true, null, NOW()),
(16, 'Grain-Free Salmon', 'Blue Buffalo', 'CAT', 'Dry', 400, 32.0, 15.0, 36.0, 5.0, 'Deboned salmon, chicken meal, peas, potatoes', true, null, NOW()),
(17, 'Kitten Growth', 'Royal Canin', 'CAT', 'Dry', 410, 34.0, 18.0, 32.0, 4.5, 'Chicken by-product meal, rice, corn', true, null, NOW()),
(18, 'Senior 11+ Formula', 'Purina Pro Plan', 'CAT', 'Dry', 350, 32.0, 10.0, 40.0, 6.0, 'Chicken, rice, corn gluten meal', true, null, NOW()),

-- CAT FOODS (Wet/Canned)
(19, 'Chicken Pate', 'Fancy Feast', 'CAT', 'Wet', 92, 10.0, 5.0, 3.0, 1.0, 'Chicken, liver, meat by-products, fish', true, null, NOW()),
(20, 'Tuna in Gravy', 'Friskies', 'CAT', 'Wet', 78, 9.0, 3.5, 4.0, 1.0, 'Tuna, fish broth, wheat gluten, gravy', true, null, NOW()),
(21, 'Salmon Feast', 'Sheba', 'CAT', 'Wet', 85, 11.0, 4.0, 2.5, 0.5, 'Salmon, fish broth, chicken, tapioca starch', true, null, NOW()),
(22, 'Turkey & Giblets', 'Fancy Feast', 'CAT', 'Wet', 90, 10.5, 4.5, 3.5, 1.0, 'Turkey, giblets, liver, meat by-products', true, null, NOW()),

-- TREATS (Dogs)
(23, 'Training Treats', 'Zuke''s', 'DOG', 'Treat', 320, 12.0, 8.0, 55.0, 3.0, 'Chicken, barley, oats, glycerin', true, null, NOW()),
(24, 'Dental Chews', 'Greenies', 'DOG', 'Treat', 280, 30.0, 5.0, 45.0, 10.0, 'Wheat flour, glycerin, wheat protein isolate', true, null, NOW()),
(25, 'Jerky Strips', 'Blue Buffalo', 'DOG', 'Treat', 310, 40.0, 10.0, 25.0, 2.0, 'Chicken, sweet potatoes, glycerin', true, null, NOW()),

-- TREATS (Cats)
(26, 'Crunchy Treats', 'Temptations', 'CAT', 'Treat', 415, 30.0, 17.0, 35.0, 4.5, 'Chicken by-product meal, ground corn, animal fat', true, null, NOW()),
(27, 'Freeze-Dried Chicken', 'PureBites', 'CAT', 'Treat', 380, 85.0, 8.0, 0.0, 0.0, '100% pure chicken breast', true, null, NOW()),
(28, 'Dental Treats', 'Greenies', 'CAT', 'Treat', 295, 28.0, 7.0, 42.0, 12.0, 'Chicken meal, ground wheat, corn gluten meal', true, null, NOW()),

-- PRESCRIPTION/SPECIAL DIET
(29, 'Weight Management', 'Hill''s Prescription Diet', 'DOG', 'Dry', 290, 28.0, 8.0, 48.0, 15.0, 'Chicken, whole grain wheat, corn, chicken meal', true, null, NOW()),
(30, 'Digestive Care', 'Royal Canin Veterinary', 'DOG', 'Dry', 345, 24.0, 12.0, 46.0, 8.0, 'Rice, chicken by-product meal, corn', true, null, NOW()),
(31, 'Urinary Care', 'Hill''s Prescription Diet', 'CAT', 'Dry', 360, 33.0, 13.0, 38.0, 5.0, 'Chicken, corn, chicken meal, pork fat', true, null, NOW()),
(32, 'Kidney Care', 'Royal Canin Veterinary', 'CAT', 'Dry', 385, 23.0, 16.0, 44.0, 6.0, 'Corn, chicken fat, rice, corn gluten meal', true, null, NOW());

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
