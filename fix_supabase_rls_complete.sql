-- Complete fix for Supabase RLS policies for subscriptions table
-- Run this in your Supabase SQL Editor

-- First, let's check if the table exists and see its structure
SELECT * FROM information_schema.tables WHERE table_name = 'subscriptions';

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can update subscriptions" ON public.subscriptions;

-- Disable RLS temporarily to test
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies
CREATE POLICY "Users can view their own subscription" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow system/service role to insert subscriptions (for webhooks)
CREATE POLICY "System can insert subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (true);

-- Allow system/service role to update subscriptions (for webhooks)
CREATE POLICY "System can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
WITH CHECK (true);

-- Allow system/service role to delete subscriptions (for cleanup)
CREATE POLICY "System can delete subscriptions" 
ON public.subscriptions 
FOR DELETE 
USING (true);

-- Test the policies by checking if we can query the table
-- This should work if the policies are correct
SELECT COUNT(*) FROM public.subscriptions;
