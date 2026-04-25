CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  html_template TEXT NOT NULL,
  css_styles TEXT,
  variables_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  document_type TEXT DEFAULT 'invoice' CHECK (document_type IN ('invoice', 'proforma', 'commercial_invoice')),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  original_document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_template_per_supplier
  ON invoice_templates (supplier_id)
  WHERE is_active = true;

