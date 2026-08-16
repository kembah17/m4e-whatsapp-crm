-- Migration 075: Fix campaign template display data
-- 
-- Problem 1: how_it_works fields contain literal two-char '\n' sequences
--   instead of actual newline characters. Caused by migrations 048/049b
--   storing escaped strings.
--
-- Problem 2: The rate formatting bug (showing "9000%" instead of "88%")
--   was a frontend-only issue fixed in campaigns/page.tsx
--   (Math.round(rate * 100) changed to rate.toFixed(1))
--   Rate data is stored correctly as whole numbers - no data fix needed.
--
-- This migration fixes the stored text data.

-- Replace literal backslash-n with actual newlines in how_it_works
UPDATE campaign_templates
SET how_it_works = REPLACE(how_it_works, E'\\n', E'\n')
WHERE how_it_works LIKE '%' || E'\\n' || '%';

-- Same fix for description field if affected
UPDATE campaign_templates
SET description = REPLACE(description, E'\\n', E'\n')
WHERE description LIKE '%' || E'\\n' || '%';

-- Also handle the pattern: closing-paren + backslash-n + digit (seen in "history).\n4)")
-- This is covered by the REPLACE above since it replaces ALL occurrences

-- Verify: count remaining literal backslash-n (should be 0)
-- SELECT id, name, 
--   (LENGTH(how_it_works) - LENGTH(REPLACE(how_it_works, E'\\n', ''))) / 2 as literal_backslash_n_count
-- FROM campaign_templates
-- WHERE how_it_works LIKE '%' || E'\\n' || '%';
