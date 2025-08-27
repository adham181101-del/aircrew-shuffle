-- Fix and debug the handle_new_user trigger
-- Add better error handling and logging

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  email_domain TEXT;
BEGIN
  -- Log the incoming data for debugging
  RAISE NOTICE 'handle_new_user: Processing user % with email %', NEW.id, NEW.email;
  RAISE NOTICE 'handle_new_user: Raw metadata: %', NEW.raw_user_meta_data;
  
  -- Extract email domain
  email_domain := split_part(NEW.email, '@', 2);
  RAISE NOTICE 'handle_new_user: Email domain: %', email_domain;
  
  -- Try to get company_id from user metadata first
  IF NEW.raw_user_meta_data ? 'company_id' THEN
    user_company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;
    RAISE NOTICE 'handle_new_user: Using company_id from metadata: %', user_company_id;
  END IF;
  
  -- Fallback: If no company_id in metadata, try to get it from email domain
  IF user_company_id IS NULL THEN
    SELECT id INTO user_company_id 
    FROM public.companies 
    WHERE email_domain = email_domain;
    RAISE NOTICE 'handle_new_user: Using company_id from email domain: %', user_company_id;
  END IF;
  
  -- Final fallback: Use British Airways as default
  IF user_company_id IS NULL THEN
    SELECT id INTO user_company_id 
    FROM public.companies 
    WHERE email_domain = 'ba.com';
    RAISE NOTICE 'handle_new_user: Using default company_id (BA): %', user_company_id;
  END IF;
  
  -- Ensure we have a valid company_id
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No valid company found for user %', NEW.email;
  END IF;
  
  -- Insert the staff record
  INSERT INTO public.staff (id, email, staff_number, base_location, can_work_doubles, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'staff_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'base_location', ''),
    COALESCE((NEW.raw_user_meta_data->>'can_work_doubles')::boolean, false),
    user_company_id
  );
  
  RAISE NOTICE 'handle_new_user: Successfully created staff record for user %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in handle_new_user for user %: %', NEW.email, SQLERRM;
END;
$$;
