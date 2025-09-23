-- Rollback to Open RLS Policies
-- Use this if you need to restore the previous permissive state

BEGIN;

-- Remove all existing policies
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
DROP POLICY IF EXISTS "Staff viewable by all" ON public.staff;
DROP POLICY IF EXISTS "Staff insertable by all" ON public.staff;
DROP POLICY IF EXISTS "Staff updatable by all" ON public.staff;
DROP POLICY IF EXISTS "Shifts viewable by all" ON public.shifts;
DROP POLICY IF EXISTS "Shifts insertable by all" ON public.shifts;
DROP POLICY IF EXISTS "Shifts updatable by all" ON public.shifts;
DROP POLICY IF EXISTS "Shifts deletable by all" ON public.shifts;
DROP POLICY IF EXISTS "Swap requests viewable by all" ON public.swap_requests;
DROP POLICY IF EXISTS "Swap requests insertable by all" ON public.swap_requests;
DROP POLICY IF EXISTS "Swap requests updatable by all" ON public.swap_requests;
DROP POLICY IF EXISTS "Swap requests deletable by all" ON public.swap_requests;
DROP POLICY IF EXISTS "Subscriptions viewable by all" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions insertable by all" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions updatable by all" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions deletable by all" ON public.subscriptions;

-- Recreate the original open policies
CREATE POLICY "Companies are viewable by everyone" ON public.companies
  FOR SELECT USING (true);

CREATE POLICY "Staff viewable by all" ON public.staff
  FOR SELECT USING (true);

CREATE POLICY "Staff insertable by all" ON public.staff
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff updatable by all" ON public.staff
  FOR UPDATE USING (true);

CREATE POLICY "Shifts viewable by all" ON public.shifts
  FOR SELECT USING (true);

CREATE POLICY "Shifts insertable by all" ON public.shifts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Shifts updatable by all" ON public.shifts
  FOR UPDATE USING (true);

CREATE POLICY "Shifts deletable by all" ON public.shifts
  FOR DELETE USING (true);

CREATE POLICY "Swap requests viewable by all" ON public.swap_requests
  FOR SELECT USING (true);

CREATE POLICY "Swap requests insertable by all" ON public.swap_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Swap requests updatable by all" ON public.swap_requests
  FOR UPDATE USING (true);

CREATE POLICY "Swap requests deletable by all" ON public.swap_requests
  FOR DELETE USING (true);

CREATE POLICY "Subscriptions viewable by all" ON public.subscriptions
  FOR SELECT USING (true);

CREATE POLICY "Subscriptions insertable by all" ON public.subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Subscriptions updatable by all" ON public.subscriptions
  FOR UPDATE USING (true);

CREATE POLICY "Subscriptions deletable by all" ON public.subscriptions
  FOR DELETE USING (true);

COMMIT;

SELECT 'Rollback completed - RLS policies restored to open state' as status;
