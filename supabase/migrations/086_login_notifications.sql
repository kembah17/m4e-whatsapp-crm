-- Add login_notifications preference to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_notifications BOOLEAN NOT NULL DEFAULT false;
