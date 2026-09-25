-- ============================================================
-- 088_whatsapp_config_nullable_credentials.sql
-- Make phone_number_id and access_token nullable so that the
-- admin disconnect route can set them to NULL instead of using
-- placeholder values like 'DISCONNECTED_xxx' or 'REVOKED'.
--
-- Background:
--   The initial schema (001) defined these as NOT NULL, which
--   forced the disconnect route to insert fake placeholder
--   strings. This is semantically wrong — a disconnected config
--   genuinely has no phone_number_id or access_token.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- Allow NULL for phone_number_id (was TEXT NOT NULL)
ALTER TABLE whatsapp_config
  ALTER COLUMN phone_number_id DROP NOT NULL;

-- Allow NULL for access_token (was TEXT NOT NULL)
ALTER TABLE whatsapp_config
  ALTER COLUMN access_token DROP NOT NULL;

-- Clean up any existing placeholder values from previous disconnects
UPDATE whatsapp_config
  SET phone_number_id = NULL
  WHERE phone_number_id LIKE 'DISCONNECTED_%';

UPDATE whatsapp_config
  SET access_token = NULL
  WHERE access_token = 'REVOKED';
