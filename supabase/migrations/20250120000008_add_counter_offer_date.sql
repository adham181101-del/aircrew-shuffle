-- Add counter_offer_date field to swap_requests table
ALTER TABLE public.swap_requests 
ADD COLUMN counter_offer_date TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.swap_requests.counter_offer_date IS 'Date offered in counter-offer (YYYY-MM-DD format)';
