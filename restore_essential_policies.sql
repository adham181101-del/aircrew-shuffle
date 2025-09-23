-- RESTORE ESSENTIAL RLS POLICIES
-- Run this immediately to restore functionality after accidental policy removal

SELECT '=== RESTORING ESSENTIAL POLICIES ===' as info;

-- 1. Restore companies SELECT policy
CREATE POLICY "Companies are viewable by everyone" 
ON public.companies 
FOR SELECT 
USING (true);

-- 2. Restore shifts SELECT policy (users can view shifts at their base location)
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

-- 3. Restore staff SELECT policy (users can view staff at same base location)
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

SELECT '=== VERIFICATION: RESTORED POLICIES ===' as info;

-- Show restored policies
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
AND tablename IN ('companies', 'shifts', 'staff', 'swap_requests', 'subscriptions')
ORDER BY tablename, cmd, policyname;

SELECT '=== TESTING DATA ACCESS ===' as info;

-- Test that we can now access the data
SELECT COUNT(*) as companies_count FROM public.companies;
SELECT COUNT(*) as staff_count FROM public.staff;
SELECT COUNT(*) as shifts_count FROM public.shifts;
SELECT COUNT(*) as swap_requests_count FROM public.swap_requests;
SELECT COUNT(*) as subscriptions_count FROM public.subscriptions;

SELECT '=== POLICIES RESTORED SUCCESSFULLY ===' as info;
