BEGIN;

-- Keep RLS ON
ALTER TABLE public.companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions  ENABLE ROW LEVEL SECURITY;

-- Move SELECT "true" policies to authenticated (still permissive but no public)
DROP POLICY IF EXISTS companies_select            ON public.companies;
CREATE POLICY companies_select ON public.companies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS shifts_select               ON public.shifts;
CREATE POLICY shifts_select ON public.shifts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS staff_select                ON public.staff;
CREATE POLICY staff_select ON public.staff
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS swap_requests_select        ON public.swap_requests;
CREATE POLICY swap_requests_select ON public.swap_requests
  FOR SELECT TO authenticated USING (true);

-- Subscriptions: delete restricted to service_role only
DROP POLICY IF EXISTS "System can delete subscriptions" ON public.subscriptions;
CREATE POLICY "Service can delete subscriptions"
  ON public.subscriptions
  FOR DELETE TO service_role
  USING (true);

-- (Optional) basic user-scoped policies if user_id column exists
DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='Users can view own subscription') THEN
      EXECUTE 'CREATE POLICY "Users can view own subscription"
        ON public.subscriptions FOR SELECT TO authenticated
        USING (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='Users can update own subscription') THEN
      EXECUTE 'CREATE POLICY "Users can update own subscription"
        ON public.subscriptions FOR UPDATE TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='Service can insert subscriptions') THEN
      EXECUTE 'CREATE POLICY "Service can insert subscriptions"
        ON public.subscriptions FOR INSERT TO service_role
        WITH CHECK (true)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='Service can update subscriptions') THEN
      EXECUTE 'CREATE POLICY "Service can update subscriptions"
        ON public.subscriptions FOR UPDATE TO service_role
        USING (true) WITH CHECK (true)';
    END IF;
  END IF;
END $block$;

COMMIT;
