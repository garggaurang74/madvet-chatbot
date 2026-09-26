-- ─────────────────────────────────────────────────────────────────
-- Make the public (anon) key READ-ONLY on products.
--
-- Run in Supabase > SQL Editor, ONCE, and only AFTER the version of the
-- site that writes through /api (service-role key) is live on Vercel.
-- Run it earlier and /admin stops saving.
--
-- Before this, anyone could copy the anon key out of any page and edit or
-- delete products straight through Supabase's REST API.
-- Chat history and feedback tables are untouched: visitors still write those.
-- ─────────────────────────────────────────────────────────────────

-- 1. Products: public may read, nobody but the server may write.
ALTER TABLE public.products_enriched ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'products_enriched'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.products_enriched', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "public can read products"
  ON public.products_enriched FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Product photos: stay publicly viewable, but only the server uploads.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'storage' AND tablename = 'objects'
             AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
             AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%product-images%'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- 3. Check: this should list exactly one policy, "public can read products".
SELECT tablename, policyname, cmd, roles FROM pg_policies
WHERE tablename = 'products_enriched';
