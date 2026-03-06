-- pl_custom_rows: stores custom rows added by users in P&L Matrix
CREATE TABLE IF NOT EXISTS pl_custom_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('revenue', 'expense')),
  section_key VARCHAR(50) NOT NULL,
  dept VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(block_type, section_key, dept, item_name)
);

-- Enable RLS
ALTER TABLE pl_custom_rows ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write
CREATE POLICY "Allow all access to pl_custom_rows"
  ON pl_custom_rows FOR ALL
  USING (true)
  WITH CHECK (true);
