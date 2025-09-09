-- Check for shifts with dates in DD/MM/YYYY format (should be YYYY-MM-DD)
SELECT 
    s.id,
    s.date,
    s.time,
    st.email,
    st.staff_number,
    CASE 
        WHEN s.date ~ '^\d{2}/\d{2}/\d{4}$' THEN 'DD/MM/YYYY format (WRONG)'
        WHEN s.date ~ '^\d{4}-\d{2}-\d{2}$' THEN 'YYYY-MM-DD format (CORRECT)'
        ELSE 'Unknown format'
    END as date_format
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'adham@ba.com'
ORDER BY s.date
LIMIT 50;
