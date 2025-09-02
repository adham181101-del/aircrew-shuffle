-- Fix script for swap requests to use correct staff numbers
-- Based on the correct assignments:
-- Staff Number 1234567890 = Shaheen
-- Staff Number 254575 = Adham

-- 1. Check current swap requests
SELECT '=== CURRENT SWAP REQUESTS ===' as info;
SELECT 
    sr.id,
    sr.status,
    sr.created_at,
    sr.counter_offer_date,
    rs.staff_number as requester_staff,
    rs.email as requester_email,
    acs.staff_number as accepter_staff,
    acs.email as accepter_email,
    rshift.date as requester_shift_date,
    rshift.time as requester_shift_time
FROM public.swap_requests sr
LEFT JOIN public.staff rs ON sr.requester_id = rs.id
LEFT JOIN public.staff acs ON sr.accepter_id = acs.id
LEFT JOIN public.shifts rshift ON sr.requester_shift_id = rshift.id
WHERE sr.status = 'accepted'
ORDER BY sr.created_at DESC;

-- 2. Check the specific accepted swap for September 15th
SELECT '=== SEPTEMBER 15TH ACCEPTED SWAP ===' as info;
SELECT 
    sr.id,
    sr.status,
    sr.created_at,
    rs.staff_number as requester_staff,
    rs.email as requester_email,
    acs.staff_number as accepter_staff,
    acs.email as accepter_email,
    rshift.date as requester_shift_date,
    rshift.time as requester_shift_time
FROM public.swap_requests sr
LEFT JOIN public.staff rs ON sr.requester_id = rs.id
LEFT JOIN public.staff acs ON sr.accepter_id = acs.id
LEFT JOIN public.shifts rshift ON sr.requester_shift_id = rshift.id
WHERE sr.status = 'accepted'
AND rshift.date = '2025-09-15';

-- 3. Check who currently has the September 15th shift
SELECT '=== CURRENT SEPTEMBER 15TH SHIFT OWNER ===' as info;
SELECT 
    s.id,
    s.staff_id,
    st.staff_number,
    st.email,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE s.date = '2025-09-15';

-- 4. Create the correct shift for Adham (254575) if he doesn't have one
SELECT '=== CREATING SHIFT FOR ADHAM (254575) ===' as info;

DO $$
DECLARE
    adham_id UUID;
    shift_exists BOOLEAN;
BEGIN
    -- Get Adham's user ID (staff_number 254575)
    SELECT id INTO adham_id 
    FROM public.staff 
    WHERE staff_number = '254575';
    
    -- Check if Adham already has a shift on Sept 15th
    SELECT EXISTS(
        SELECT 1 FROM public.shifts 
        WHERE staff_id = adham_id 
        AND date = '2025-09-15'
    ) INTO shift_exists;
    
    -- Create the shift for Adham if it doesn't exist
    IF NOT shift_exists THEN
        INSERT INTO public.shifts (staff_id, date, time, is_swapped, created_at)
        VALUES (adham_id, '2025-09-15', '05:30-14:30', true, NOW());
        
        RAISE NOTICE 'Created shift for Adham (staff_number 254575) on 2025-09-15';
    ELSE
        RAISE NOTICE 'Adham already has a shift on 2025-09-15';
    END IF;
END $$;

-- 5. Final verification - Adham's shifts
SELECT '=== ADHAM SHIFTS (254575) ===' as info;
SELECT 
    s.id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.staff_number = '254575'
ORDER BY s.date ASC;

-- 6. All September 15th shifts after fix
SELECT '=== ALL SEPTEMBER 15TH SHIFTS ===' as info;
SELECT 
    s.id,
    s.staff_id,
    st.staff_number,
    st.email,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE s.date = '2025-09-15'
ORDER BY st.staff_number;
