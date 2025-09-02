-- Fix script for Adham's September 15th swap
-- The issue is that the swap was accepted but Adham never got the new shift

-- 1. Check the current situation
SELECT '=== CURRENT SITUATION ===' as info;
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

-- 2. Get Adham's user ID
SELECT '=== ADHAM USER ID ===' as info;
SELECT id, staff_number, email 
FROM public.staff 
WHERE staff_number = '1234567890';

-- 3. Check if Adham already has a shift on Sept 15th
SELECT '=== ADHAM SEPT 15 SHIFTS ===' as info;
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
WHERE st.staff_number = '1234567890' 
AND s.date = '2025-09-15';

-- 4. Create the missing shift for Adham
SELECT '=== CREATING SHIFT FOR ADHAM ===' as info;

DO $$
DECLARE
    adham_id UUID;
    shift_exists BOOLEAN;
BEGIN
    -- Get Adham's user ID
    SELECT id INTO adham_id 
    FROM public.staff 
    WHERE staff_number = '1234567890';
    
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
        
        RAISE NOTICE 'Created shift for Adham on 2025-09-15 with time 05:30-14:30';
    ELSE
        RAISE NOTICE 'Adham already has a shift on 2025-09-15';
    END IF;
END $$;

-- 5. Verify the shift was created for Adham
SELECT '=== VERIFICATION - ADHAM SHIFTS AFTER FIX ===' as info;
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

-- 6. Show all shifts on Sept 15th after the fix
SELECT '=== ALL SEPT 15 SHIFTS AFTER FIX ===' as info;
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
