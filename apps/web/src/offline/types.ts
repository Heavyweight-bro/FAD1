export type DocumentType = 'invoice' | 'proforma' | 'commercial_invoice';

export type FieldCategory = 'buyer' | 'seller' | 'bank' | 'document' | 'delivery' | 'shipper' | 'items';

export type TransformFn = 'formatDate' | 'formatCurrency' | 'uppercase' | 'lowercase' | 'trim' | null;

export type UUID = string;

export interface Supplier {
  id: UUID;
  name: string;
  country?: string | null;
  created_at: string;
}

export interface FieldMapping {
  id: UUID;
  template_variable: string;
  source_field: string;
  field_category: FieldCategory;
  is_required: boolean;
  default_value?: string | null;
  transform_function: TransformFn;
  display_order: number;
}

export interface InvoiceTemplate {
  id: UUID;
  supplier_id: UUID;
  name: string;
  document_type: DocumentType;
  html_template: string;
  css_styles?: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
  mappings: FieldMapping[];
  original_pdf_name?: string | null;
  original_pdf_url?: string | null;
}

