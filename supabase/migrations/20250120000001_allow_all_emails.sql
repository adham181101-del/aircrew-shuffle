-- Temporarily allow all email domains by modifying the user creation trigger
-- This will use the company_id from user metadata instead of deriving it from email domain

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- TEMPORARILY: Use company_id from user metadata instead of email domain
  -- This allows any email domain to be used for testing
  user_company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;
  
  -- Fallback: If no company_id in metadata, try to get it from email domain
  IF user_company_id IS NULL THEN
    SELECT id INTO user_company_id 
    FROM public.companies 
    WHERE email_domain = split_part(NEW.email, '@', 2);
  END IF;
  
  -- Final fallback: Use British Airways as default
  IF user_company_id IS NULL THEN
    SELECT id INTO user_company_id 
    FROM public.companies 
    WHERE email_domain = 'ba.com';
  END IF;
  
  INSERT INTO public.staff (id, email, staff_number, base_location, can_work_doubles, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'staff_number',
    NEW.raw_user_meta_data->>'base_location',
    COALESCE((NEW.raw_user_meta_data->>'can_work_doubles')::boolean, false),
    user_company_id
  );
  RETURN NEW;
END;
$$;
