-- ============================================================
-- 080_product_media.sql
--
-- Adds the `product-media` Supabase Storage bucket for product
-- images uploaded via the product form's drag-and-drop uploader.
--
-- Mirrors the `chat-media` bucket (migration 023) with the same
-- account-scoped path convention:
--   product-media/account-<account_id>/<timestamp>-<basename>.<ext>
--
-- The bucket is public so product images can be displayed on the
-- ecommerce storefront and in WhatsApp catalog messages without
-- auth. Writes are scoped to account members via the path's first
-- segment.
--
-- Size limit 5 MB — product images don't need the 16 MB video cap.
-- Only image MIME types are allowed.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 1. product-media storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media',
  'product-media',
  TRUE,
  5242880, -- 5 MB (sufficient for product photos)
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 2. Storage RLS — account-scoped writes, public reads
-- ============================================================
DROP POLICY IF EXISTS "Product media is publicly readable" ON storage.objects;
CREATE POLICY "Product media is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-media');

DROP POLICY IF EXISTS "Members can upload product media" ON storage.objects;
CREATE POLICY "Members can upload product media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Members can update product media" ON storage.objects;
CREATE POLICY "Members can update product media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Members can delete product media" ON storage.objects;
CREATE POLICY "Members can delete product media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );
