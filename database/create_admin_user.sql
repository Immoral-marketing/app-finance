-- Enable pgcrypto if not already enabled
create extension if not exists "pgcrypto";

-- Insert a new user into auth.users provided they don't already exist
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) 
SELECT 
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'admin@immoral.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@immoral.com'
);

-- Ensure the user identity is also created
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  id, -- Use user_id as identity id for simplicity in this script
  id,
  format('{"sub": "%s", "email": "%s"}', id::text, email)::jsonb,
  'email',
  id::text, -- provider_id is the user id for email provider
  now(),
  now(),
  now()
FROM auth.users
WHERE email = 'admin@immoral.com'
AND NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = auth.users.id
);
