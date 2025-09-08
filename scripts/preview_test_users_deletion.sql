-- Preview what will be deleted before actually deleting
-- Run this first to see exactly what will be removed

-- Show all test users that will be deleted
SELECT 
  'TEST USERS TO BE DELETED:' as action,
  s.id,
  s.staff_number,
  s.email,
  s.base_location,
  s.created_at
FROM public.staff s
WHERE s.staff_number IN (
  '123001', '123002', '123003', '123004', '123005', '1234567890'
)
ORDER BY s.created_at;

-- Show shifts that will be deleted
SELECT 
  'SHIFTS TO BE DELETED:' as action,
  COUNT(*) as shift_count,
  s.staff_number,
  s.email
FROM public.shifts sh
JOIN public.staff s ON sh.staff_id = s.id
WHERE s.staff_number IN (
  '123001', '123002', '123003', '123004', '123005', '1234567890'
)
GROUP BY s.staff_number, s.email
ORDER BY s.staff_number;

-- Show swap requests that will be deleted
SELECT 
  'SWAP REQUESTS TO BE DELETED:' as action,
  COUNT(*) as swap_count
FROM public.swap_requests sr
WHERE sr.requester_id IN (
  SELECT id FROM public.staff 
  WHERE staff_number IN (
    '123001', '123002', '123003', '123004', '123005', '1234567890'
  )
) OR sr.accepter_id IN (
  SELECT id FROM public.staff 
  WHERE staff_number IN (
    '123001', '123002', '123003', '123004', '123005', '1234567890'
  )
);

-- Show your main account (should be preserved)
SELECT 
  'YOUR MAIN ACCOUNT (WILL BE PRESERVED):' as action,
  s.id,
  s.staff_number,
  s.email,
  s.base_location,
  s.created_at
FROM public.staff s
WHERE s.staff_number NOT IN (
  '123001', '123002', '123003', '123004', '123005', '1234567890'
)
ORDER BY s.created_at;
