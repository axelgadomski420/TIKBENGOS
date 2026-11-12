ALTER TABLE marketplace_reclamation
    MODIFY COLUMN image LONGBLOB NULL;

-- PostgreSQL equivalent:
-- ALTER TABLE marketplace_reclamation ADD COLUMN image BYTEA;