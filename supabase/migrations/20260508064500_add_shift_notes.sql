-- Run on production if notes fail with "column not found" (also in scripts/enable-shift-notes.sql)
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS note TEXT;

NOTIFY pgrst, 'reload schema';
