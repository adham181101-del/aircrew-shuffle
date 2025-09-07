-- Identify and fix shifts that were affected by the counter-offer allocation bug
-- This script will help identify shifts that don't have proper ownership

-- 1. Find shifts that are marked as swapped but don't have corresponding swap requests
SELECT '=== ORPHANED SWAPPED SHIFTS ===' as info;
SELECT 
    s.id as shift_id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at,
    st.email as staff_email,
    st.staff_number,
    'No corresponding swap request found' as issue
FROM shifts s
JOIN staff st ON s.staff_id = st.id
WHERE s.is_swapped = true
AND NOT EXISTS (
    SELECT 1 FROM swap_requests sr 
    WHERE sr.status = 'accepted' 
    AND (
        sr.requester_shift_id = s.id 
        OR sr.accepter_shift_id = s.id
        OR (sr.counter_offer_date = s.date::text AND sr.accepter_id = s.staff_id)
    )
)
ORDER BY s.created_at DESC;

-- 2. Find shifts on the same date with the same time but different staff (potential duplicates)
SELECT '=== POTENTIAL DUPLICATE SHIFTS ===' as info;
SELECT 
    s1.date,
    s1.time,
    s1.id as shift1_id,
    st1.email as staff1_email,
    s1.created_at as shift1_created,
    s2.id as shift2_id,
    st2.email as staff2_email,
    s2.created_at as shift2_created,
    'Same date/time, different staff' as issue
FROM shifts s1
JOIN staff st1 ON s1.staff_id = st1.id
JOIN shifts s2 ON s1.date = s2.date AND s1.time = s2.time AND s1.id < s2.id
JOIN staff st2 ON s2.staff_id = st2.id
WHERE s1.is_swapped = true OR s2.is_swapped = true
ORDER BY s1.date, s1.time;

-- 3. Find shifts that were created recently (last 30 days) and are marked as swapped
SELECT '=== RECENT SWAPPED SHIFTS ===' as info;
SELECT 
    s.id as shift_id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at,
    st.email as staff_email,
    st.staff_number,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM swap_requests sr 
            WHERE sr.status = 'accepted' 
            AND sr.requester_shift_id = s.id
        ) THEN 'Requester shift from accepted swap'
        WHEN EXISTS (
            SELECT 1 FROM swap_requests sr 
            WHERE sr.status = 'accepted' 
            AND sr.accepter_shift_id = s.id
        ) THEN 'Accepter shift from accepted swap'
        WHEN EXISTS (
            SELECT 1 FROM swap_requests sr 
            WHERE sr.status = 'accepted' 
            AND sr.counter_offer_date = s.date::text 
            AND sr.accepter_id = s.staff_id
        ) THEN 'Counter-offer shift from accepted swap'
        ELSE 'No matching swap request found'
    END as swap_status
FROM shifts s
JOIN staff st ON s.staff_id = st.id
WHERE s.is_swapped = true
AND s.created_at >= NOW() - INTERVAL '30 days'
ORDER BY s.created_at DESC;

-- 4. Check for shifts on November 20th specifically
SELECT '=== NOVEMBER 20TH SHIFTS ANALYSIS ===' as info;
SELECT 
    s.id as shift_id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at,
    st.email as staff_email,
    st.staff_number,
    CASE 
        WHEN s.is_swapped = true THEN 'Swapped shift'
        ELSE 'Original shift'
    END as shift_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM swap_requests sr 
            WHERE sr.status = 'accepted' 
            AND (
                sr.requester_shift_id = s.id 
                OR sr.accepter_shift_id = s.id
                OR (sr.counter_offer_date = s.date::text AND sr.accepter_id = s.staff_id)
            )
        ) THEN 'Has matching swap request'
        ELSE 'No matching swap request'
    END as swap_validation
FROM shifts s
JOIN staff st ON s.staff_id = st.id
WHERE s.date = '2024-11-20' OR s.date = '2025-11-20'
ORDER BY s.time, st.email;

-- 5. Find all accepted swap requests to understand the swap history
SELECT '=== ACCEPTED SWAP REQUESTS ===' as info;
SELECT 
    sr.id as swap_request_id,
    sr.status,
    sr.created_at,
    sr.counter_offer_date,
    -- Requester details
    rs.email as requester_email,
    rs_shift.date as requester_shift_date,
    rs_shift.time as requester_shift_time,
    -- Accepter details
    acs.email as accepter_email,
    acs_shift.date as accepter_shift_date,
    acs_shift.time as accepter_shift_time
FROM swap_requests sr
LEFT JOIN staff rs ON sr.requester_id = rs.id
LEFT JOIN shifts rs_shift ON sr.requester_shift_id = rs_shift.id
LEFT JOIN staff acs ON sr.accepter_id = acs.id
LEFT JOIN shifts acs_shift ON sr.accepter_shift_id = acs_shift.id
WHERE sr.status = 'accepted'
ORDER BY sr.created_at DESC;

-- 6. Function to clean up orphaned shifts (use with caution)
CREATE OR REPLACE FUNCTION cleanup_orphaned_swapped_shifts()
RETURNS TABLE(
    cleaned_shift_id UUID,
    cleaned_date DATE,
    cleaned_time TEXT,
    cleaned_staff_email TEXT,
    action_taken TEXT
) AS $$
DECLARE
    shift_record RECORD;
BEGIN
    -- Find and clean up orphaned swapped shifts
    FOR shift_record IN 
        SELECT s.id, s.date, s.time, st.email
        FROM shifts s
        JOIN staff st ON s.staff_id = st.id
        WHERE s.is_swapped = true
        AND NOT EXISTS (
            SELECT 1 FROM swap_requests sr 
            WHERE sr.status = 'accepted' 
            AND (
                sr.requester_shift_id = s.id 
                OR sr.accepter_shift_id = s.id
                OR (sr.counter_offer_date = s.date::text AND sr.accepter_id = s.staff_id)
            )
        )
        AND s.created_at >= NOW() - INTERVAL '30 days' -- Only clean recent shifts
    LOOP
        -- Delete the orphaned shift
        DELETE FROM shifts WHERE id = shift_record.id;
        
        -- Return the cleaned shift info
        cleaned_shift_id := shift_record.id;
        cleaned_date := shift_record.date;
        cleaned_time := shift_record.time;
        cleaned_staff_email := shift_record.email;
        action_taken := 'Deleted orphaned swapped shift';
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Note: The cleanup function is created but not executed automatically
-- To run it, use: SELECT * FROM cleanup_orphaned_swapped_shifts();
-- Use with caution as it will delete shifts!
