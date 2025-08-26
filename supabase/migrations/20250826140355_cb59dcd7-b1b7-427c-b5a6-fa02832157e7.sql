-- Fix search path for security functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix search path for user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Get company_id based on email domain
  SELECT id INTO user_company_id 
  FROM public.companies 
  WHERE email_domain = split_part(NEW.email, '@', 2);
  
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