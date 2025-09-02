-- Complete SQL script to add counter_offer_date field to swap_requests table
-- Run this in your Supabase SQL Editor

-- Add counter_offer_date field to swap_requests table
ALTER TABLE public.swap_requests 
ADD COLUMN counter_offer_date TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.swap_requests.counter_offer_date IS 'Date offered in counter-offer (YYYY-MM-DD format)';

-- Verify the field was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'swap_requests' 
AND table_schema = 'public'
AND column_name = 'counter_offer_date';

-- Show current swap_requests table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'swap_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;
