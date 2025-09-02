-- Fix staff RLS policies and create missing function for team view
-- This addresses the HTTP 500 errors and missing eligible staff issues

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff at same base location" ON public.staff;
DROP POLICY IF EXISTS "Users can view all staff for team features" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff for team features" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff at same base" ON public.staff;
DROP POLICY IF EXISTS "Users can view all staff" ON public.staff;

-- 2. Create a more permissive policy for staff viewing
CREATE POLICY "Users can view staff for team features" 
ON public.staff 
FOR SELECT 
USING (
  -- Users can always view their own profile
  auth.uid() = id 
  OR 
  -- Users can view other staff at the same base location
  EXISTS (
    SELECT 1 FROM public.staff current_staff
    WHERE current_staff.id = auth.uid() 
    AND current_staff.base_location = public.staff.base_location
  )
  OR
  -- Users can view all staff for team functionality (temporarily more permissive)
  true
);

-- 3. Create the missing get_all_staff_for_team function
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

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_all_staff_for_team() TO authenticated;

-- 5. Fix swap_requests policies
DROP POLICY IF EXISTS "Users can view swap requests at same base" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view all swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view swap requests for team" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view related swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view requests they created or that involve them" ON public.swap_requests;

CREATE POLICY "Users can view swap requests for team" 
ON public.swap_requests 
FOR SELECT 
USING (
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

-- 6. Create a function to get eligible staff for swaps
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

-- 7. Grant permissions for the new function
GRANT EXECUTE ON FUNCTION public.get_eligible_staff_for_swap(text, date, uuid) TO authenticated;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_base_location ON public.staff(base_location);
CREATE INDEX IF NOT EXISTS idx_shifts_date_staff ON public.shifts(date, staff_id);

-- 9. Verify the changes
SELECT 'Staff policies' as table_name, count(*) as policy_count 
FROM pg_policies WHERE tablename = 'staff'
UNION ALL
SELECT 'Swap requests policies' as table_name, count(*) as policy_count 
FROM pg_policies WHERE tablename = 'swap_requests';

-- 10. Test the function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('get_all_staff_for_team', 'get_eligible_staff_for_swap');
