-- Create user profiles table to store additional user information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create OTP verification table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for user_profiles - users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Enable RLS on otp_verifications
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy for otp_verifications - only allow service role access
CREATE POLICY "Service role can manage OTP" ON otp_verifications
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_verifications 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate and store OTP
CREATE OR REPLACE FUNCTION generate_otp(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  otp_code TEXT;
BEGIN
  -- Generate 6-digit OTP
  otp_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Clean up any existing OTPs for this email
  DELETE FROM otp_verifications WHERE email = user_email;
  
  -- Insert new OTP with 10 minute expiry
  INSERT INTO otp_verifications (email, otp_code, expires_at)
  VALUES (user_email, otp_code, NOW() + INTERVAL '10 minutes');
  
  RETURN otp_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify OTP
CREATE OR REPLACE FUNCTION verify_otp(user_email TEXT, provided_otp TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN := FALSE;
BEGIN
  -- Check if OTP exists and is valid
  SELECT EXISTS(
    SELECT 1 FROM otp_verifications 
    WHERE email = user_email 
    AND otp_code = provided_otp 
    AND expires_at > NOW() 
    AND verified = FALSE
  ) INTO is_valid;
  
  -- If valid, mark as verified
  IF is_valid THEN
    UPDATE otp_verifications 
    SET verified = TRUE 
    WHERE email = user_email AND otp_code = provided_otp;
  END IF;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
