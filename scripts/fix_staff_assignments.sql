-- Fix script for correct staff assignments
-- Staff Number 1234567890 belongs to Shaheen
-- Staff Number 254575 belongs to Adham

-- 1. Check current staff assignments
SELECT '=== CURRENT STAFF ASSIGNMENTS ===' as info;
SELECT 
    id,
    staff_number,
    email,
    base_location,
    can_work_doubles
FROM public.staff 
WHERE staff_number IN ('1234567890', '254575')
ORDER BY staff_number;

-- 2. Fix the staff assignments correctly
SELECT '=== FIXING STAFF ASSIGNMENTS ===' as info;

-- Update to correct assignments:
-- 1234567890 should be Shaheen
-- 254575 should be Adham
UPDATE public.staff 
SET email = 'shaheenamin09@ba.com'
WHERE staff_number = '1234567890';

UPDATE public.staff 
SET email = 'adham181101@gmail.com'
WHERE staff_number = '254575';

-- 3. Verify the fix
SELECT '=== STAFF ASSIGNMENTS AFTER FIX ===' as info;
SELECT 
    id,
    staff_number,
    email,
    base_location,
    can_work_doubles
FROM public.staff 
WHERE staff_number IN ('1234567890', '254575')
ORDER BY staff_number;

-- 4. Check September 15th shifts after staff fix
SELECT '=== SEPTEMBER 15TH SHIFTS AFTER STAFF FIX ===' as info;
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

-- 5. Create the missing shift for Adham (staff_number 254575)
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

-- 6. Final verification
SELECT '=== FINAL VERIFICATION ===' as info;
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

-- 7. Check Adham's shifts specifically
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
