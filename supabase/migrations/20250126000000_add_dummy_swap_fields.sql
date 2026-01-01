-- Add dummy swap functionality to swap_requests table
-- This allows swaps to be made with placeholder dates when the actual dates are outside the allowed swap period

-- Add is_dummy flag to mark dummy swaps
ALTER TABLE public.swap_requests 
ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN NOT NULL DEFAULT false;

-- Add dummy_repay_date to store the placeholder repayment date (within allowed period)
ALTER TABLE public.swap_requests 
ADD COLUMN IF NOT EXISTS dummy_repay_date TEXT;

-- Add final_repay_date to store the actual desired repayment date (outside allowed period, to be resolved later)
ALTER TABLE public.swap_requests 
ADD COLUMN IF NOT EXISTS final_repay_date TEXT;

-- Add comments to document the fields
COMMENT ON COLUMN public.swap_requests.is_dummy IS 'Indicates if this is a dummy swap with placeholder dates';
COMMENT ON COLUMN public.swap_requests.dummy_repay_date IS 'Placeholder repayment date within the allowed swap period (e.g., March 20th)';
COMMENT ON COLUMN public.swap_requests.final_repay_date IS 'Actual desired repayment date outside the allowed swap period (e.g., April 4th). To be resolved when dates open.';

-- Create an index on is_dummy for filtering dummy swaps
CREATE INDEX IF NOT EXISTS idx_swap_requests_is_dummy ON public.swap_requests(is_dummy);

