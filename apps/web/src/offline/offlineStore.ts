import { create } from 'zustand';
import type { FieldMapping, InvoiceTemplate, Supplier, UUID } from './types';
import { SAMPLE_TEMPLATE_HTML } from './sample-data';

function nowIso() {
  return new Date().toISOString();
}

function uid(): UUID {
  return crypto.randomUUID();
}

const DEFAULT_MAPPINGS: Omit<FieldMapping, 'id'>[] = [
  { template_variable: 'buyer_name', source_field: 'Организация_Наименование', field_category: 'buyer', is_required: true, transform_function: null, display_order: 1 },
  { template_variable: 'buyer_address', source_field: 'Организация_ЮрАдрес', field_category: 'buyer', is_required: true, transform_function: null, display_order: 2 },
  { template_variable: 'buyer_vat', source_field: 'ИНН', field_category: 'buyer', is_required: true, transform_function: null, display_order: 3 },

  { template_variable: 'seller_name', source_field: 'Контрагент_Наименование', field_category: 'seller', is_required: true, transform_function: null, display_order: 1 },
  { template_variable: 'seller_address', source_field: 'Контрагент_ЮрАдрес', field_category: 'seller', is_required: true, transform_function: null, display_order: 2 },

  { template_variable: 'bank_name', source_field: 'Контрагент_Bank', field_category: 'bank', is_required: true, transform_function: null, display_order: 1 },
  { template_variable: 'swift_code', source_field: 'Контрагент_SWIFT', field_category: 'bank', is_required: true, transform_function: null, display_order: 2 },
  { template_variable: 'account_number', source_field: 'Контрагент_IBAN', field_category: 'bank', is_required: true, transform_function: null, display_order: 3 },

  { template_variable: 'invoice_number', source_field: 'ВходящийДокумент_Номер', field_category: 'document', is_required: true, transform_function: null, display_order: 1 },
  { template_variable: 'invoice_date', source_field: 'ВходящийДокумент_Дата_Анг', field_category: 'document', is_required: true, transform_function: 'formatDate', display_order: 2 },
  { template_variable: 'total_amount', source_field: 'Итого_Сумма', field_category: 'document', is_required: true, transform_function: 'formatCurrency', display_order: 3 },
  { template_variable: 'currency', source_field: 'Валюта', field_category: 'document', is_required: true, transform_function: null, display_order: 4 },
  { template_variable: 'payment_terms', source_field: 'Payment_terms', field_category: 'document', is_required: false, transform_function: null, display_order: 5 },

  { template_variable: 'delivery_term', source_field: 'УсловиеПоставки', field_category: 'delivery', is_required: false, transform_function: null, display_order: 1 },
  { template_variable: 'delivery_place', source_field: 'МестоПоставки_Анг', field_category: 'delivery', is_required: false, transform_function: null, display_order: 2 },
  { template_variable: 'port_of_loading', source_field: 'POL', field_category: 'delivery', is_required: false, transform_function: null, display_order: 3 },
  { template_variable: 'port_of_discharge', source_field: 'POD', field_category: 'delivery', is_required: false, transform_function: null, display_order: 4 },
  { template_variable: 'bl_number', source_field: 'B/L No.', field_category: 'delivery', is_required: false, transform_function: null, display_order: 5 },
  { template_variable: 'container_number', source_field: 'Container No.', field_category: 'delivery', is_required: false, transform_function: null, display_order: 6 },

  { template_variable: 'items[].description', source_field: 'Строка_НоменклатураНаименованиеПолноеАнг', field_category: 'items', is_required: true, transform_function: null, display_order: 1 },
  { template_variable: 'items[].unit', source_field: 'Строка_ЕдИзмер_Анг', field_category: 'items', is_required: true, transform_function: null, display_order: 2 },
  { template_variable: 'items[].quantity', source_field: 'Строка_Количество', field_category: 'items', is_required: true, transform_function: null, display_order: 3 },
  { template_variable: 'items[].unit_price', source_field: 'Строка_Цена', field_category: 'items', is_required: true, transform_function: 'formatCurrency', display_order: 4 },
  { template_variable: 'items[].amount', source_field: 'Строка_Сумма', field_category: 'items', is_required: true, transform_function: 'formatCurrency', display_order: 5 },
];

type OfflineState = {
  suppliers: Supplier[];
  templates: InvoiceTemplate[];
  selectedTemplateId: UUID | null;
  createSupplier: (name: string, country?: string) => void;
  createTemplateForSupplier: (supplierId: UUID) => UUID;
  setSelectedTemplate: (templateId: UUID | null) => void;
  updateTemplate: (templateId: UUID, patch: Partial<Pick<InvoiceTemplate, 'name' | 'html_template' | 'css_styles'>>) => void;
  updateTemplateOriginalPdf: (templateId: UUID, info: { name: string; url: string }) => void;
  setMappings: (templateId: UUID, mappings: FieldMapping[]) => void;
  resetMappings: (templateId: UUID) => void;
};

const initialSupplierId = uid();
const initialTemplateId = uid();

export const useOfflineStore = create<OfflineState>((set, get) => ({
  suppliers: [{ id: initialSupplierId, name: 'Example Supplier', country: 'CN', created_at: nowIso() }],
  templates: [
    {
      id: initialTemplateId,
      supplier_id: initialSupplierId,
      name: 'Default Invoice Template',
      document_type: 'invoice',
      html_template: SAMPLE_TEMPLATE_HTML,
      css_styles: null,
      version: 1,
      is_active: true,
      created_at: nowIso(),
      mappings: DEFAULT_MAPPINGS.map((m) => ({ id: uid(), ...m })),
      original_pdf_name: null,
      original_pdf_url: null,
    },
  ],
  selectedTemplateId: initialTemplateId,

  createSupplier: (name, country) =>
    set((s) => ({
      suppliers: [{ id: uid(), name, country: country ?? null, created_at: nowIso() }, ...s.suppliers],
    })),

  createTemplateForSupplier: (supplierId) => {
    const id = uid();
    set((s) => ({
      templates: [
        {
          id,
          supplier_id: supplierId,
          name: 'New Template',
          document_type: 'invoice',
          html_template: SAMPLE_TEMPLATE_HTML,
          css_styles: null,
          version: 1,
          is_active: true,
          created_at: nowIso(),
          mappings: DEFAULT_MAPPINGS.map((m) => ({ id: uid(), ...m })),
          original_pdf_name: null,
          original_pdf_url: null,
        },
        ...s.templates,
      ],
      selectedTemplateId: id,
    }));
    return id;
  },

  setSelectedTemplate: (templateId) => set({ selectedTemplateId: templateId }),

  updateTemplate: (templateId, patch) =>
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === templateId
          ? { ...t, ...patch, version: t.version + 1 }
          : t,
      ),
    })),

  updateTemplateOriginalPdf: (templateId, info) =>
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === templateId ? { ...t, original_pdf_name: info.name, original_pdf_url: info.url } : t,
      ),
    })),

  setMappings: (templateId, mappings) =>
    set((s) => ({
      templates: s.templates.map((t) => (t.id === templateId ? { ...t, mappings } : t)),
    })),

  resetMappings: (templateId) => {
    const mappings = DEFAULT_MAPPINGS.map((m) => ({ id: uid(), ...m }));
    get().setMappings(templateId, mappings);
  },
}));

