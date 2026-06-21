-- ROLLBACK 035_dual_identifier_system.sql
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_must_have_identifier;
ALTER TABLE contacts ALTER COLUMN phone SET NOT NULL;
ALTER TABLE contacts DROP COLUMN IF EXISTS primary_channel;
ALTER TABLE contacts DROP COLUMN IF EXISTS data_completeness_score;
DROP INDEX IF EXISTS idx_contacts_account_email;
DROP INDEX IF EXISTS idx_contacts_primary_channel;
DROP INDEX IF EXISTS idx_contacts_completeness;
DROP TRIGGER IF EXISTS trg_contact_completeness ON contacts;
DROP FUNCTION IF EXISTS compute_contact_completeness();
DROP TYPE IF EXISTS contact_primary_channel;

-- ROLLBACK 036_multi_branch_support.sql
ALTER TABLE contacts DROP COLUMN IF EXISTS branch_id;
ALTER TABLE deals DROP COLUMN IF EXISTS branch_id;
ALTER TABLE purchase_history DROP COLUMN IF EXISTS branch_id;
ALTER TABLE broadcasts DROP COLUMN IF EXISTS branch_id;
DROP FUNCTION IF EXISTS get_branch_metrics(UUID, UUID);
DROP TABLE IF EXISTS branches;

-- ROLLBACK 037_broadcast_channel_routing.sql
ALTER TABLE broadcasts DROP COLUMN IF EXISTS channel;
ALTER TABLE broadcasts DROP COLUMN IF EXISTS email_subject;
ALTER TABLE broadcasts DROP COLUMN IF EXISTS email_html_body;
ALTER TABLE broadcasts DROP COLUMN IF EXISTS email_text_body;
ALTER TABLE broadcasts DROP COLUMN IF EXISTS whatsapp_sent_count;
ALTER TABLE broadcasts DROP COLUMN IF EXISTS email_sent_count;
ALTER TABLE broadcasts DROP COLUMN IF EXISTS sms_sent_count;
ALTER TABLE broadcasts DROP COLUMN IF EXISTS skipped_count;
ALTER TABLE broadcast_recipients DROP COLUMN IF EXISTS channel;
ALTER TABLE broadcast_recipients DROP COLUMN IF EXISTS email_message_id;
ALTER TABLE broadcast_recipients DROP COLUMN IF EXISTS sms_message_id;
DROP TYPE IF EXISTS broadcast_channel;
