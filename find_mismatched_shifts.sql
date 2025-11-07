-- Find why shifts aren't matching - check staff_id mismatches

-- Check all shifts and their staff_id
SELECT 
    'All shifts breakdown' as step,
    staff_id,
    COUNT(*) as shift_count,
    MIN(date) as earliest,
    MAX(date) as latest
FROM public.shifts
GROUP BY staff_id
ORDER BY shift_count DESC;

-- Get your current staff ID
SELECT 
    'Your current staff ID' as step,
    id as staff_id,
    email
FROM public.staff
WHERE email = 'adham.fati.el.hamzaouy@ba.com';

-- Check what staff_id values exist in shifts
SELECT 
    'Staff IDs in shifts table' as step,
    staff_id,
    COUNT(*) as count
FROM public.shifts
GROUP BY staff_id;

-- Check if there's a mismatch between your staff_id and the shifts
SELECT 
    'Checking for staff_id mismatch' as step,
    COUNT(*) as shifts_with_your_id
FROM public.shifts
WHERE staff_id IN (
    SELECT id FROM public.staff WHERE email = 'adham.fati.el.hamzaouy@ba.com'
);

-- Find all shifts and their associated email (if they have one)
SELECT 
    'Shifts with staff details' as step,
    s.staff_id,
    s.date,
    s.time,
    st.email as staff_email,
    st.staff_number
FROM public.shifts s
LEFT JOIN public.staff st ON st.id = s.staff_id
ORDER BY s.date DESC
LIMIT 20;
