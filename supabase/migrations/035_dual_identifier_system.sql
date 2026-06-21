-- ============================================================
-- 035_dual_identifier_system.sql
--
-- Transforms the CRM from phone-required to dual-identifier
-- (phone OR email). Adds channel routing fields and data
-- completeness scoring.
--
-- Idempotent. No data loss.
-- ============================================================

-- 1) Create the primary_channel enum
DO $$ BEGIN
  CREATE TYPE contact_primary_channel AS ENUM ('whatsapp', 'email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Add new columns to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS primary_channel contact_primary_channel
    DEFAULT 'whatsapp';

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS data_completeness_score SMALLINT
    DEFAULT 0;

-- 3) Make phone nullable
-- Step 3a: Drop the NOT NULL constraint on phone
ALTER TABLE contacts
  ALTER COLUMN phone DROP NOT NULL;

-- Step 3b: Add CHECK constraint — must have phone OR email
ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_must_have_identifier;
ALTER TABLE contacts
  ADD CONSTRAINT contacts_must_have_identifier
  CHECK (phone IS NOT NULL OR email IS NOT NULL);

-- 4) Add unique index on (account_id, email) for email dedup
-- Partial index: only where email is not null and not empty
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_account_email
  ON contacts (account_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

-- 5) Compute data_completeness_score for all existing contacts
-- Score breakdown:
--   phone present:   +30
--   email present:   +25
--   name present:    +20
--   company present: +15
--   has tags:        +5
--   has deals:       +5
UPDATE contacts SET data_completeness_score = (
  CASE WHEN phone IS NOT NULL AND phone !~ '^EMAIL-' THEN 30 ELSE 0 END +
  CASE WHEN email IS NOT NULL AND email <> '' THEN 25 ELSE 0 END +
  CASE WHEN name IS NOT NULL AND name <> '' THEN 20 ELSE 0 END +
  CASE WHEN company IS NOT NULL AND company <> '' THEN 15 ELSE 0 END +
  CASE WHEN EXISTS (
    SELECT 1 FROM contact_tags ct WHERE ct.contact_id = contacts.id
  ) THEN 5 ELSE 0 END +
  CASE WHEN EXISTS (
    SELECT 1 FROM deals d WHERE d.contact_id = contacts.id
  ) THEN 5 ELSE 0 END
);

-- 6) Set primary_channel based on existing data
UPDATE contacts SET primary_channel = CASE
  WHEN phone IS NOT NULL AND phone !~ '^EMAIL-' THEN 'whatsapp'::contact_primary_channel
  WHEN email IS NOT NULL AND email <> '' THEN 'email'::contact_primary_channel
  ELSE 'whatsapp'::contact_primary_channel
END;

-- 7) Function to auto-compute data_completeness_score on insert/update
CREATE OR REPLACE FUNCTION compute_contact_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.data_completeness_score := (
    CASE WHEN NEW.phone IS NOT NULL AND NEW.phone !~ '^EMAIL-' THEN 30 ELSE 0 END +
    CASE WHEN NEW.email IS NOT NULL AND NEW.email <> '' THEN 25 ELSE 0 END +
    CASE WHEN NEW.name IS NOT NULL AND NEW.name <> '' THEN 20 ELSE 0 END +
    CASE WHEN NEW.company IS NOT NULL AND NEW.company <> '' THEN 15 ELSE 0 END
  );
  -- Tag and deal bonuses computed separately (cross-table)
  -- Updated by a periodic job or on-demand
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_completeness ON contacts;
CREATE TRIGGER trg_contact_completeness
  BEFORE INSERT OR UPDATE OF phone, email, name, company
  ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION compute_contact_completeness();

-- 8) Index for channel-based queries
CREATE INDEX IF NOT EXISTS idx_contacts_primary_channel
  ON contacts (account_id, primary_channel);

-- 9) Index for data completeness dashboard
CREATE INDEX IF NOT EXISTS idx_contacts_completeness
  ON contacts (account_id, data_completeness_score);
