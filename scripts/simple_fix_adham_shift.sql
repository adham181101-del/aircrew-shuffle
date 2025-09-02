-- Simple fix for Adham's September 15th shift
-- This script will fix the staff assignments and create the missing shift

-- 1. Fix staff assignments
UPDATE public.staff 
SET email = 'shaheenamin09@ba.com'
WHERE staff_number = '1234567890';

UPDATE public.staff 
SET email = 'adham.fati.el.hamzaouy@ba.com'
WHERE staff_number = '254575';

-- 2. Create shift for Adham on September 15th
INSERT INTO public.shifts (staff_id, date, time, is_swapped, created_at)
SELECT 
    st.id,
    '2025-09-15',
    '05:30-14:30',
    true,
    NOW()
FROM public.staff st
WHERE st.staff_number = '254575'
AND NOT EXISTS (
    SELECT 1 FROM public.shifts s 
    WHERE s.staff_id = st.id 
    AND s.date = '2025-09-15'
);

-- 3. Show the results
SELECT 'Staff assignments fixed and shift created for Adham' as result;
