-- FINAL CLEAN SETUP - Complete RLS and Function Setup
-- This script creates exactly one policy per action per table

-- 1. Verify RLS is enabled and no policies exist
SELECT '=== VERIFYING CLEAN STATE ===' as info;

SELECT 
  t.schemaname,
  t.tablename,
  t.rowsecurity,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
AND t.tablename IN ('staff', 'swap_requests', 'shifts', 'companies')
GROUP BY t.schemaname, t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- 2. Create clean, single policies for each table
SELECT '=== CREATING CLEAN POLICIES ===' as info;

-- Companies table - single policy for SELECT
CREATE POLICY "companies_select" ON public.companies
FOR SELECT USING (auth.role() = 'authenticated');

-- Staff table - single policies for each action
CREATE POLICY "staff_select" ON public.staff
FOR SELECT USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = auth.uid() 
    AND s.base_location = public.staff.base_location
  )
);

CREATE POLICY "staff_manage_own" ON public.staff
FOR ALL USING (auth.uid() = id);

-- Shifts table - single policies for each action
CREATE POLICY "shifts_select" ON public.shifts
FOR SELECT USING (
  auth.uid() = staff_id OR 
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = auth.uid() 
    AND s.base_location = (
      SELECT base_location FROM public.staff WHERE id = staff_id
    )
  )
);

CREATE POLICY "shifts_manage_own" ON public.shifts
FOR ALL USING (auth.uid() = staff_id);

-- Swap requests table - single policies for each action
CREATE POLICY "swap_requests_select" ON public.swap_requests
FOR SELECT USING (
  auth.uid() = requester_id OR 
  auth.uid() = accepter_id OR
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = auth.uid() 
    AND s.base_location = (
      SELECT base_location FROM public.staff WHERE id = requester_id
    )
  )
);

CREATE POLICY "swap_requests_manage_own" ON public.swap_requests
FOR ALL USING (auth.uid() = requester_id OR auth.uid() = accepter_id);

-- 3. Create the database functions with proper search_path
SELECT '=== CREATING FUNCTIONS ===' as info;

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_all_staff_for_team();
DROP FUNCTION IF EXISTS public.get_eligible_staff_for_swap(text, date, uuid);

-- Create get_all_staff_for_team function with fixed search_path
CREATE OR REPLACE FUNCTION public.get_all_staff_for_team()
RETURNS TABLE (
    id uuid,
    email text,
    staff_number text,
    base_location text,
    can_work_doubles boolean,
    company_id uuid,
    created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Return all staff from the same company as the current user
    RETURN QUERY
    SELECT 
        s.id,
        s.email,
        s.staff_number,
        s.base_location,
        s.can_work_doubles,
        s.company_id,
        s.created_at
    FROM public.staff s
    INNER JOIN public.staff current_staff ON current_staff.id = auth.uid()
    WHERE s.company_id = current_staff.company_id
    ORDER BY s.base_location, s.staff_number;
END;
$$;

-- Create get_eligible_staff_for_swap function with fixed search_path
CREATE OR REPLACE FUNCTION public.get_eligible_staff_for_swap(
    requester_base_location text,
    swap_date date,
    requester_id uuid
)
RETURNS TABLE (
    id uuid,
    email text,
    staff_number text,
    base_location text,
    can_work_doubles boolean,
    company_id uuid,
    created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Return staff who are OFF on the swap date at the same base location
    RETURN QUERY
    SELECT 
        s.id,
        s.email,
        s.staff_number,
        s.base_location,
        s.can_work_doubles,
        s.company_id,
        s.created_at
    FROM public.staff s
    WHERE s.base_location = requester_base_location
    AND s.id != requester_id
    AND NOT EXISTS (
        SELECT 1 FROM public.shifts sh
        WHERE sh.staff_id = s.id
        AND sh.date = swap_date
    )
    ORDER BY s.staff_number;
END;
$$;

-- 4. Grant necessary permissions
SELECT '=== GRANTING PERMISSIONS ===' as info;

GRANT EXECUTE ON FUNCTION public.get_all_staff_for_team() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_eligible_staff_for_swap(text, date, uuid) TO authenticated;

-- 5. Create performance indexes
SELECT '=== CREATING INDEXES ===' as info;

CREATE INDEX IF NOT EXISTS idx_staff_base_location ON public.staff(base_location);
CREATE INDEX IF NOT EXISTS idx_staff_company_id ON public.staff(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date_staff ON public.shifts(date, staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON public.shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester_id ON public.swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_accepter_id ON public.swap_requests(accepter_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON public.swap_requests(status);

-- 6. Verify final state
SELECT '=== FINAL VERIFICATION ===' as info;

SELECT 
  p.schemaname,
  p.tablename,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd
FROM pg_policies p
WHERE p.schemaname = 'public' 
AND p.tablename IN ('staff', 'swap_requests', 'shifts', 'companies')
ORDER BY p.tablename, p.cmd, p.policyname;

-- 7. Test function existence and configuration
SELECT '=== FUNCTION VERIFICATION ===' as info;

SELECT 
  routine_name, 
  routine_type,
  security_type,
  sql_data_access
FROM information_schema.routines 
WHERE routine_name IN ('get_all_staff_for_team', 'get_eligible_staff_for_swap')
ORDER BY routine_name;

-- 8. Test basic data access
SELECT '=== TESTING DATA ACCESS ===' as info;

-- Test staff access
SELECT COUNT(*) as total_staff FROM public.staff;

-- Test shifts access
SELECT COUNT(*) as total_shifts FROM public.shifts;

-- Test swap requests access
SELECT COUNT(*) as total_swap_requests FROM public.swap_requests;

-- Test companies access
SELECT COUNT(*) as total_companies FROM public.companies;

-- 9. Summary
SELECT '=== SETUP COMPLETE ===' as info;
SELECT 
  'All RLS policies created successfully' as action,
  'Database functions created with proper search_path' as functions,
  'Performance indexes created' as indexes,
  'Ready for testing' as status;
