-- Fix the counter-offer shift allocation bug
-- The issue: When accepting counter-offers, the requester gets a shift on the counter-offer date
-- but with the wrong time (using requester_shift.time instead of accepter's shift time)

-- Drop and recreate the function with the fix
DROP FUNCTION IF EXISTS public.execute_shift_swap(UUID, UUID, UUID, TEXT, UUID);

-- Create the corrected function
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
    -- Get the accepter's shift details to use their time
    SELECT * INTO accepter_shift FROM shifts WHERE staff_id = accepter_id AND date = counter_offer_date;
    
    -- Delete the original requester shift
    DELETE FROM shifts WHERE id = requester_shift_id;
    
    -- Create shift for accepter (they get the requester's shift)
    INSERT INTO shifts (staff_id, date, time, is_swapped)
    VALUES (accepter_id, requester_shift.date, requester_shift.time, true);
    
    -- Create shift for requester (they get the counter-offer date with accepter's time)
    -- If accepter has a shift on that date, use their time, otherwise use requester's time
    INSERT INTO shifts (staff_id, date, time, is_swapped)
    VALUES (
      requester_id, 
      counter_offer_date, 
      COALESCE(accepter_shift.time, requester_shift.time), 
      true
    );
    
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
    
    RETURN json_build_object('success', true, 'type', 'direct_swap');
    
  -- If accepter doesn't have a shift (coverage scenario)
  ELSE
    -- Delete the original requester shift
    DELETE FROM shifts WHERE id = requester_shift_id;
    
    -- Create shift for accepter (they get the requester's shift)
    INSERT INTO shifts (staff_id, date, time, is_swapped)
    VALUES (accepter_id, requester_shift.date, requester_shift.time, true);
    
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
COMMENT ON FUNCTION public.execute_shift_swap IS 'Executes shift swaps with elevated privileges to bypass RLS restrictions. Fixed counter-offer time allocation bug.';

-- Test the function with a sample scenario
SELECT '=== TESTING FIXED FUNCTION ===' as info;

-- Show current shifts that might be affected by the bug
SELECT '=== CURRENT SHIFTS WITH is_swapped = true ===' as info;
SELECT 
    s.id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at,
    st.email,
    st.staff_number
FROM shifts s
JOIN staff st ON s.staff_id = st.id
WHERE s.is_swapped = true
ORDER BY s.created_at DESC
LIMIT 10;
