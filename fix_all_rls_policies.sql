-- Comprehensive RLS fix for staff and subscriptions tables
-- This will fix the access control issues you're seeing

-- 1. Fix subscriptions table RLS
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON subscriptions;

-- Recreate subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
    FOR ALL USING (true);

-- Re-enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Fix staff table RLS
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on staff
DROP POLICY IF EXISTS "Users can view their own staff record" ON staff;
DROP POLICY IF EXISTS "Users can insert their own staff record" ON staff;
DROP POLICY IF EXISTS "Users can update their own staff record" ON staff;
DROP POLICY IF EXISTS "Service role can manage all staff" ON staff;

-- Recreate staff policies
CREATE POLICY "Users can view their own staff record" ON staff
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can insert their own staff record" ON staff
    FOR INSERT WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can update their own staff record" ON staff
    FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Service role can manage all staff" ON staff
    FOR ALL USING (true);

-- Re-enable RLS on staff
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- 3. Grant necessary permissions
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON staff TO authenticated;
GRANT ALL ON staff TO service_role;

-- 4. Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('subscriptions', 'staff');
