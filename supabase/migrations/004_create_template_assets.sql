CREATE TABLE IF NOT EXISTS template_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'stamp', 'signature')),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT DEFAULT 'image/png',
  extraction_method TEXT DEFAULT 'gpt4o' CHECK (extraction_method IN ('gpt4o', 'manual', 'auto')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

