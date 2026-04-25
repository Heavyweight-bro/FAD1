import Handlebars from 'npm:handlebars@4.7.8';

export interface FieldMappingRow {
  template_variable: string;
  source_field: string;
  field_category: string;
  is_required: boolean;
  default_value: string | null;
  transform_function: string | null;
}

export interface TemplateVariables {
  [k: string]: unknown;
  items?: Array<Record<string, unknown>>;
  logo_base64?: string;
  stamp_base64?: string;
  signature_base64?: string;
}

export class FieldTransformService {
  transform(data: any, options: { mappings: FieldMappingRow[]; assets?: Partial<TemplateVariables> }): TemplateVariables {
    const result: TemplateVariables = {};
    const simpleFields = options.mappings.filter((m) => !m.template_variable.startsWith('items[].'));
    const itemFields = options.mappings.filter((m) => m.template_variable.startsWith('items[].'));

    for (const mapping of simpleFields) {
      const value = getNestedValue(data, mapping.source_field);
      if (value !== undefined && value !== null && value !== '') {
        result[mapping.template_variable] = applyTransform(value, mapping.transform_function);
      } else if (mapping.default_value) {
        result[mapping.template_variable] = mapping.default_value;
      } else if (mapping.is_required) {
        throw new Error(`Required field missing: ${mapping.source_field}`);
      }
    }

    const itemsSource = data?.Строки || data?.items || [];
    result.items = (Array.isArray(itemsSource) ? itemsSource : []).map((row: any, index: number) => {
      const item: Record<string, unknown> = { number: index + 1 };
      for (const mapping of itemFields) {
        const fieldName = mapping.template_variable.replace('items[].', '');
        const v = row?.[mapping.source_field];
        if (v !== undefined) item[fieldName] = applyTransform(v, mapping.transform_function);
      }
      return item;
    });

    if (options.assets) Object.assign(result, options.assets);
    return result;
  }

  renderTemplate(htmlTemplate: string, variables: TemplateVariables): string {
    const template = Handlebars.compile(htmlTemplate);
    return template(variables);
  }
}

function getNestedValue(obj: any, path: string): any {
  return String(path)
    .split('.')
    .reduce((cur, key) => (cur == null ? undefined : cur[key]), obj);
}

function applyTransform(value: any, fn?: string | null): string {
  if (!fn) return String(value);
  switch (fn) {
    case 'formatDate':
      return formatDate(value);
    case 'formatCurrency':
      return formatCurrency(value);
    case 'uppercase':
      return String(value).toUpperCase();
    case 'lowercase':
      return String(value).toLowerCase();
    case 'trim':
      return String(value).trim();
    default:
      return String(value);
  }
}

function formatDate(value: any): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(value: any): string {
  const num = typeof value === 'number' ? value : Number.parseFloat(String(value));
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

