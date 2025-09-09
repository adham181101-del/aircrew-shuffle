-- Check Adham's shifts and their date formats
SELECT 
    s.id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at,
    st.email,
    st.staff_number
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'adham@ba.com'
ORDER BY s.date, s.time
LIMIT 20;
