BEGIN;
DROP POLICY IF EXISTS companies_select       ON public.companies;
DROP POLICY IF EXISTS shifts_select          ON public.shifts;
DROP POLICY IF EXISTS staff_select           ON public.staff;
DROP POLICY IF EXISTS swap_requests_select   ON public.swap_requests;
COMMIT;
