-- Fix: Add missing 'email' column to user_profiles
-- Run this in Supabase SQL Editor

-- Add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN email VARCHAR(255);
    END IF;
END $$;

-- Populate email from auth.users for existing profiles
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id AND up.email IS NULL;

-- Also ensure the admin profile exists
INSERT INTO user_profiles (id, display_name, email, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Admin'), email, 'superadmin'
FROM auth.users
LIMIT 1
ON CONFLICT (id) DO UPDATE SET 
  role = 'superadmin',
  email = EXCLUDED.email;

-- Insert all module permissions for the admin
INSERT INTO user_permissions (user_id, module, can_view, can_edit)
SELECT up.id, m.module, true, true
FROM user_profiles up
CROSS JOIN (
  VALUES 
    ('dashboard'), ('billing'), ('media_investment'), ('payrolls'),
    ('payments'), ('commissions'), ('pl_matrix'), ('departamentos'),
    ('clients'), ('settings'), ('user_management')
) AS m(module)
WHERE up.role = 'superadmin'
ON CONFLICT (user_id, module) DO NOTHING;
