-- Focused debug script for September 15th swap issue
-- This will get the specific information we need

-- 1. Get the specific accepted swap details (expanded columns)
SELECT '=== ACCEPTED SWAP DETAILS ===' as info;
SELECT 
    sr.id,
    sr.status,
    sr.created_at,
    sr.counter_offer_date,
    rs.staff_number as requester_staff,
    acs.staff_number as accepter_staff,
    rshift.date as requester_shift_date,
    rshift.time as requester_shift_time,
    ashift.date as accepter_shift_date,
    ashift.time as accepter_shift_time
FROM public.swap_requests sr
LEFT JOIN public.staff rs ON sr.requester_id = rs.id
LEFT JOIN public.staff acs ON sr.accepter_id = acs.id
LEFT JOIN public.shifts rshift ON sr.requester_shift_id = rshift.id
LEFT JOIN public.shifts ashift ON sr.accepter_shift_id = ashift.id
WHERE sr.status = 'accepted'
AND (rs.staff_number = '1234567890' OR acs.staff_number = '1234567890')
ORDER BY sr.created_at DESC;

-- 2. Check Adham's shifts specifically
SELECT '=== ADHAM SHIFTS ===' as info;
SELECT 
    s.id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.staff_number = '1234567890'
ORDER BY s.date ASC;

-- 3. Check September 15th specifically
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
WHERE s.date = '2024-09-15'
ORDER BY st.staff_number;

-- 4. Check if any shifts were created recently (last 24 hours)
SELECT '=== RECENTLY CREATED SHIFTS ===' as info;
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
WHERE s.created_at > NOW() - INTERVAL '24 hours'
ORDER BY s.created_at DESC;

-- 5. Check the specific accepted swap request IDs we saw
SELECT '=== SPECIFIC ACCEPTED SWAPS ===' as info;
SELECT 
    sr.id,
    sr.status,
    sr.created_at,
    sr.counter_offer_date,
    rs.staff_number as requester_staff,
    acs.staff_number as accepter_staff,
    rshift.date as requester_shift_date,
    rshift.time as requester_shift_time
FROM public.swap_requests sr
LEFT JOIN public.staff rs ON sr.requester_id = rs.id
LEFT JOIN public.staff acs ON sr.accepter_id = acs.id
LEFT JOIN public.shifts rshift ON sr.requester_shift_id = rshift.id
WHERE sr.id IN ('6be437eb-204c-48d3-9a48-97c16366d0f6', '61ccb422-7377-4934-8b30-cb887ddeab09');
