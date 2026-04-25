CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES invoice_templates(id) ON DELETE CASCADE,
  template_variable TEXT NOT NULL,
  source_field TEXT NOT NULL,
  field_category TEXT NOT NULL CHECK (field_category IN ('buyer', 'seller', 'bank', 'document', 'delivery', 'shipper', 'items')),
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  transform_function TEXT CHECK (transform_function IN ('formatDate', 'formatCurrency', 'uppercase', 'lowercase', 'trim', NULL)),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, template_variable)
);

