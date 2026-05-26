-- Run once in Supabase Dashboard → SQL Editor (production project for sswap.co.uk)
-- Enables shift notes and fixes "Notes are not enabled on the server yet" errors.

ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS note TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify: SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'shifts' AND column_name = 'note';
