-- Check current date formats in the shifts table
SELECT 
  date,
  time,
  CASE 
    WHEN date ~ '^\d{2}/\d{2}/\d{4}$' THEN 'DD/MM/YYYY (WRONG)'
    WHEN date ~ '^\d{4}-\d{2}-\d{2}$' THEN 'YYYY-MM-DD (CORRECT)'
    ELSE 'UNKNOWN FORMAT'
  END as format_type
FROM public.shifts 
WHERE staff_id IN (
  SELECT id FROM public.staff WHERE email = 'adham@ba.com'
)
ORDER BY date
LIMIT 20;
