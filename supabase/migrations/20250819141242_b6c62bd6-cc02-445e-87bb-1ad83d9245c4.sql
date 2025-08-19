-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff (id, email, staff_number, base_location, can_work_doubles)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'staff_number',
    NEW.raw_user_meta_data->>'base_location',
    COALESCE((NEW.raw_user_meta_data->>'can_work_doubles')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create staff profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();