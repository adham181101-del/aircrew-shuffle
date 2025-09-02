-- COMPLETE RLS RESET - Nuclear Option
-- This script will completely disable RLS, clear everything, and recreate from scratch

-- 1. COMPLETELY DISABLE RLS ON ALL TABLES
SELECT '=== DISABLING RLS ON ALL TABLES ===' as info;

ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES (this will clear everything)
SELECT '=== DROPPING ALL POLICIES ===' as info;

-- Drop ALL policies from staff table
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
DROP POLICY IF EXISTS "staff_select" ON public.staff;
DROP POLICY IF EXISTS "staff_manage_own" ON public.staff;

-- Drop ALL policies from shifts table
DROP POLICY IF EXISTS "Users can view their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can view shifts at same base" ON public.shifts;
DROP POLICY IF EXISTS "Users can update their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can insert their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can delete own shifts" ON public.shifts;
DROP POLICY IF EXISTS "shifts_select_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_insert_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_update_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_delete_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_select" ON public.shifts;
DROP POLICY IF EXISTS "shifts_manage_own" ON public.shifts;

-- Drop ALL policies from swap_requests table
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
DROP POLICY IF EXISTS "swap_requests_select" ON public.swap_requests;
DROP POLICY IF EXISTS "swap_requests_manage_own" ON public.swap_requests;

-- Drop ALL policies from companies table
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;
DROP POLICY IF EXISTS "companies_select" ON public.companies;

-- 3. Verify all policies are gone
SELECT '=== VERIFYING ALL POLICIES ARE GONE ===' as info;

SELECT COUNT(*) as remaining_policies 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('staff', 'swap_requests', 'shifts', 'companies');

-- 4. RE-ENABLE RLS
SELECT '=== RE-ENABLING RLS ===' as info;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 5. CREATE EXACTLY ONE POLICY PER ACTION PER TABLE
SELECT '=== CREATING SINGLE POLICIES ===' as info;

-- Companies: Single SELECT policy
CREATE POLICY "companies_select" ON public.companies
FOR SELECT USING (auth.role() = 'authenticated');

-- Staff: Single policies for each action
CREATE POLICY "staff_select" ON public.staff
FOR SELECT USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = auth.uid() 
    AND s.base_location = public.staff.base_location
  )
);

CREATE POLICY "staff_insert" ON public.staff
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "staff_update" ON public.staff
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "staff_delete" ON public.staff
FOR DELETE USING (auth.uid() = id);

-- Shifts: Single policies for each action
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

CREATE POLICY "shifts_insert" ON public.shifts
FOR INSERT WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "shifts_update" ON public.shifts
FOR UPDATE USING (auth.uid() = staff_id);

CREATE POLICY "shifts_delete" ON public.shifts
FOR DELETE USING (auth.uid() = staff_id);

-- Swap requests: Single policies for each action
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

CREATE POLICY "swap_requests_insert" ON public.swap_requests
FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "swap_requests_update" ON public.swap_requests
FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = accepter_id);

CREATE POLICY "swap_requests_delete" ON public.swap_requests
FOR DELETE USING (auth.uid() = requester_id);

-- 6. Create the database functions with proper search_path
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

-- 7. Grant permissions
SELECT '=== GRANTING PERMISSIONS ===' as info;

GRANT EXECUTE ON FUNCTION public.get_all_staff_for_team() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_eligible_staff_for_swap(text, date, uuid) TO authenticated;

-- 8. Create indexes
SELECT '=== CREATING INDEXES ===' as info;

CREATE INDEX IF NOT EXISTS idx_staff_base_location ON public.staff(base_location);
CREATE INDEX IF NOT EXISTS idx_staff_company_id ON public.staff(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date_staff ON public.shifts(date, staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON public.shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester_id ON public.swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_accepter_id ON public.swap_requests(accepter_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON public.swap_requests(status);

-- 9. Final verification
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

-- 10. Test data access
SELECT '=== TESTING DATA ACCESS ===' as info;

SELECT COUNT(*) as total_staff FROM public.staff;
SELECT COUNT(*) as total_shifts FROM public.shifts;
SELECT COUNT(*) as total_swap_requests FROM public.swap_requests;
SELECT COUNT(*) as total_companies FROM public.companies;

-- 11. Summary
SELECT '=== COMPLETE RLS RESET FINISHED ===' as info;
SELECT 
  'All old policies completely removed' as action,
  'Exactly one policy per action per table' as policies,
  'Functions created with proper search_path' as functions,
  'Ready for testing' as status;
