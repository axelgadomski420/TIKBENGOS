-- Elif user demo seed data
-- Import before module seeds that depend on users (community, adoption, marketplace, transit).
--
-- Demo credentials
--   admin1@elif.com / password
--   admin2@elif.com / password
--   vet1@elif.com / password
--   provider1@elif.com / password
--   user1@elif.com / password
--   user2@elif.com / password
--   user3@elif.com / password
--   user4@elif.com / password
--   user5@elif.com / password
--   user6@elif.com / password
--   user7@elif.com / password
--   user8@elif.com / password
--   user9@elif.com / password
--   user10@elif.com / password
--   user11@elif.com / password
--   shelter.approved@elif.com / password
--   shelter.pending@elif.com / password

START
TRANSACTION;

SET FOREIGN_KEY_CHECKS
= 0;

DELETE FROM `user` WHERE id BETWEEN 1001 AND 1017;

SET FOREIGN_KEY_CHECKS
= 1;

INSERT INTO `user`
    (
    id, first_name, last_name, email, password_hash, role, verified, created_at, last_login
    )
VALUES
    (1001, 'Admin', 'One', 'admin1@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'ADMIN', 1, '2026-03-01 09:00:00', '2026-03-18 08:10:00'),
    (1002, 'Admin', 'Two', 'admin2@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'ADMIN', 1, '2026-03-01 09:05:00', '2026-03-18 08:20:00'),
    (1003, 'Nour', 'Vet', 'vet1@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'VET', 1, '2026-03-02 10:00:00', '2026-03-17 18:15:00'),
    (1004, 'Sami', 'Provider', 'provider1@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'SERVICE_PROVIDER', 1, '2026-03-02 10:30:00', '2026-03-17 11:45:00'),
    (1005, 'Lina', 'Peterson', 'user1@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 08:00:00', '2026-03-18 07:55:00'),
    (1006, 'Youssef', 'Haddad', 'user2@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 08:10:00', '2026-03-17 21:00:00'),
    (1007, 'Meriem', 'Trabelsi', 'user3@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 08:20:00', '2026-03-18 09:05:00'),
    (1008, 'Omar', 'Ben Ali', 'user4@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 08:30:00', '2026-03-16 19:22:00'),
    (1009, 'Sara', 'Mansour', 'user5@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 08:40:00', '2026-03-18 06:40:00'),
    (1010, 'Karim', 'Jaziri', 'user6@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 08:50:00', '2026-03-17 22:10:00'),
    (1011, 'Hiba', 'Khelifi', 'user7@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 09:00:00', '2026-03-18 07:12:00'),
    (1012, 'Walid', 'Gharbi', 'user8@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 09:10:00', '2026-03-17 20:48:00'),
    (1013, 'Aya', 'Ksouri', 'user9@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 09:20:00', '2026-03-18 08:52:00'),
    (1014, 'Rami', 'Brahmi', 'user10@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 09:30:00', '2026-03-17 23:02:00'),
    (1015, 'Nadine', 'Ferjani', 'user11@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'USER', 1, '2026-03-03 09:40:00', '2026-03-18 05:58:00'),
    (1016, 'Harbor', 'Shelter', 'shelter.approved@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'SHELTER', 1, '2026-03-03 09:50:00', '2026-03-18 09:10:00'),
    (1017, 'Olive', 'Shelter', 'shelter.pending@elif.com', '$2y$10$317oVyzQHXK9Yjl0CWsh3u.hiJy/YV.vI1skpp2ChfI0BNbmUvx9G', 'SHELTER', 0, '2026-03-03 09:55:00', '2026-03-17 19:55:00');

COMMIT;

SET FOREIGN_KEY_CHECKS
= 1;
