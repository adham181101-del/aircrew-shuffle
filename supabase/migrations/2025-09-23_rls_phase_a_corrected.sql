-- RLS Phase A: Non-breaking security improvements (CORRECTED FOR ACTUAL SCHEMA)
-- This migration adds proper ownership defaults and basic RLS without breaking existing functionality

-- 1. Add ownership defaults and immutability triggers
-- For subscriptions table (if it has user_id column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.subscriptions ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Create function to enforce user_id immutability (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id'
  ) THEN
    -- Create function if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'enforce_user_owner_immutable'
    ) THEN
      CREATE OR REPLACE FUNCTION enforce_user_owner_immutable() RETURNS trigger 
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
          RAISE EXCEPTION 'user_id is immutable';
        END IF;
        RETURN NEW;
      END $$;
    END IF;

    -- Add trigger for subscriptions
    DROP TRIGGER IF EXISTS trg_subscriptions_owner_immutable ON public.subscriptions;
    CREATE TRIGGER trg_subscriptions_owner_immutable
      BEFORE UPDATE ON public.subscriptions
      FOR EACH ROW EXECUTE FUNCTION enforce_user_owner_immutable();
  END IF;
END $$;

-- 2. Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Create Phase A policies (non-breaking, still permissive but authenticated only)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "companies_all_operations" ON public.companies;
DROP POLICY IF EXISTS "staff_all_operations" ON public.staff;
DROP POLICY IF EXISTS "shifts_all_operations" ON public.shifts;
DROP POLICY IF EXISTS "swap_requests_all_operations" ON public.swap_requests;
DROP POLICY IF EXISTS "subscriptions_all_operations" ON public.subscriptions;

-- Companies - allow authenticated users to view
CREATE POLICY "companies_select_authenticated" ON public.companies
  FOR SELECT TO authenticated USING (true);

-- Staff - allow authenticated users to view and manage
CREATE POLICY "staff_select_authenticated" ON public.staff
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_authenticated" ON public.staff
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff_update_authenticated" ON public.staff
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Shifts - allow authenticated users to view and manage
CREATE POLICY "shifts_select_authenticated" ON public.shifts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts_insert_authenticated" ON public.shifts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shifts_update_authenticated" ON public.shifts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shifts_delete_authenticated" ON public.shifts
  FOR DELETE TO authenticated USING (true);

-- Swap requests - allow authenticated users to view and manage
CREATE POLICY "swap_requests_select_authenticated" ON public.swap_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "swap_requests_insert_authenticated" ON public.swap_requests
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "swap_requests_update_authenticated" ON public.swap_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "swap_requests_delete_authenticated" ON public.swap_requests
  FOR DELETE TO authenticated USING (true);

-- Subscriptions - user-scoped policies + service role for system operations
CREATE POLICY "subscriptions_select_authenticated" ON public.subscriptions
  FOR SELECT TO authenticated USING (true);

-- User-scoped subscription policies (only if user_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id'
  ) THEN
    CREATE POLICY "Users can view own subscription" ON public.subscriptions
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can update own subscription" ON public.subscriptions
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Service role policies for system operations (Stripe webhooks, etc.)
CREATE POLICY "Service can insert subscriptions" ON public.subscriptions
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service can update subscriptions" ON public.subscriptions
  FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service can delete subscriptions" ON public.subscriptions
  FOR DELETE TO service_role
  USING (true);

-- 4. Create indexes for performance (using actual column names)
CREATE INDEX IF NOT EXISTS idx_staff_id ON public.staff(id);
CREATE INDEX IF NOT EXISTS idx_staff_company_id ON public.staff(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON public.shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON public.shifts(date);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester_id ON public.swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_accepter_id ON public.swap_requests(accepter_id);

-- Add subscription indexes only if user_id column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
  END IF;
END $$;

