-- Add Iberia as a company and update functions to pool BA and Iberia employees
-- This allows BA and Iberia employees to see each other as colleagues

-- 1. Add Iberia as a company (only if it doesn't exist)
INSERT INTO public.companies (name, industry, email_domain, config) 
SELECT 
  'Iberia', 
  'Aviation', 
  'iberia.com', 
  '{"bases": ["Iberia CER", "BA CER", "Iberia & BA CER", "Iberia IOL", "Iberia IGL", "Baggage For BA", "Drivers For BA", "British Airways CER", "British Airways CEL", "Baggage Handlers", "Drivers", "Crew", "Allocation", "Resourcing"], "features": {"premium_calculator": true, "shift_swapping": true}}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies WHERE name = 'Iberia' OR email_domain = 'iberia.com'
);

-- 2. Update get_all_staff_for_team function to pool BA and Iberia employees
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
DECLARE
    current_user_company_id uuid;
    ba_company_id uuid;
    iberia_company_id uuid;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get current user's company
    SELECT company_id INTO current_user_company_id
    FROM public.staff
    WHERE id = auth.uid();
    
    IF current_user_company_id IS NULL THEN
        RAISE EXCEPTION 'User company not found';
    END IF;
    
    -- Get BA and Iberia company IDs
    SELECT id INTO ba_company_id FROM public.companies WHERE email_domain = 'ba.com';
    SELECT id INTO iberia_company_id FROM public.companies WHERE email_domain = 'iberia.com';
    
    -- Return all staff from the same company, OR pool BA and Iberia together
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
    WHERE 
        -- Same company
        s.company_id = current_user_company_id
        OR
        -- Pool BA and Iberia together
        (
            current_user_company_id IN (ba_company_id, iberia_company_id)
            AND s.company_id IN (ba_company_id, iberia_company_id)
        )
    ORDER BY s.base_location, s.staff_number;
END;
$$;

-- 3. Update get_eligible_staff_for_swap function to pool BA and Iberia employees
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
DECLARE
    requester_company_id uuid;
    ba_company_id uuid;
    iberia_company_id uuid;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get requester's company
    SELECT company_id INTO requester_company_id
    FROM public.staff
    WHERE id = requester_id;
    
    IF requester_company_id IS NULL THEN
        RAISE EXCEPTION 'Requester company not found';
    END IF;
    
    -- Get BA and Iberia company IDs
    SELECT id INTO ba_company_id FROM public.companies WHERE email_domain = 'ba.com';
    SELECT id INTO iberia_company_id FROM public.companies WHERE email_domain = 'iberia.com';
    
    -- Return staff who are OFF on the swap date at the same base location
    -- Pool BA and Iberia employees together
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
    AND (
        -- Same company
        s.company_id = requester_company_id
        OR
        -- Pool BA and Iberia together
        (
            requester_company_id IN (ba_company_id, iberia_company_id)
            AND s.company_id IN (ba_company_id, iberia_company_id)
        )
    )
    ORDER BY s.staff_number;
END;
$$;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_all_staff_for_team() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_eligible_staff_for_swap(text, date, uuid) TO authenticated;

-- 5. Ensure companies table is readable by everyone (including unauthenticated users for signup)
-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "companies_select" ON public.companies;
DROP POLICY IF EXISTS "companies_select_authenticated" ON public.companies;
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;

-- Create a policy that allows everyone (including unauthenticated) to read companies for signup
CREATE POLICY "Companies are viewable by everyone" 
ON public.companies 
FOR SELECT 
USING (true);

-- 6. Create index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_staff_company_id ON public.staff(company_id);
CREATE INDEX IF NOT EXISTS idx_staff_base_location ON public.staff(base_location);
CREATE INDEX IF NOT EXISTS idx_shifts_date_staff ON public.shifts(date, staff_id);

