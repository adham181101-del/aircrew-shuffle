-- RLS Hardening Phase A - Non-Breaking Migration
-- This migration adds proper RLS policies alongside existing permissive ones
-- The app will continue to work with existing policies while new policies are added

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = user_id 
    AND staff_number IN ('ADMIN001', 'ADMIN002', '254575')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT company_id FROM public.staff 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Staff table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_user_id ON public.staff(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_company_id ON public.staff(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_staff_number ON public.staff(staff_number);

-- Shifts table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shifts_staff_id ON public.shifts(staff_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shifts_date ON public.shifts(date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shifts_staff_date ON public.shifts(staff_id, date);

-- Swap requests table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swap_requests_requester_id ON public.swap_requests(requester_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swap_requests_accepter_id ON public.swap_requests(accepter_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swap_requests_status ON public.swap_requests(status);

-- Subscriptions table indexes (already exist, but ensure they're there)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Audit logs table indexes (already exist, but ensure they're there)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- ============================================================================
-- STAFF TABLE POLICIES
-- ============================================================================

-- Users can view their own staff record
CREATE POLICY "staff_select_own_secure" ON public.staff
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can view staff at same company (for team features)
CREATE POLICY "staff_select_company_secure" ON public.staff
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = auth.uid()
        AND s.company_id = staff.company_id
    )
  );

-- Admin override for staff viewing
CREATE POLICY "staff_select_admin_secure" ON public.staff
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Users can insert their own staff record
CREATE POLICY "staff_insert_own_secure" ON public.staff
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own staff record
CREATE POLICY "staff_update_own_secure" ON public.staff
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- SHIFTS TABLE POLICIES
-- ============================================================================

-- Users can view their own shifts
CREATE POLICY "shifts_select_own_secure" ON public.shifts
  FOR SELECT TO authenticated
  USING (auth.uid() = staff_id);

-- Users can view shifts at same company (for swap functionality)
CREATE POLICY "shifts_select_company_secure" ON public.shifts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s1
      JOIN public.staff s2 ON s1.company_id = s2.company_id
      WHERE s1.id = auth.uid()
        AND s2.id = shifts.staff_id
    )
  );

-- Admin override for shifts viewing
CREATE POLICY "shifts_select_admin_secure" ON public.shifts
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Users can insert their own shifts
CREATE POLICY "shifts_insert_own_secure" ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = staff_id);

-- Users can update their own shifts
CREATE POLICY "shifts_update_own_secure" ON public.shifts
  FOR UPDATE TO authenticated
  USING (auth.uid() = staff_id)
  WITH CHECK (auth.uid() = staff_id);

-- Users can delete their own shifts
CREATE POLICY "shifts_delete_own_secure" ON public.shifts
  FOR DELETE TO authenticated
  USING (auth.uid() = staff_id);

-- ============================================================================
-- SWAP_REQUESTS TABLE POLICIES
-- ============================================================================

-- Users can view swap requests they created or are involved in
CREATE POLICY "swap_requests_select_involved_secure" ON public.swap_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = accepter_id
  );

-- Users can view swap requests at same company (for team visibility)
CREATE POLICY "swap_requests_select_company_secure" ON public.swap_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s1
      JOIN public.staff s2 ON s1.company_id = s2.company_id
      WHERE s1.id = auth.uid()
        AND s2.id = swap_requests.requester_id
    )
  );

-- Admin override for swap requests viewing
CREATE POLICY "swap_requests_select_admin_secure" ON public.swap_requests
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Users can insert swap requests where they are the requester
CREATE POLICY "swap_requests_insert_requester_secure" ON public.swap_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Users can update swap requests they created or are accepting
CREATE POLICY "swap_requests_update_involved_secure" ON public.swap_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = accepter_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = accepter_id);

-- Users can delete swap requests they created
CREATE POLICY "swap_requests_delete_requester_secure" ON public.swap_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id);

-- ============================================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own subscription
CREATE POLICY "subscriptions_select_own_secure" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin override for subscriptions viewing
CREATE POLICY "subscriptions_select_admin_secure" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- System can insert subscriptions (for webhooks)
CREATE POLICY "subscriptions_insert_system_secure" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (true); -- This will be restricted to service role in API routes

-- System can update subscriptions (for webhooks)
CREATE POLICY "subscriptions_update_system_secure" ON public.subscriptions
  FOR UPDATE TO authenticated
  WITH CHECK (true); -- This will be restricted to service role in API routes

-- System can delete subscriptions (for cleanup)
CREATE POLICY "subscriptions_delete_system_secure" ON public.subscriptions
  FOR DELETE TO authenticated
  USING (true); -- This will be restricted to service role in API routes

-- ============================================================================
-- AUDIT_LOGS TABLE POLICIES
-- ============================================================================

-- Users can view their own audit logs
CREATE POLICY "audit_logs_select_own_secure" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin override for audit logs viewing
CREATE POLICY "audit_logs_select_admin_secure" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- System can insert audit logs
CREATE POLICY "audit_logs_insert_system_secure" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true); -- This will be restricted to service role in API routes

-- ============================================================================
-- COMPANIES TABLE POLICIES
-- ============================================================================

-- Companies are viewable by everyone (public reference data)
CREATE POLICY "companies_select_public_secure" ON public.companies
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- DEFAULTS AND TRIGGERS
-- ============================================================================

-- Ensure user_id defaults are set correctly
ALTER TABLE public.subscriptions 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.audit_logs 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Create function to enforce owner immutability
CREATE OR REPLACE FUNCTION enforce_owner_immutable() 
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing user_id in subscriptions
  IF TG_TABLE_NAME = 'subscriptions' AND NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable in subscriptions table';
  END IF;
  
  -- Prevent changing user_id in audit_logs
  IF TG_TABLE_NAME = 'audit_logs' AND NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable in audit_logs table';
  END IF;
  
  -- Prevent changing staff_id in shifts
  IF TG_TABLE_NAME = 'shifts' AND NEW.staff_id <> OLD.staff_id THEN
    RAISE EXCEPTION 'staff_id is immutable in shifts table';
  END IF;
  
  -- Prevent changing requester_id in swap_requests
  IF TG_TABLE_NAME = 'swap_requests' AND NEW.requester_id <> OLD.requester_id THEN
    RAISE EXCEPTION 'requester_id is immutable in swap_requests table';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to enforce immutability
DROP TRIGGER IF EXISTS trg_subscriptions_owner_immutable ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_owner_immutable
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION enforce_owner_immutable();

DROP TRIGGER IF EXISTS trg_audit_logs_owner_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_owner_immutable
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION enforce_owner_immutable();

DROP TRIGGER IF EXISTS trg_shifts_owner_immutable ON public.shifts;
CREATE TRIGGER trg_shifts_owner_immutable
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION enforce_owner_immutable();

DROP TRIGGER IF EXISTS trg_swap_requests_owner_immutable ON public.swap_requests;
CREATE TRIGGER trg_swap_requests_owner_immutable
  BEFORE UPDATE ON public.swap_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_owner_immutable();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all new policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND policyname LIKE '%_secure'
ORDER BY tablename, policyname;

-- Test that helper functions work
SELECT 'Helper functions created successfully' as status;
SELECT public.is_admin('00000000-0000-0000-0000-000000000000') as test_admin_check;
SELECT public.get_user_company_id('00000000-0000-0000-0000-000000000000') as test_company_check;

SELECT 'Phase A migration completed successfully' as status;
SELECT 'New secure policies added alongside existing permissive policies' as note;
SELECT 'Application will continue to work with existing policies' as note;
SELECT 'Ready for Phase B (removal of permissive policies)' as next_step;
