export type FieldCategory = 'buyer' | 'seller' | 'bank' | 'document' | 'delivery' | 'shipper' | 'items';

export interface FieldMappingInput {
  template_variable: string;
  source_field: string;
  field_category: FieldCategory;
  is_required?: boolean;
  default_value?: string | null;
  transform_function?: 'formatDate' | 'formatCurrency' | 'uppercase' | 'lowercase' | 'trim' | null;
  display_order?: number;
}

export const DEFAULT_MAPPINGS: FieldMappingInput[] = [
  { template_variable: 'buyer_name', source_field: 'Организация_Наименование', field_category: 'buyer', is_required: true, display_order: 1 },
  { template_variable: 'buyer_address', source_field: 'Организация_ЮрАдрес', field_category: 'buyer', is_required: true, display_order: 2 },
  { template_variable: 'buyer_vat', source_field: 'ИНН', field_category: 'buyer', is_required: true, display_order: 3 },
  { template_variable: 'buyer_phone', source_field: 'Организация_Телефон', field_category: 'buyer', is_required: false, display_order: 4 },
  { template_variable: 'buyer_email', source_field: 'Организация_EMAIL', field_category: 'buyer', is_required: false, display_order: 5 },

  { template_variable: 'seller_name', source_field: 'Контрагент_Наименование', field_category: 'seller', is_required: true, display_order: 1 },
  { template_variable: 'seller_address', source_field: 'Контрагент_ЮрАдрес', field_category: 'seller', is_required: true, display_order: 2 },

  { template_variable: 'beneficiary_name', source_field: 'Контрагент_Наименование', field_category: 'bank', is_required: true, display_order: 1 },
  { template_variable: 'account_number', source_field: 'Контрагент_IBAN', field_category: 'bank', is_required: true, display_order: 2 },
  { template_variable: 'bank_name', source_field: 'Контрагент_Bank', field_category: 'bank', is_required: true, display_order: 3 },
  { template_variable: 'swift_code', source_field: 'Контрагент_SWIFT', field_category: 'bank', is_required: true, display_order: 4 },
  { template_variable: 'bank_address', source_field: 'Контрагент_BankAddress', field_category: 'bank', is_required: false, display_order: 5 },

  { template_variable: 'invoice_number', source_field: 'ВходящийДокумент_Номер', field_category: 'document', is_required: true, display_order: 1 },
  { template_variable: 'invoice_date', source_field: 'ВходящийДокумент_Дата_Анг', field_category: 'document', is_required: true, transform_function: 'formatDate', display_order: 2 },
  { template_variable: 'total_amount', source_field: 'Итого_Сумма', field_category: 'document', is_required: true, transform_function: 'formatCurrency', display_order: 3 },
  { template_variable: 'currency', source_field: 'Валюта', field_category: 'document', is_required: true, display_order: 4 },
  { template_variable: 'payment_terms', source_field: 'Payment_terms', field_category: 'document', is_required: false, display_order: 5 },

  { template_variable: 'delivery_term', source_field: 'УсловиеПоставки', field_category: 'delivery', is_required: true, display_order: 1 },
  { template_variable: 'delivery_place', source_field: 'МестоПоставки_Анг', field_category: 'delivery', is_required: true, display_order: 2 },
  { template_variable: 'port_of_loading', source_field: 'POL', field_category: 'delivery', is_required: false, display_order: 3 },
  { template_variable: 'port_of_discharge', source_field: 'POD', field_category: 'delivery', is_required: false, display_order: 4 },
  { template_variable: 'bl_number', source_field: 'B/L No.', field_category: 'delivery', is_required: false, display_order: 5 },
  { template_variable: 'bl_date', source_field: 'ДатаКоносамента', field_category: 'delivery', is_required: false, transform_function: 'formatDate', display_order: 6 },
  { template_variable: 'container_number', source_field: 'Container No.', field_category: 'delivery', is_required: false, display_order: 7 },

  { template_variable: 'shipper', source_field: 'Отправитель', field_category: 'shipper', is_required: false, display_order: 1 },

  { template_variable: 'items[].description', source_field: 'Строка_НоменклатураНаименованиеПолноеАнг', field_category: 'items', is_required: true, display_order: 1 },
  { template_variable: 'items[].unit', source_field: 'Строка_ЕдИзмер_Анг', field_category: 'items', is_required: true, display_order: 2 },
  { template_variable: 'items[].quantity', source_field: 'Строка_Количество', field_category: 'items', is_required: true, display_order: 3 },
  { template_variable: 'items[].unit_price', source_field: 'Строка_Цена', field_category: 'items', is_required: true, transform_function: 'formatCurrency', display_order: 4 },
  { template_variable: 'items[].amount', source_field: 'Строка_Сумма', field_category: 'items', is_required: true, transform_function: 'formatCurrency', display_order: 5 },
  { template_variable: 'items[].country_of_origin', source_field: 'Строка_СтранаПроисхожденияНоменклатуры', field_category: 'items', is_required: false, display_order: 6 },
];

