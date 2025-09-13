-- Temporarily disable RLS on subscriptions table to fix 406 errors
-- This allows the app to work while we debug the RLS policies

ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
