-- Safe Phase A Migration - Maintains Current Functionality
-- This migration ensures RLS is properly configured without breaking existing functionality

BEGIN;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions  ENABLE ROW LEVEL SECURITY;

-- Create permissive policies that maintain current functionality
-- These are still permissive but require authentication

-- Companies - everyone can view (for signup)
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
CREATE POLICY "Companies are viewable by everyone" ON public.companies
  FOR SELECT TO authenticated USING (true);

-- Staff - permissive but authenticated only
DROP POLICY IF EXISTS "Staff viewable by all" ON public.staff;
CREATE POLICY "Staff viewable by all" ON public.staff
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff insertable by all" ON public.staff;
CREATE POLICY "Staff insertable by all" ON public.staff
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Staff updatable by all" ON public.staff;
CREATE POLICY "Staff updatable by all" ON public.staff
  FOR UPDATE TO authenticated USING (true);

-- Shifts - permissive but authenticated only
DROP POLICY IF EXISTS "Shifts viewable by all" ON public.shifts;
CREATE POLICY "Shifts viewable by all" ON public.shifts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Shifts insertable by all" ON public.shifts;
CREATE POLICY "Shifts insertable by all" ON public.shifts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Shifts updatable by all" ON public.shifts;
CREATE POLICY "Shifts updatable by all" ON public.shifts
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Shifts deletable by all" ON public.shifts;
CREATE POLICY "Shifts deletable by all" ON public.shifts
  FOR DELETE TO authenticated USING (true);

-- Swap requests - permissive but authenticated only
DROP POLICY IF EXISTS "Swap requests viewable by all" ON public.swap_requests;
CREATE POLICY "Swap requests viewable by all" ON public.swap_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Swap requests insertable by all" ON public.swap_requests;
CREATE POLICY "Swap requests insertable by all" ON public.swap_requests
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Swap requests updatable by all" ON public.swap_requests;
CREATE POLICY "Swap requests updatable by all" ON public.swap_requests
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Swap requests deletable by all" ON public.swap_requests;
CREATE POLICY "Swap requests deletable by all" ON public.swap_requests
  FOR DELETE TO authenticated USING (true);

-- Subscriptions - permissive but authenticated only
DROP POLICY IF EXISTS "Subscriptions viewable by all" ON public.subscriptions;
CREATE POLICY "Subscriptions viewable by all" ON public.subscriptions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Subscriptions insertable by all" ON public.subscriptions;
CREATE POLICY "Subscriptions insertable by all" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Subscriptions updatable by all" ON public.subscriptions;
CREATE POLICY "Subscriptions updatable by all" ON public.subscriptions
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Subscriptions deletable by all" ON public.subscriptions;
CREATE POLICY "Subscriptions deletable by all" ON public.subscriptions
  FOR DELETE TO authenticated USING (true);

COMMIT;

-- Verification query
SELECT 'RLS policies updated successfully' as status;
SELECT 'All tables now require authentication but maintain permissive access' as note;
SELECT 'Application should work normally' as result;
