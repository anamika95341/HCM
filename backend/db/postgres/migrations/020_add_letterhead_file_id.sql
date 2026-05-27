ALTER TABLE grievances
  ADD COLUMN IF NOT EXISTS letterhead_file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL;
