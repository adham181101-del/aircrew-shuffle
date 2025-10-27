-- RLS Phase A: Final migration that handles existing policies
-- This migration safely applies RLS improvements without conflicts

-- 1. Enable RLS on all tables (safe to run multiple times)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "companies_select_authenticated" ON public.companies;
DROP POLICY IF EXISTS "companies_all_operations" ON public.companies;
DROP POLICY IF EXISTS "staff_select_authenticated" ON public.staff;
DROP POLICY IF EXISTS "staff_insert_authenticated" ON public.staff;
DROP POLICY IF EXISTS "staff_update_authenticated" ON public.staff;
DROP POLICY IF EXISTS "staff_all_operations" ON public.staff;
DROP POLICY IF EXISTS "shifts_select_authenticated" ON public.shifts;
DROP POLICY IF EXISTS "shifts_insert_authenticated" ON public.shifts;
DROP POLICY IF EXISTS "shifts_update_authenticated" ON public.shifts;
DROP POLICY IF EXISTS "shifts_delete_authenticated" ON public.shifts;
DROP POLICY IF EXISTS "shifts_all_operations" ON public.shifts;
DROP POLICY IF EXISTS "swap_requests_select_authenticated" ON public.swap_requests;
DROP POLICY IF EXISTS "swap_requests_insert_authenticated" ON public.swap_requests;
DROP POLICY IF EXISTS "swap_requests_update_authenticated" ON public.swap_requests;
DROP POLICY IF EXISTS "swap_requests_delete_authenticated" ON public.swap_requests;
DROP POLICY IF EXISTS "swap_requests_all_operations" ON public.swap_requests;
DROP POLICY IF EXISTS "subscriptions_select_authenticated" ON public.subscriptions;
DROP POLICY IF EXISTS "Service can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service can delete subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_all_operations" ON public.subscriptions;

-- 3. Create Phase A policies (non-breaking, still permissive but authenticated only)

-- Companies - allow authenticated users to view
CREATE POLICY "companies_select_authenticated" ON public.companies
  FOR SELECT TO authenticated USING (true);

-- Staff - allow authenticated users to view and manage
CREATE POLICY "staff_select_authenticated" ON public.staff
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_authenticated" ON public.staff
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff_update_authenticated" ON public.staff
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Shifts - allow authenticated users to view and manage
CREATE POLICY "shifts_select_authenticated" ON public.shifts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts_insert_authenticated" ON public.shifts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shifts_update_authenticated" ON public.shifts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shifts_delete_authenticated" ON public.shifts
  FOR DELETE TO authenticated USING (true);

-- Swap requests - allow authenticated users to view and manage
CREATE POLICY "swap_requests_select_authenticated" ON public.swap_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "swap_requests_insert_authenticated" ON public.swap_requests
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "swap_requests_update_authenticated" ON public.swap_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "swap_requests_delete_authenticated" ON public.swap_requests
  FOR DELETE TO authenticated USING (true);

-- Subscriptions - allow authenticated users to view
CREATE POLICY "subscriptions_select_authenticated" ON public.subscriptions
  FOR SELECT TO authenticated USING (true);

-- Service role policies for system operations (Stripe webhooks, etc.)
CREATE POLICY "Service can insert subscriptions" ON public.subscriptions
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service can update subscriptions" ON public.subscriptions
  FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service can delete subscriptions" ON public.subscriptions
  FOR DELETE TO service_role
  USING (true);

-- 4. Create indexes for performance (using actual column names from your schema)
CREATE INDEX IF NOT EXISTS idx_staff_id ON public.staff(id);
CREATE INDEX IF NOT EXISTS idx_staff_company_id ON public.staff(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON public.shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON public.shifts(date);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester_id ON public.swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_accepter_id ON public.swap_requests(accepter_id);

-- Success message
SELECT 'RLS Phase A migration completed successfully!' as status;

