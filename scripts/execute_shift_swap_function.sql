-- Fix shift swap permissions by creating a secure function for shift swaps
-- This function runs with elevated privileges to handle shift swaps properly

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.execute_shift_swap(UUID, UUID, UUID, TEXT, UUID);

-- Create a secure function to execute shift swaps
CREATE OR REPLACE FUNCTION public.execute_shift_swap(
  swap_request_id UUID,
  requester_shift_id UUID,
  accepter_id UUID,
  counter_offer_date TEXT DEFAULT NULL,
  accepter_shift_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_shift RECORD;
  accepter_shift RECORD;
  requester_id UUID;
  result JSON;
BEGIN
  -- Get the requester shift details
  SELECT * INTO requester_shift FROM shifts WHERE id = requester_shift_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Requester shift not found');
  END IF;
  
  requester_id := requester_shift.staff_id;
  
  -- If this is a counter-offer swap
  IF counter_offer_date IS NOT NULL THEN
    -- Delete the original requester shift
    DELETE FROM shifts WHERE id = requester_shift_id;
    
    -- Create shift for accepter (they get the requester's shift)
    INSERT INTO shifts (staff_id, date, time, is_swapped)
    VALUES (accepter_id, requester_shift.date, requester_shift.time, true);
    
    -- Create shift for requester (they get the counter-offer date)
    INSERT INTO shifts (staff_id, date, time, is_swapped)
    VALUES (requester_id, counter_offer_date, requester_shift.time, true);
    
    -- Update the swap request status
    UPDATE swap_requests
    SET status = 'accepted'
    WHERE id = swap_request_id;
    
    RETURN json_build_object('success', true, 'type', 'counter_offer');
    
  -- If this is a direct swap with accepter shift
  ELSIF accepter_shift_id IS NOT NULL THEN
    -- Get the accepter shift details
    SELECT * INTO accepter_shift FROM shifts WHERE id = accepter_shift_id;
    
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Accepter shift not found');
    END IF;
    
    -- Delete both original shifts
    DELETE FROM shifts WHERE id IN (requester_shift_id, accepter_shift_id);
    
    -- Create shift for accepter (they get the requester's shift)
    INSERT INTO shifts (staff_id, date, time, is_swapped)
    VALUES (accepter_id, requester_shift.date, requester_shift.time, true);
    
    -- Create shift for requester (they get the accepter's shift)
    INSERT INTO shifts (staff_id, date, time, is_swapped)
    VALUES (requester_id, accepter_shift.date, accepter_shift.time, true);
    
    -- Update the swap request status
    UPDATE swap_requests
    SET status = 'accepted'
    WHERE id = swap_request_id;
    
    RETURN json_build_object('success', true, 'type', 'direct_swap');
    
  -- If accepter doesn't have a shift (coverage scenario)
  ELSE
    -- Delete the original requester shift
    DELETE FROM shifts WHERE id = requester_shift_id;
    
    -- Create shift for accepter (they get the requester's shift)
    INSERT INTO shifts (staff_id, date, time, is_swapped)
    VALUES (accepter_id, requester_shift.date, requester_shift.time, true);
    
    -- Update the swap request status
    UPDATE swap_requests
    SET status = 'accepted'
    WHERE id = swap_request_id;
    
    RETURN json_build_object('success', true, 'type', 'coverage');
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_shift_swap TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION public.execute_shift_swap IS 'Executes shift swaps with elevated privileges to bypass RLS restrictions. Used for counter-offers and direct swaps.';
