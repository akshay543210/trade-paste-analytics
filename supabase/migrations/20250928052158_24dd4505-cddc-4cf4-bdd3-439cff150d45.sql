-- Create trading sessions reference table
CREATE TABLE public.trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default trading sessions
INSERT INTO public.trading_sessions (name, start_time, end_time, timezone) VALUES
('Asia', '00:00:00', '09:00:00', 'UTC'),
('London', '08:00:00', '16:00:00', 'UTC'),
('New York', '13:00:00', '22:00:00', 'UTC');

-- Create instruments/pairs reference table
CREATE TABLE public.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'forex',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert common forex pairs and indices
INSERT INTO public.instruments (symbol, name, category) VALUES
('EURUSD', 'Euro/US Dollar', 'forex'),
('GBPUSD', 'British Pound/US Dollar', 'forex'),
('USDJPY', 'US Dollar/Japanese Yen', 'forex'),
('AUDUSD', 'Australian Dollar/US Dollar', 'forex'),
('USDCAD', 'US Dollar/Canadian Dollar', 'forex'),
('NZDUSD', 'New Zealand Dollar/US Dollar', 'forex'),
('EURGBP', 'Euro/British Pound', 'forex'),
('EURJPY', 'Euro/Japanese Yen', 'forex'),
('GBPJPY', 'British Pound/Japanese Yen', 'forex'),
('XAUUSD', 'Gold/US Dollar', 'commodities'),
('US30', 'Dow Jones Industrial Average', 'indices'),
('SPX500', 'S&P 500', 'indices'),
('NAS100', 'NASDAQ 100', 'indices');

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create trades table
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  session_id UUID REFERENCES public.trading_sessions(id),
  trade_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  setup TEXT,
  entry_price DECIMAL(10,5),
  exit_price DECIMAL(10,5),
  risk DECIMAL(10,2),
  reward DECIMAL(10,2),
  risk_reward_ratio DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN risk > 0 AND reward IS NOT NULL THEN reward / risk 
      ELSE NULL 
    END
  ) STORED,
  outcome TEXT NOT NULL CHECK (outcome IN ('Win', 'Loss', 'BE')),
  notes TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create trades policies
CREATE POLICY "Users can view their own trades" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" ON public.trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades" ON public.trades
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for trade screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('trade-screenshots', 'trade-screenshots', false);

-- Create storage policies for trade screenshots
CREATE POLICY "Users can upload their own screenshots" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trade-screenshots' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own screenshots" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trade-screenshots' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own screenshots" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'trade-screenshots' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own screenshots" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'trade-screenshots' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );