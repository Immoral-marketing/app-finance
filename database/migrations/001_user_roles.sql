-- ================================================
-- MIGRATION: User Profiles & Permissions
-- ================================================

-- Enable UUID extension (should already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles: extends auth.users with app-specific data
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('superadmin', 'dept_head', 'user')),
  department_code VARCHAR(20),  -- for dept_head: which dept they manage (e.g. 'IMMED', 'IMCONT', 'IMMOR')
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Module-level permissions per user
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  UNIQUE(user_id, module)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_dept ON user_profiles(department_code);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Superadmins can view all profiles
CREATE POLICY "Superadmins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Superadmins can insert/update/delete profiles
CREATE POLICY "Superadmins can manage profiles"
  ON user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Permissions: users can read their own permissions
CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  USING (user_id = auth.uid());

-- Superadmins can manage all permissions
CREATE POLICY "Superadmins can manage permissions"
  ON user_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed: Create profile for existing admin user
INSERT INTO user_profiles (id, display_name, email, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Admin'), email, 'superadmin'
FROM auth.users
WHERE email = 'admin@immoral.com'
ON CONFLICT (id) DO NOTHING;

-- Seed: Give superadmin all module permissions
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
