-- Fix script for duplicate emails and correct staff assignments
-- First, let's check what's in the database

-- 1. Check for duplicate emails
SELECT '=== CHECKING FOR DUPLICATE EMAILS ===' as info;
SELECT 
    email,
    COUNT(*) as count,
    STRING_AGG(staff_number, ', ') as staff_numbers,
    STRING_AGG(id::text, ', ') as user_ids
FROM public.staff 
WHERE email IN ('shaheenamin09@ba.com', 'adham.fati.el.hamzaouy@ba.com')
GROUP BY email
HAVING COUNT(*) > 1;

-- 2. Show all staff records for these emails
SELECT '=== ALL STAFF RECORDS FOR THESE EMAILS ===' as info;
SELECT 
    id,
    staff_number,
    email,
    base_location,
    can_work_doubles,
    created_at
FROM public.staff 
WHERE email IN ('shaheenamin09@ba.com', 'adham.fati.el.hamzaouy@ba.com')
ORDER BY email, staff_number;

-- 3. Show all staff records for the staff numbers we're working with
SELECT '=== ALL STAFF RECORDS FOR STAFF NUMBERS ===' as info;
SELECT 
    id,
    staff_number,
    email,
    base_location,
    can_work_doubles,
    created_at
FROM public.staff 
WHERE staff_number IN ('1234567890', '254575')
ORDER BY staff_number;

-- 4. Check which staff records have shifts
SELECT '=== STAFF RECORDS WITH SHIFTS ===' as info;
SELECT DISTINCT
    st.id,
    st.staff_number,
    st.email,
    COUNT(s.id) as shift_count
FROM public.staff st
LEFT JOIN public.shifts s ON st.id = s.staff_id
WHERE st.staff_number IN ('1234567890', '254575')
GROUP BY st.id, st.staff_number, st.email
ORDER BY st.staff_number;

-- 5. Check September 15th shifts
SELECT '=== SEPTEMBER 15TH SHIFTS ===' as info;
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

-- 6. Create the missing shift for Adham (staff_number 254575) without updating emails
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

-- 7. Final verification - Adham's shifts
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
