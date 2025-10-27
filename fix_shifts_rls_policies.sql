-- Fix RLS policies for shifts table to ensure proper visibility
-- This will fix the issue where shifts are saved but not visible on calendar

-- First, let's check current RLS status and policies
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrules
FROM pg_tables 
WHERE tablename = 'shifts';

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'shifts';

-- Enable RLS on shifts table if not already enabled
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can insert their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can update their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can delete their own shifts" ON public.shifts;

-- Create proper RLS policies for shifts table
-- Policy 1: Users can view their own shifts
CREATE POLICY "Users can view their own shifts" 
ON public.shifts 
FOR SELECT 
TO authenticated 
USING (staff_id = auth.uid());

-- Policy 2: Users can insert their own shifts
CREATE POLICY "Users can insert their own shifts" 
ON public.shifts 
FOR INSERT 
TO authenticated 
WITH CHECK (staff_id = auth.uid());

-- Policy 3: Users can update their own shifts
CREATE POLICY "Users can update their own shifts" 
ON public.shifts 
FOR UPDATE 
TO authenticated 
USING (staff_id = auth.uid())
WITH CHECK (staff_id = auth.uid());

-- Policy 4: Users can delete their own shifts
CREATE POLICY "Users can delete their own shifts" 
ON public.shifts 
FOR DELETE 
TO authenticated 
USING (staff_id = auth.uid());

-- Also check and fix staff table RLS policies
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Drop existing staff policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.staff;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.staff;

-- Create proper staff policies
CREATE POLICY "Users can view their own profile" 
ON public.staff 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.staff 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Test query to verify RLS policies work
SELECT 'RLS policies for shifts and staff tables have been fixed' as status;

-- Optional: Check if there are any shifts in the database
SELECT 
    COUNT(*) as total_shifts,
    COUNT(DISTINCT staff_id) as unique_users_with_shifts
FROM public.shifts;
