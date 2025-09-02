-- Script to check and fix the September 15th swap issue
-- The issue might be that the swap was accepted but the shift wasn't created

-- 1. Check if the shift was actually created for Adham on Sept 15th
SELECT '=== CHECKING IF SHIFT EXISTS FOR ADHAM ON SEPT 15 ===' as info;
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
WHERE st.staff_number = '1234567890' 
AND s.date = '2025-09-15';

-- 2. Check if any shifts were created for Adham recently
SELECT '=== ADHAM RECENT SHIFTS ===' as info;
SELECT 
    s.id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.staff_number = '1234567890'
AND s.created_at > '2025-08-28'
ORDER BY s.created_at DESC;

-- 3. Check if the original requester shift still exists
SELECT '=== ORIGINAL REQUESTER SHIFT ===' as info;
SELECT 
    s.id,
    s.staff_id,
    st.staff_number,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE s.id = (
    SELECT requester_shift_id 
    FROM public.swap_requests 
    WHERE id = '61ccb422-7377-4934-8b30-cb887ddeab09'
);

-- 4. Manually create the missing shift for Adham if it doesn't exist
-- This will create the shift that should have been created when the swap was accepted
SELECT '=== CREATING MISSING SHIFT FOR ADHAM ===' as info;

-- First, check if we need to create the shift
DO $$
DECLARE
    adham_id UUID;
    shift_exists BOOLEAN;
BEGIN
    -- Get Adham's user ID
    SELECT id INTO adham_id 
    FROM public.staff 
    WHERE staff_number = '1234567890';
    
    -- Check if shift already exists
    SELECT EXISTS(
        SELECT 1 FROM public.shifts 
        WHERE staff_id = adham_id 
        AND date = '2025-09-15'
    ) INTO shift_exists;
    
    -- Create the shift if it doesn't exist
    IF NOT shift_exists THEN
        INSERT INTO public.shifts (staff_id, date, time, is_swapped, created_at)
        VALUES (adham_id, '2025-09-15', '05:30-14:30', true, NOW());
        
        RAISE NOTICE 'Created missing shift for Adham on 2025-09-15';
    ELSE
        RAISE NOTICE 'Shift already exists for Adham on 2025-09-15';
    END IF;
END $$;

-- 5. Verify the shift was created
SELECT '=== VERIFICATION - ADHAM SHIFTS AFTER FIX ===' as info;
SELECT 
    s.id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.staff_number = '1234567890'
AND s.date = '2025-09-15';
