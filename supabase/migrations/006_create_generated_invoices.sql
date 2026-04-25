CREATE TABLE IF NOT EXISTS generated_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES invoice_templates(id),
  invoice_number TEXT NOT NULL,
  supplier_name TEXT,
  invoice_data JSONB NOT NULL,
  pdf_url TEXT,
  pdf_storage_path TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_invoices_status ON generated_invoices(status);
CREATE INDEX IF NOT EXISTS idx_generated_invoices_created ON generated_invoices(created_at DESC);

