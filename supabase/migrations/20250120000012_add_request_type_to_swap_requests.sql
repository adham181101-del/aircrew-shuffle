-- Add request_type column to swap_requests table to distinguish between regular swaps and time changes
-- This migration adds support for time change requests alongside regular shift swaps

-- Add the request_type column with a default value of 'swap' for existing records
ALTER TABLE public.swap_requests 
ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'swap' 
CHECK (request_type IN ('swap', 'time_change'));

-- Create an index on request_type for better query performance
CREATE INDEX IF NOT EXISTS idx_swap_requests_request_type ON public.swap_requests(request_type);

-- Update the RLS policies to handle the new column
-- The existing policies should work fine, but we can add a comment for clarity
COMMENT ON COLUMN public.swap_requests.request_type IS 'Type of request: swap (regular shift swap) or time_change (time change request)';

-- Add a comment to the table to document the new functionality
COMMENT ON TABLE public.swap_requests IS 'Stores both regular shift swap requests and time change requests. Use request_type to distinguish between them.';
