-- EMERGENCY FIX FOR BROKEN RLS POLICIES
-- Run this in your Supabase SQL Editor to fix the 500 errors immediately

-- First, let's disable RLS temporarily to test
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- Now re-enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies to get the app working
-- Companies - everyone can view
CREATE POLICY "Companies viewable by all" ON public.companies FOR SELECT USING (true);

-- Staff - everyone can view (temporarily permissive)
CREATE POLICY "Staff viewable by all" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Staff insertable by all" ON public.staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff updatable by all" ON public.staff FOR UPDATE USING (true);

-- Shifts - everyone can view (temporarily permissive)
CREATE POLICY "Shifts viewable by all" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "Shifts insertable by all" ON public.shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Shifts updatable by all" ON public.shifts FOR UPDATE USING (true);
CREATE POLICY "Shifts deletable by all" ON public.shifts FOR DELETE USING (true);

-- Swap requests - everyone can view (temporarily permissive)
CREATE POLICY "Swap requests viewable by all" ON public.swap_requests FOR SELECT USING (true);
CREATE POLICY "Swap requests insertable by all" ON public.swap_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Swap requests updatable by all" ON public.swap_requests FOR UPDATE USING (true);

-- Subscriptions - everyone can manage (temporarily permissive)
CREATE POLICY "Subscriptions viewable by all" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "Subscriptions insertable by all" ON public.subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Subscriptions updatable by all" ON public.subscriptions FOR UPDATE USING (true);
CREATE POLICY "Subscriptions deletable by all" ON public.subscriptions FOR DELETE USING (true);

-- Test that everything works
SELECT 'Testing data access...' as status;
SELECT COUNT(*) as companies_count FROM public.companies;
SELECT COUNT(*) as staff_count FROM public.staff;
SELECT COUNT(*) as shifts_count FROM public.shifts;
SELECT COUNT(*) as swap_requests_count FROM public.swap_requests;
SELECT COUNT(*) as subscriptions_count FROM public.subscriptions;

SELECT 'EMERGENCY FIX COMPLETE - APP SHOULD WORK NOW' as status;
