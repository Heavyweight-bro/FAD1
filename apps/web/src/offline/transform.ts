import type { FieldMapping } from './types';

type Vars = Record<string, unknown> & { items?: Array<Record<string, unknown>> };

export function transform1cData(data: any, mappings: FieldMapping[]): Vars {
  const result: Vars = {};
  const simple = mappings.filter((m) => !m.template_variable.startsWith('items[].'));
  const items = mappings.filter((m) => m.template_variable.startsWith('items[].'));

  for (const m of simple) {
    const value = getNestedValue(data, m.source_field);
    if (value !== undefined && value !== null && value !== '') {
      result[m.template_variable] = applyTransform(value, m.transform_function);
    } else if (m.default_value) {
      result[m.template_variable] = m.default_value;
    } else if (m.is_required) {
      throw new Error(`Missing required field: ${m.source_field}`);
    }
  }

  const itemsSource = data?.Строки || data?.items || [];
  result.items = (Array.isArray(itemsSource) ? itemsSource : []).map((row: any, index: number) => {
    const item: Record<string, unknown> = { number: index + 1 };
    for (const m of items) {
      const fieldName = m.template_variable.replace('items[].', '');
      const v = row?.[m.source_field];
      if (v !== undefined) item[fieldName] = applyTransform(v, m.transform_function);
    }
    return item;
  });

  return result;
}

function getNestedValue(obj: any, path: string): any {
  return String(path)
    .split('.')
    .reduce((cur, key) => (cur == null ? undefined : cur[key]), obj);
}

function applyTransform(value: any, fn: FieldMapping['transform_function']): string {
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

