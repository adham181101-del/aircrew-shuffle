-- NUCLEAR RLS CLEANUP - Complete Reset of All RLS Policies
-- This script will completely disable RLS and recreate everything from scratch

-- 1. First, let's see the current mess
SELECT '=== CURRENT RLS STATUS ===' as info;

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

-- 2. Show ALL existing policies
SELECT '=== ALL EXISTING POLICIES ===' as info;

SELECT 
  p.schemaname,
  p.tablename,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd,
  p.qual
FROM pg_policies p
WHERE p.schemaname = 'public' 
AND p.tablename IN ('staff', 'swap_requests', 'shifts', 'companies')
ORDER BY p.tablename, p.policyname;

-- 3. COMPLETELY DISABLE RLS ON ALL TABLES
SELECT '=== DISABLING RLS ON ALL TABLES ===' as info;

ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- 4. DROP ALL EXISTING POLICIES (even if they don't exist, this is safe)
SELECT '=== DROPPING ALL POLICIES ===' as info;

-- Staff table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff at same base location" ON public.staff;
DROP POLICY IF EXISTS "Users can view all staff for team features" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff for team features" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff at same base" ON public.staff;
DROP POLICY IF EXISTS "Users can view all staff" ON public.staff;
DROP POLICY IF EXISTS "Users can view their own staff profile" ON public.staff;
DROP POLICY IF EXISTS "Users can update their own staff profile" ON public.staff;
DROP POLICY IF EXISTS "Users can insert their own staff profile" ON public.staff;
DROP POLICY IF EXISTS "Users can delete their own staff profile" ON public.staff;
DROP POLICY IF EXISTS "staff_select_policy" ON public.staff;
DROP POLICY IF EXISTS "staff_insert_policy" ON public.staff;
DROP POLICY IF EXISTS "staff_update_policy" ON public.staff;
DROP POLICY IF EXISTS "staff_delete_policy" ON public.staff;

-- Shifts table policies
DROP POLICY IF EXISTS "Users can view their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can view shifts at same base" ON public.shifts;
DROP POLICY IF EXISTS "Users can update their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can insert their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can delete own shifts" ON public.shifts;
DROP POLICY IF EXISTS "shifts_select_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_insert_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_update_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_delete_policy" ON public.shifts;

-- Swap requests table policies
DROP POLICY IF EXISTS "Users can view swap requests at same base" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view all swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view swap requests for team" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view related swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view requests they created or that involve them" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can create swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can update related swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can delete own swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "swap_requests_select_policy" ON public.swap_requests;
DROP POLICY IF EXISTS "swap_requests_insert_policy" ON public.swap_requests;
DROP POLICY IF EXISTS "swap_requests_update_policy" ON public.swap_requests;
DROP POLICY IF EXISTS "swap_requests_delete_policy" ON public.swap_requests;

-- Companies table policies
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;

-- 5. RE-ENABLE RLS
SELECT '=== RE-ENABLING RLS ===' as info;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 6. CREATE SIMPLE, EFFICIENT POLICIES
SELECT '=== CREATING SIMPLE POLICIES ===' as info;

-- Companies: Allow all authenticated users to read
CREATE POLICY "companies_select" ON public.companies
FOR SELECT USING (auth.role() = 'authenticated');

-- Staff: Simple policy for viewing
CREATE POLICY "staff_select" ON public.staff
FOR SELECT USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = auth.uid() 
    AND s.base_location = public.staff.base_location
  )
);

-- Staff: Allow users to manage their own profile
CREATE POLICY "staff_manage_own" ON public.staff
FOR ALL USING (auth.uid() = id);

-- Shifts: Simple policy for viewing
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

-- Shifts: Allow users to manage their own shifts
CREATE POLICY "shifts_manage_own" ON public.shifts
FOR ALL USING (auth.uid() = staff_id);

-- Swap requests: Simple policy for viewing
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

-- Swap requests: Allow users to manage their own requests
CREATE POLICY "swap_requests_manage_own" ON public.swap_requests
FOR ALL USING (auth.uid() = requester_id OR auth.uid() = accepter_id);

-- 7. Create the missing functions
SELECT '=== CREATING FUNCTIONS ===' as info;

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_all_staff_for_team();
DROP FUNCTION IF EXISTS public.get_eligible_staff_for_swap(text, date, uuid);

-- Create get_all_staff_for_team function
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

-- Create get_eligible_staff_for_swap function
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

-- 8. Grant permissions
SELECT '=== GRANTING PERMISSIONS ===' as info;

GRANT EXECUTE ON FUNCTION public.get_all_staff_for_team() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_eligible_staff_for_swap(text, date, uuid) TO authenticated;

-- 9. Create indexes
SELECT '=== CREATING INDEXES ===' as info;

CREATE INDEX IF NOT EXISTS idx_staff_base_location ON public.staff(base_location);
CREATE INDEX IF NOT EXISTS idx_shifts_date_staff ON public.shifts(date, staff_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester_id ON public.swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_accepter_id ON public.swap_requests(accepter_id);

-- 10. Verify final state
SELECT '=== FINAL VERIFICATION ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('staff', 'swap_requests', 'shifts', 'companies')
ORDER BY tablename, policyname;

-- 11. Test basic access
SELECT '=== TESTING BASIC ACCESS ===' as info;

-- Test staff count
SELECT COUNT(*) as total_staff FROM public.staff;

-- Test shifts count
SELECT COUNT(*) as total_shifts FROM public.shifts;

-- Test swap requests count
SELECT COUNT(*) as total_swap_requests FROM public.swap_requests;

-- 12. Summary
SELECT '=== NUCLEAR CLEANUP COMPLETE ===' as info;
SELECT 
  'All RLS policies completely reset' as action,
  'Simple, efficient policies created' as policies,
  'Database functions recreated' as functions,
  'Ready for testing' as status;
