-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  industry TEXT NOT NULL,
  email_domain TEXT NOT NULL UNIQUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read companies for signup
CREATE POLICY "Companies are viewable by everyone" 
ON public.companies 
FOR SELECT 
USING (true);

-- Add company_id to staff table
ALTER TABLE public.staff 
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Insert default companies
INSERT INTO public.companies (name, industry, email_domain, config) VALUES 
('British Airways', 'Aviation', 'ba.com', '{"bases": ["Iberia CER", "BA CER", "Iberia & BA CER", "Iberia IOL", "Iberia IGL", "Baggage For BA", "Drivers For BA"], "features": {"premium_calculator": true, "shift_swapping": true}}'),
('American Airlines', 'Aviation', 'aa.com', '{"bases": ["DFW Hub", "LAX Hub", "MIA Hub", "PHX Hub", "CLT Hub"], "features": {"shift_swapping": true}}'),
('Delta Air Lines', 'Aviation', 'delta.com', '{"bases": ["ATL Hub", "DTW Hub", "LAX Hub", "MSP Hub", "SEA Hub"], "features": {"shift_swapping": true}}'),
('FedEx Express', 'Logistics', 'fedex.com', '{"bases": ["MEM Hub", "IND Hub", "OAK Hub", "CDG Hub"], "features": {"shift_swapping": true}}'),
('UPS', 'Logistics', 'ups.com', '{"bases": ["Louisville Hub", "Philadelphia Hub", "Ontario Hub", "Chicago Hub"], "features": {"shift_swapping": true}}');

-- Update existing staff to be associated with British Airways
UPDATE public.staff 
SET company_id = (SELECT id FROM public.companies WHERE email_domain = 'ba.com')
WHERE company_id IS NULL;

-- Make company_id required for new records
ALTER TABLE public.staff 
ALTER COLUMN company_id SET NOT NULL;

-- Create trigger for companies updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the user creation trigger to handle company_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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