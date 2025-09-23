-- FIX BROKEN RLS POLICIES
-- Run this to restore the policies you accidentally dropped
-- This will fix the 500 errors and make your data visible again

SELECT '=== FIXING BROKEN RLS POLICIES ===' as info;

-- 1. Restore companies SELECT policy (everyone can view companies)
CREATE POLICY "Companies are viewable by everyone" 
ON public.companies 
FOR SELECT 
USING (true);

-- 2. Restore staff SELECT policy (users can view staff at same base location)
CREATE POLICY "Users can view staff at same base location" 
ON public.staff 
FOR SELECT 
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND base_location = public.staff.base_location
  )
);

-- 3. Restore shifts SELECT policy (users can view shifts at their base location)
CREATE POLICY "Users can view shifts at same base location" 
ON public.shifts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND base_location = (
      SELECT base_location FROM public.staff WHERE id = public.shifts.staff_id
    )
  )
  OR 
  auth.uid() = staff_id
);

-- 4. Restore swap_requests SELECT policy (users can view swap requests at same base)
CREATE POLICY "Users can view swap requests at same base" 
ON public.swap_requests 
FOR SELECT 
USING (
  auth.uid() = requester_id OR 
  auth.uid() = accepter_id OR
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND base_location = (
      SELECT base_location FROM public.staff WHERE id = requester_id
    )
  )
);

-- 5. Restore subscriptions DELETE policy (system can delete subscriptions)
CREATE POLICY "System can delete subscriptions" 
ON public.subscriptions 
FOR DELETE 
USING (true);

-- 6. Add additional policies that might be missing for full functionality

-- Staff INSERT policy
CREATE POLICY "Users can insert their own staff record" 
ON public.staff 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Staff UPDATE policy
CREATE POLICY "Users can update their own staff record" 
ON public.staff 
FOR UPDATE 
USING (auth.uid() = id);

-- Shifts INSERT policy
CREATE POLICY "Users can insert their own shifts" 
ON public.shifts 
FOR INSERT 
WITH CHECK (auth.uid() = staff_id);

-- Shifts UPDATE policy
CREATE POLICY "Users can update their own shifts" 
ON public.shifts 
FOR UPDATE 
USING (auth.uid() = staff_id);

-- Shifts DELETE policy
CREATE POLICY "Users can delete their own shifts" 
ON public.shifts 
FOR DELETE 
USING (auth.uid() = staff_id);

-- Swap requests INSERT policy
CREATE POLICY "Users can insert their own swap requests" 
ON public.swap_requests 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

-- Swap requests UPDATE policy
CREATE POLICY "Users can update swap requests they created or are accepting" 
ON public.swap_requests 
FOR UPDATE 
USING (auth.uid() = requester_id OR auth.uid() = accepter_id);

-- Subscriptions SELECT policy
CREATE POLICY "Users can view their own subscription" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Subscriptions INSERT policy
CREATE POLICY "System can insert subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (true);

-- Subscriptions UPDATE policy
CREATE POLICY "System can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
WITH CHECK (true);

SELECT '=== VERIFICATION: CURRENT POLICIES ===' as info;

-- Show all current policies
SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has conditions'
        ELSE 'No conditions'
    END as restrictions
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

SELECT '=== TESTING DATA ACCESS ===' as info;

-- Test that we can now access the data
SELECT COUNT(*) as companies_count FROM public.companies;
SELECT COUNT(*) as staff_count FROM public.staff;
SELECT COUNT(*) as shifts_count FROM public.shifts;
SELECT COUNT(*) as swap_requests_count FROM public.swap_requests;
SELECT COUNT(*) as subscriptions_count FROM public.subscriptions;

SELECT '=== POLICIES RESTORED - APPLICATION SHOULD WORK NOW ===' as info;
