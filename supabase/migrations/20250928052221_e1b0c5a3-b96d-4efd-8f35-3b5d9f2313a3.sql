-- Fix security issues from linter

-- Enable RLS on reference tables
ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- Create policies for trading_sessions (read-only for authenticated users)
CREATE POLICY "Anyone can view trading sessions" ON public.trading_sessions
  FOR SELECT TO authenticated USING (true);

-- Create policies for instruments (read-only for authenticated users)  
CREATE POLICY "Anyone can view instruments" ON public.instruments
  FOR SELECT TO authenticated USING (true);

-- Update functions to include proper search_path for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;