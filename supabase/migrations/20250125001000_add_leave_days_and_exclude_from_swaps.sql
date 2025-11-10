-- Create leave_days table to capture staff leave days
CREATE TABLE IF NOT EXISTS public.leave_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uniqueness: a staff member can only mark leave once per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_days_unique ON public.leave_days(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_days_date ON public.leave_days(date);

-- Enable RLS and basic policies
ALTER TABLE public.leave_days ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'leave_days' AND policyname = 'leave_days_select'
  ) THEN
    CREATE POLICY leave_days_select ON public.leave_days
      FOR SELECT USING (auth.uid() = staff_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'leave_days' AND policyname = 'leave_days_modify_own'
  ) THEN
    CREATE POLICY leave_days_modify_own ON public.leave_days
      FOR ALL USING (auth.uid() = staff_id) WITH CHECK (auth.uid() = staff_id);
  END IF;
END $$;

-- Update get_eligible_staff_for_swap to exclude leave days for either party
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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT company_id INTO requester_company_id
    FROM public.staff
    WHERE id = requester_id;

    IF requester_company_id IS NULL THEN
        RAISE EXCEPTION 'Requester company not found';
    END IF;

    SELECT id INTO ba_company_id FROM public.companies WHERE email_domain = 'ba.com';
    SELECT id INTO iberia_company_id FROM public.companies WHERE email_domain = 'iberia.com';

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
      -- Exclude candidates on leave that day
      AND NOT EXISTS (
        SELECT 1 FROM public.leave_days ld 
        WHERE ld.staff_id = s.id AND ld.date = swap_date
      )
      -- Also ensure requester is not on leave that day (if they are, no repayment should be suggested)
      AND NOT EXISTS (
        SELECT 1 FROM public.leave_days ldr
        WHERE ldr.staff_id = requester_id AND ldr.date = swap_date
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.shifts sh
        WHERE sh.staff_id = s.id
        AND sh.date = swap_date
      )
      AND (
        s.company_id = requester_company_id
        OR (
          requester_company_id IN (ba_company_id, iberia_company_id)
          AND s.company_id IN (ba_company_id, iberia_company_id)
        )
      )
    ORDER BY s.staff_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_eligible_staff_for_swap(text, date, uuid) TO authenticated;

