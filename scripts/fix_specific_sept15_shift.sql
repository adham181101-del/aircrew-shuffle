-- Fix script for the specific September 15th shift
-- Shift ID: 0bceaab1-887d-4808-bb67-db0b783b7f0e

-- 1. Check the specific shift details
SELECT '=== SPECIFIC SEPTEMBER 15TH SHIFT ===' as info;
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
WHERE s.id = '0bceaab1-887d-4808-bb67-db0b783b7f0e';

-- 2. Check who currently owns this shift
SELECT '=== CURRENT SHIFT OWNER ===' as info;
SELECT 
    st.id as staff_id,
    st.staff_number,
    st.email,
    st.base_location
FROM public.staff st
JOIN public.shifts s ON st.id = s.staff_id
WHERE s.id = '0bceaab1-887d-4808-bb67-db0b783b7f0e';

-- 3. Check Adham's current shifts
SELECT '=== ADHAM CURRENT SHIFTS ===' as info;
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

-- 4. Check if Adham already has a shift on September 15th
SELECT '=== ADHAM SEPTEMBER 15TH SHIFTS ===' as info;
SELECT 
    s.id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.staff_number = '254575'
AND s.date = '2025-09-15';

-- 5. Get Adham's user ID
SELECT '=== ADHAM USER ID ===' as info;
SELECT 
    id,
    staff_number,
    email
FROM public.staff 
WHERE staff_number = '254575';

-- 6. Create the missing shift for Adham if he doesn't have one
SELECT '=== CREATING SHIFT FOR ADHAM ===' as info;

DO $$
DECLARE
    adham_id UUID;
    shift_exists BOOLEAN;
BEGIN
    -- Get Adham's user ID (staff_number 254575)
    SELECT id INTO adham_id 
    FROM public.staff 
    WHERE staff_number = '254575';
    
    IF adham_id IS NULL THEN
        RAISE NOTICE 'Adham (staff_number 254575) not found';
        RETURN;
    END IF;
    
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

-- 7. Final verification - Adham's shifts after fix
SELECT '=== ADHAM SHIFTS AFTER FIX ===' as info;
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

-- 8. All September 15th shifts after fix
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
