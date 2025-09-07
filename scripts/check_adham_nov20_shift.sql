-- Check Adham's shift on November 20th and trace the swap
-- This script will help identify who the shift came from

-- 1. First, let's find Adham's user details
SELECT '=== ADHAM USER DETAILS ===' as info;
SELECT 
    id,
    email,
    staff_number,
    base_location,
    created_at
FROM public.staff 
WHERE email LIKE '%adham%' OR staff_number LIKE '%254575%';

-- 2. Check all shifts for Adham on November 20th (both 2024 and 2025)
SELECT '=== ADHAM NOVEMBER 20TH SHIFTS ===' as info;
SELECT 
    s.id as shift_id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at,
    st.email as staff_email,
    st.staff_number
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email LIKE '%adham%' 
AND (
    s.date = '2024-11-20' OR s.date = '2025-11-20' OR 
    s.date::text LIKE '%11-20%' OR 
    s.date::text LIKE '%Nov-20%' OR 
    s.date::text LIKE '%20-Nov%'
);

-- 3. Check all swap requests involving Adham
SELECT '=== ALL SWAP REQUESTS INVOLVING ADHAM ===' as info;
SELECT 
    sr.id as swap_request_id,
    sr.status,
    sr.created_at,
    sr.message,
    -- Requester details
    rs.email as requester_email,
    rs.staff_number as requester_staff_number,
    rs_shift.date as requester_shift_date,
    rs_shift.time as requester_shift_time,
    -- Accepter details
    acs.email as accepter_email,
    acs.staff_number as accepter_staff_number,
    acs_shift.date as accepter_shift_date,
    acs_shift.time as accepter_shift_time,
    -- Counter offer details
    sr.counter_offer_date
FROM public.swap_requests sr
LEFT JOIN public.staff rs ON sr.requester_id = rs.id
LEFT JOIN public.shifts rs_shift ON sr.requester_shift_id = rs_shift.id
LEFT JOIN public.staff acs ON sr.accepter_id = acs.id
LEFT JOIN public.shifts acs_shift ON sr.accepter_shift_id = acs_shift.id
WHERE rs.email LIKE '%adham%' OR acs.email LIKE '%adham%'
ORDER BY sr.created_at DESC;

-- 4. Check specifically for November 20th in swap requests
SELECT '=== NOVEMBER 20TH SWAP REQUESTS ===' as info;
SELECT 
    sr.id as swap_request_id,
    sr.status,
    sr.created_at,
    -- Requester details
    rs.email as requester_email,
    rs_shift.date as requester_shift_date,
    rs_shift.time as requester_shift_time,
    -- Accepter details
    acs.email as accepter_email,
    acs_shift.date as accepter_shift_date,
    acs_shift.time as accepter_shift_time,
    -- Counter offer details
    sr.counter_offer_date
FROM public.swap_requests sr
LEFT JOIN public.staff rs ON sr.requester_id = rs.id
LEFT JOIN public.shifts rs_shift ON sr.requester_shift_id = rs_shift.id
LEFT JOIN public.staff acs ON sr.accepter_id = acs.id
LEFT JOIN public.shifts acs_shift ON sr.accepter_shift_id = acs_shift.id
WHERE (
    rs_shift.date = '2024-11-20' OR rs_shift.date = '2025-11-20' OR
    acs_shift.date = '2024-11-20' OR acs_shift.date = '2025-11-20' OR
    rs_shift.date::text LIKE '%11-20%' OR rs_shift.date::text LIKE '%Nov-20%' OR rs_shift.date::text LIKE '%20-Nov%'
    OR acs_shift.date::text LIKE '%11-20%' OR acs_shift.date::text LIKE '%Nov-20%' OR acs_shift.date::text LIKE '%20-Nov%'
    OR sr.counter_offer_date LIKE '%11-20%' OR sr.counter_offer_date LIKE '%Nov-20%' OR sr.counter_offer_date LIKE '%20-Nov%'
)
ORDER BY sr.created_at DESC;

-- 5. Check all shifts on November 20th to see who might have swapped with Adham
SELECT '=== ALL SHIFTS ON NOVEMBER 20TH ===' as info;
SELECT 
    s.id as shift_id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at,
    st.email as staff_email,
    st.staff_number,
    st.base_location
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE s.date = '2024-11-20' OR s.date = '2025-11-20' OR 
      s.date::text LIKE '%11-20%' OR s.date::text LIKE '%Nov-20%' OR s.date::text LIKE '%20-Nov%'
ORDER BY s.time, st.email;

-- 6. Check for any shifts that were created recently (might be from swaps)
SELECT '=== RECENTLY CREATED SHIFTS (LAST 30 DAYS) ===' as info;
SELECT 
    s.id as shift_id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at,
    st.email as staff_email,
    st.staff_number
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE s.created_at >= NOW() - INTERVAL '30 days'
ORDER BY s.created_at DESC;
