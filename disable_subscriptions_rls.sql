-- Temporarily disable RLS on subscriptions table for testing
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON subscriptions TO service_role;
