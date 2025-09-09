-- Fix shifts with dates in DD/MM/YYYY format to YYYY-MM-DD format
-- This will convert dates like "15/11/2024" to "2024-11-15"

UPDATE public.shifts 
SET date = 
  CASE 
    WHEN date ~ '^\d{2}/\d{2}/\d{4}$' THEN
      -- Convert DD/MM/YYYY to YYYY-MM-DD
      CONCAT(
        SUBSTRING(date, 7, 4),  -- Year (YYYY)
        '-',
        SUBSTRING(date, 4, 2),  -- Month (MM)
        '-',
        SUBSTRING(date, 1, 2)   -- Day (DD)
      )
    ELSE date  -- Keep as is if already in correct format
  END
WHERE date ~ '^\d{2}/\d{2}/\d{4}$';

-- Show the results
SELECT 
  COUNT(*) as total_shifts,
  COUNT(CASE WHEN date ~ '^\d{4}-\d{2}-\d{2}$' THEN 1 END) as correct_format,
  COUNT(CASE WHEN date ~ '^\d{2}/\d{2}/\d{4}$' THEN 1 END) as wrong_format
FROM public.shifts;
