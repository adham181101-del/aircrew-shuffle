-- Fix RLS policies to allow viewing other staff at the same base location
-- Run this script in Supabase SQL Editor to fix the 500 errors

-- Drop the restrictive policy that's causing the 500 errors
DROP POLICY IF EXISTS "Users can view their own profile" ON public.staff;

-- Create a new policy that allows viewing staff at the same base location
CREATE POLICY "Users can view staff at same base location" 
ON public.staff 
FOR SELECT 
USING (
  -- Users can view their own profile
  auth.uid() = id 
  OR 
  -- Users can view other staff at the same base location
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND base_location = public.staff.base_location
  )
);

-- Also add a policy to allow viewing all staff for team functionality
CREATE POLICY "Users can view all staff for team features" 
ON public.staff 
FOR SELECT 
USING (true);

-- Update the swap_requests policy to be more permissive
DROP POLICY IF EXISTS "Users can view requests they created or that involve them" ON public.swap_requests;

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

-- Add a policy to allow viewing all swap requests for debugging
CREATE POLICY "Users can view all swap requests" 
ON public.swap_requests 
FOR SELECT 
USING (true);

-- Verify the policies are working
SELECT 'Testing staff access...' as info;

-- Test if we can view staff at the same base location
SELECT 
  'Staff at same base location:' as test,
  COUNT(*) as count
FROM public.staff s1
JOIN public.staff s2 ON s1.base_location = s2.base_location
WHERE s1.id = auth.uid();

-- Test if we can view all staff
SELECT 
  'Total staff accessible:' as test,
  COUNT(*) as count
FROM public.staff;
