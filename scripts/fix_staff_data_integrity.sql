-- Fix script for staff data integrity and Adham's September 15th shift
-- The issue is that staff_number 1234567890 is linked to Shaheen's email instead of Adham's

-- 1. Check the current staff data integrity
SELECT '=== CURRENT STAFF DATA ===' as info;
SELECT 
    id,
    staff_number,
    email,
    base_location,
    can_work_doubles
FROM public.staff 
WHERE staff_number IN ('1234567890', '254575')
ORDER BY staff_number;

-- 2. Check which staff member should have which staff number
SELECT '=== STAFF NUMBER ASSIGNMENT CHECK ===' as info;
SELECT 
    CASE 
        WHEN email LIKE '%adham%' THEN 'Should be Adham'
        WHEN email LIKE '%shaheen%' THEN 'Should be Shaheen'
        ELSE 'Unknown'
    END as expected_owner,
    staff_number,
    email
FROM public.staff 
WHERE staff_number IN ('1234567890', '254575')
ORDER BY staff_number;

-- 3. Fix the staff data integrity issue
SELECT '=== FIXING STAFF DATA INTEGRITY ===' as info;

-- First, let's see what the correct assignments should be
-- Based on our previous debugging, 1234567890 should be Adham and 254575 should be Shaheen

-- Update the staff assignments to fix the data integrity
UPDATE public.staff 
SET email = 'adham181101@gmail.com'
WHERE staff_number = '1234567890';

UPDATE public.staff 
SET email = 'shaheenamin09@ba.com'
WHERE staff_number = '254575';

-- 4. Verify the fix
SELECT '=== STAFF DATA AFTER FIX ===' as info;
SELECT 
    id,
    staff_number,
    email,
    base_location,
    can_work_doubles
FROM public.staff 
WHERE staff_number IN ('1234567890', '254575')
ORDER BY staff_number;

-- 5. Now check the September 15th shifts
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

-- 6. Create the missing shift for Adham (staff_number 1234567890)
SELECT '=== CREATING SHIFT FOR ADHAM ===' as info;

DO $$
DECLARE
    adham_id UUID;
    shift_exists BOOLEAN;
BEGIN
    -- Get Adham's user ID (staff_number 1234567890)
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
        
        RAISE NOTICE 'Created shift for Adham (staff_number 1234567890) on 2025-09-15';
    ELSE
        RAISE NOTICE 'Adham already has a shift on 2025-09-15';
    END IF;
END $$;

-- 7. Final verification
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
