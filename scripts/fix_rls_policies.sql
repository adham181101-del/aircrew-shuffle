-- Fix RLS Policies for AirCrew Shuffle
-- This script will enable proper access to all tables after RLS is enabled

-- 1. Enable RLS on all tables (if not already enabled)
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for staff table
-- Allow users to read their own staff profile
CREATE POLICY "Users can view own staff profile" ON public.staff
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own staff profile
CREATE POLICY "Users can update own staff profile" ON public.staff
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own staff profile
CREATE POLICY "Users can insert own staff profile" ON public.staff
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Create policies for shifts table
-- Allow users to view their own shifts
CREATE POLICY "Users can view own shifts" ON public.shifts
    FOR SELECT USING (auth.uid() = staff_id);

-- Allow users to insert their own shifts
CREATE POLICY "Users can insert own shifts" ON public.shifts
    FOR INSERT WITH CHECK (auth.uid() = staff_id);

-- Allow users to update their own shifts
CREATE POLICY "Users can update own shifts" ON public.shifts
    FOR UPDATE USING (auth.uid() = staff_id);

-- Allow users to delete their own shifts
CREATE POLICY "Users can delete own shifts" ON public.shifts
    FOR DELETE USING (auth.uid() = staff_id);

-- 4. Create policies for swap_requests table
-- Allow users to view swap requests they're involved in
CREATE POLICY "Users can view related swap requests" ON public.swap_requests
    FOR SELECT USING (
        auth.uid() = requester_id OR 
        auth.uid() = accepter_id
    );

-- Allow users to create swap requests
CREATE POLICY "Users can create swap requests" ON public.swap_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Allow users to update swap requests they're involved in
CREATE POLICY "Users can update related swap requests" ON public.swap_requests
    FOR UPDATE USING (
        auth.uid() = requester_id OR 
        auth.uid() = accepter_id
    );

-- Allow users to delete their own swap requests
CREATE POLICY "Users can delete own swap requests" ON public.swap_requests
    FOR DELETE USING (auth.uid() = requester_id);

-- 5. Create policies for companies table
-- Allow all authenticated users to read companies (for registration)
CREATE POLICY "Users can view companies" ON public.companies
    FOR SELECT USING (auth.role() = 'authenticated');

-- 6. Create a function to get all staff for team view
-- This allows users to see other staff members for team scheduling
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
    INNER JOIN public.staff current_user ON current_user.id = auth.uid()
    WHERE s.company_id = current_user.company_id;
END;
$$;

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.staff TO authenticated;
GRANT ALL ON public.shifts TO authenticated;
GRANT ALL ON public.swap_requests TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_staff_for_team() TO authenticated;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON public.shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON public.shifts(date);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester_id ON public.swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_accepter_id ON public.swap_requests(accepter_id);
CREATE INDEX IF NOT EXISTS idx_staff_company_id ON public.staff(company_id);

-- 9. Verify policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
