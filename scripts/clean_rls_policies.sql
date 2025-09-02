-- Comprehensive RLS Policy Cleanup and Recreation
-- This script will remove ALL existing policies and create clean, single policies

-- 1. First, let's see what policies currently exist
SELECT '=== CURRENT POLICIES ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('staff', 'swap_requests', 'shifts')
ORDER BY tablename, policyname;

-- 2. Drop ALL existing policies on staff table
SELECT '=== DROPPING ALL STAFF POLICIES ===' as info;

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

-- 3. Drop ALL existing policies on swap_requests table
SELECT '=== DROPPING ALL SWAP_REQUESTS POLICIES ===' as info;

DROP POLICY IF EXISTS "Users can view swap requests at same base" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view all swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view swap requests for team" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view related swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view requests they created or that involve them" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can create swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can update related swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can delete own swap requests" ON public.swap_requests;

-- 4. Drop ALL existing policies on shifts table
SELECT '=== DROPPING ALL SHIFTS POLICIES ===' as info;

DROP POLICY IF EXISTS "Users can view their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can view shifts at same base" ON public.shifts;
DROP POLICY IF EXISTS "Users can update their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can insert their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can delete own shifts" ON public.shifts;

-- 5. Create clean, single policies for staff table
SELECT '=== CREATING CLEAN STAFF POLICIES ===' as info;

CREATE POLICY "staff_select_policy" ON public.staff
FOR SELECT USING (
  -- Users can always view their own profile
  auth.uid() = id 
  OR 
  -- Users can view other staff at the same base location
  EXISTS (
    SELECT 1 FROM public.staff current_staff
    WHERE current_staff.id = auth.uid() 
    AND current_staff.base_location = public.staff.base_location
  )
);

CREATE POLICY "staff_insert_policy" ON public.staff
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "staff_update_policy" ON public.staff
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "staff_delete_policy" ON public.staff
FOR DELETE USING (auth.uid() = id);

-- 6. Create clean, single policies for swap_requests table
SELECT '=== CREATING CLEAN SWAP_REQUESTS POLICIES ===' as info;

CREATE POLICY "swap_requests_select_policy" ON public.swap_requests
FOR SELECT USING (
  auth.uid() = requester_id OR 
  auth.uid() = accepter_id OR
  EXISTS (
    SELECT 1 FROM public.staff current_staff
    WHERE current_staff.id = auth.uid() 
    AND current_staff.base_location = (
      SELECT base_location FROM public.staff WHERE id = requester_id
    )
  )
);

CREATE POLICY "swap_requests_insert_policy" ON public.swap_requests
FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "swap_requests_update_policy" ON public.swap_requests
FOR UPDATE USING (
  auth.uid() = requester_id OR auth.uid() = accepter_id
);

CREATE POLICY "swap_requests_delete_policy" ON public.swap_requests
FOR DELETE USING (auth.uid() = requester_id);

-- 7. Create clean, single policies for shifts table
SELECT '=== CREATING CLEAN SHIFTS POLICIES ===' as info;

CREATE POLICY "shifts_select_policy" ON public.shifts
FOR SELECT USING (
  auth.uid() = staff_id OR
  EXISTS (
    SELECT 1 FROM public.staff current_staff
    WHERE current_staff.id = auth.uid() 
    AND current_staff.base_location = (
      SELECT base_location FROM public.staff WHERE id = staff_id
    )
  )
);

CREATE POLICY "shifts_insert_policy" ON public.shifts
FOR INSERT WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "shifts_update_policy" ON public.shifts
FOR UPDATE USING (auth.uid() = staff_id);

CREATE POLICY "shifts_delete_policy" ON public.shifts
FOR DELETE USING (auth.uid() = staff_id);

-- 8. Create the missing functions
SELECT '=== CREATING MISSING FUNCTIONS ===' as info;

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

-- 9. Grant necessary permissions
SELECT '=== GRANTING PERMISSIONS ===' as info;

GRANT EXECUTE ON FUNCTION public.get_all_staff_for_team() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_eligible_staff_for_swap(text, date, uuid) TO authenticated;

-- 10. Create indexes for better performance
SELECT '=== CREATING INDEXES ===' as info;

CREATE INDEX IF NOT EXISTS idx_staff_base_location ON public.staff(base_location);
CREATE INDEX IF NOT EXISTS idx_shifts_date_staff ON public.shifts(date, staff_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester_id ON public.swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_accepter_id ON public.swap_requests(accepter_id);

-- 11. Verify the final state
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
AND tablename IN ('staff', 'swap_requests', 'shifts')
ORDER BY tablename, policyname;

-- 12. Test function existence
SELECT '=== FUNCTION VERIFICATION ===' as info;

SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('get_all_staff_for_team', 'get_eligible_staff_for_swap')
ORDER BY routine_name;

-- 13. Summary
SELECT '=== SUMMARY ===' as info;
SELECT 
  'All RLS policies cleaned up and recreated' as action,
  'Database functions created successfully' as functions,
  'Ready for testing' as status;
