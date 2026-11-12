-- Elif marketplace demo seed data
-- Import after backend/community_demo_seed.sql so demo users already exist.

START
TRANSACTION;

SET FOREIGN_KEY_CHECKS
= 0;

DELETE FROM order_item WHERE id BETWEEN 12001 AND 12100;
DELETE FROM order_tb WHERE id BETWEEN 11001 AND 11100;
DELETE FROM product WHERE id BETWEEN 10001 AND 10100;

SET FOREIGN_KEY_CHECKS
= 1;

INSERT INTO product
    (id, name, description, category, price, stock, image_url, active, created_at, updated_at)
VALUES
    (10001, 'Premium Salmon Kibble 3kg', 'High-protein dry food with salmon and omega oils for active adult dogs.', 'Food & Feed', 42.00, 48, 'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=900&q=80', 1, '2026-03-10 09:00:00', '2026-03-18 08:30:00'),
    (10002, 'Sensitive Digestion Cat Formula 2kg', 'Balanced dry food designed for cats with sensitive stomachs.', 'Food & Feed', 27.50, 64, 'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&w=900&q=80', 1, '2026-03-10 09:15:00', '2026-03-18 08:35:00'),
    (10003, 'Complete First Aid Pet Kit', 'Emergency kit with gauze, disinfectant wipes, and safety tools for travel and home.', 'Health Essentials', 55.00, 35, 'https://images.unsplash.com/photo-1577174881658-0f30ed549adc?auto=format&fit=crop&w=900&q=80', 1, '2026-03-10 09:30:00', '2026-03-18 08:40:00'),
    (10004, 'Probiotic Digestive Chews', 'Daily digestive support chews suitable for medium and large dogs.', 'Health Essentials', 18.00, 82, 'https://images.unsplash.com/photo-1612531385446-f7f6a9d4cf62?auto=format&fit=crop&w=900&q=80', 1, '2026-03-10 09:45:00', '2026-03-18 08:45:00'),
    (10005, 'Adjustable Travel Crate M', 'Foldable travel crate with reinforced corners and washable mat.', 'Accessories', 95.00, 22, 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=900&q=80', 1, '2026-03-10 10:00:00', '2026-03-18 08:50:00'),
    (10006, 'No-Pull Harness Set', 'Breathable harness with front clip and reflective stitching for safer walks.', 'Accessories', 39.90, 41, 'https://images.unsplash.com/photo-1594149929911-78975a43d4f5?auto=format&fit=crop&w=900&q=80', 1, '2026-03-10 10:15:00', '2026-03-18 08:55:00'),
    (10007, 'Elif Rescue Tote Bag', 'Heavy cotton tote with Elif rescue print. Purchases support shelter operations.', 'Merchandise', 16.00, 120, 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=900&q=80', 1, '2026-03-10 10:30:00', '2026-03-18 09:00:00'),
    (10008, 'Elif Community Hoodie', 'Unisex hoodie with soft fleece lining and embroidered community badge.', 'Merchandise', 34.00, 77, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80', 1, '2026-03-10 10:45:00', '2026-03-18 09:05:00');

INSERT INTO order_tb
    (id, user_id, status, payment_method, total_amount, created_at, updated_at)
VALUES
    (11001, 1005, 'DELIVERED', 'ONLINE', 123.90, '2026-03-20 11:10:00', '2026-03-23 09:40:00'),
    (11002, 1006, 'SHIPPED', 'CASH', 89.00, '2026-03-22 14:00:00', '2026-03-24 16:20:00'),
    (11003, 1009, 'CONFIRMED', 'ONLINE', 63.50, '2026-03-24 09:20:00', '2026-03-24 10:10:00'),
    (11004, 1012, 'PENDING', 'CASH', 95.00, '2026-03-25 18:05:00', '2026-03-25 18:05:00');

INSERT INTO order_item
    (id, order_id, product_id, product_name, quantity, unit_price, subtotal)
VALUES
    (12001, 11001, 10001, 'Premium Salmon Kibble 3kg', 2, 42.00, 84.00),
    (12002, 11001, 10006, 'No-Pull Harness Set', 1, 39.90, 39.90),
    (12003, 11002, 10003, 'Complete First Aid Pet Kit', 1, 55.00, 55.00),
    (12004, 11002, 10008, 'Elif Community Hoodie', 1, 34.00, 34.00),
    (12005, 11003, 10002, 'Sensitive Digestion Cat Formula 2kg', 1, 27.50, 27.50),
    (12006, 11003, 10004, 'Probiotic Digestive Chews', 2, 18.00, 36.00),
    (12007, 11004, 10005, 'Adjustable Travel Crate M', 1, 95.00, 95.00);

COMMIT;

SET FOREIGN_KEY_CHECKS
= 1;
