-- Create staff table for user profiles
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  staff_number TEXT NOT NULL UNIQUE,
  base_location TEXT NOT NULL,
  can_work_doubles BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shifts table
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  is_swapped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create swap_requests table
CREATE TABLE public.swap_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  requester_shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  repay_date TEXT,
  accepter_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  accepter_shift_id UUID REFERENCES public.shifts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'canceled')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for staff table
CREATE POLICY "Users can view their own profile" 
ON public.staff 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.staff 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.staff 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create policies for shifts table
CREATE POLICY "Users can view their own shifts" 
ON public.shifts 
FOR SELECT 
USING (auth.uid() = staff_id);

CREATE POLICY "Users can insert their own shifts" 
ON public.shifts 
FOR INSERT 
WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Users can update their own shifts" 
ON public.shifts 
FOR UPDATE 
USING (auth.uid() = staff_id);

CREATE POLICY "Users can delete their own shifts" 
ON public.shifts 
FOR DELETE 
USING (auth.uid() = staff_id);

-- Create policies for swap_requests table
CREATE POLICY "Users can view requests they created or that involve them" 
ON public.swap_requests 
FOR SELECT 
USING (
  auth.uid() = requester_id OR 
  auth.uid() = accepter_id OR
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND base_location = (
      SELECT base_location FROM public.staff WHERE id = requester_id
    )
  )
);

CREATE POLICY "Users can insert their own requests" 
ON public.swap_requests 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update requests they created or are accepting" 
ON public.swap_requests 
FOR UPDATE 
USING (auth.uid() = requester_id OR auth.uid() = accepter_id);