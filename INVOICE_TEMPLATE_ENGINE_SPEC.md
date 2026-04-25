# Invoice Template Engine — Technical Specification

> Повна специфікація для AI-агентів (Cursor, Claude Code)

## Зміст

1. [Огляд проекту](#огляд-проекту)
2. [Технологічний стек](#технологічний-стек)
3. [Архітектура системи](#архітектура-системи)
4. [База даних](#база-даних)
5. [AI Models Integration](#ai-models-integration)
6. [API Endpoints](#api-endpoints)
7. [Field Mapping System](#field-mapping-system)
8. [Frontend Components](#frontend-components)
9. [PDF Generation](#pdf-generation)
10. [Версійність шаблонів](#версійність-шаблонів)
11. [Batch Processing](#batch-processing)
12. [HTML Template Requirements](#html-template-requirements)
13. [Edge Cases](#edge-cases)
14. [File Structure](#file-structure)
15. [Environment Variables](#environment-variables)
16. [Implementation Phases](#implementation-phases)

---

## Огляд проекту

### Призначення

Мікросервіс для автоматичної генерації PDF інвойсів для логістичної компанії Done (Україна). Система отримує JSON від 1С і повертає URL готового PDF, який виглядає як оригінальний інвойс постачальника.

### Основні флоу

#### Flow 1: Створення шаблону (один раз на постачальника)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Користувач завантажує оригінальний PDF інвойс              │
│                              ↓                                  │
│  2. GPT-4o витягує лого + печатку → PNG з прозорим фоном       │
│                              ↓                                  │
│  3. Gemini Flash аналізує структуру документа                  │
│                              ↓                                  │
│  4. Gemini Flash генерує HTML шаблон з Handlebars змінними     │
│                              ↓                                  │
│  5. Користувач налаштовує Field Mapping в UI                   │
│                              ↓                                  │
│  6. Користувач редагує шаблон через чат (Gemini Flash)         │
│                              ↓                                  │
│  7. Зберігається шаблон + версія                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Flow 2: Генерація PDF (кожен запит від 1С)

```
┌─────────────────────────────────────────────────────────────────┐
│  1С POST JSON ──→ API                                          │
│                    ↓                                            │
│  Знаходить шаблон за supplier_id або supplier_name             │
│                    ↓                                            │
│  Field Mapping: JSON 1С → Template Variables                   │
│                    ↓                                            │
│  Handlebars заповнює HTML шаблон                               │
│                    ↓                                            │
│  Puppeteer генерує PDF                                         │
│                    ↓                                            │
│  Зберігає PDF в Storage                                        │
│                    ↓                                            │
│  Повертає URL ←── 1С                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Технологічний стек

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor (для HTML шаблонів)
- **State Management**: Zustand або React Query
- **Routing**: React Router v6

### Backend
- **Platform**: Supabase
- **Functions**: Supabase Edge Functions (Deno/TypeScript)
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth (для адмін-панелі)

### AI Models
- **GPT-4o**: Витягування лого/печаток (image generation з прозорим фоном)
- **Gemini 2.0 Flash**: Аналіз документів, генерація HTML, чат редагування

### PDF Processing
- **pdf2image**: Конвертація PDF → зображення (Python)
- **Puppeteer**: Генерація PDF з HTML
- **Handlebars**: Template engine

### Deploy
- **Frontend**: Vercel
- **Backend**: Supabase (hosted)

---

## Архітектура системи

```
┌─────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                │
│                         (React + Vite + Vercel)                      │
├─────────────────────────────────────────────────────────────────────┤
│  Dashboard │ Template Editor │ Field Mapping │ Settings │ History   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE EDGE FUNCTIONS                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   extract   │  │   analyze   │  │  generate   │  │    chat     │ │
│  │   assets    │  │  document   │  │    pdf      │  │    edit     │ │
│  │  (GPT-4o)   │  │  (Gemini)   │  │ (Puppeteer) │  │  (Gemini)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  templates  │  │  mappings   │  │  suppliers  │  │   settings  │ │
│  │    CRUD     │  │    CRUD     │  │    CRUD     │  │    CRUD     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE SERVICES                            │
├──────────────────┬──────────────────┬───────────────────────────────┤
│    PostgreSQL    │     Storage      │           Auth                │
│                  │                  │                               │
│  - suppliers     │  - originals/    │  - Admin users                │
│  - templates     │  - assets/       │  - API keys                   │
│  - mappings      │  - generated/    │                               │
│  - versions      │                  │                               │
│  - invoices      │                  │                               │
│  - settings      │                  │                               │
│  - usage_logs    │                  │                               │
└──────────────────┴──────────────────┴───────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL APIS                               │
├─────────────────────────────┬───────────────────────────────────────┤
│         OpenAI API          │           Google AI API               │
│         (GPT-4o)            │        (Gemini 2.0 Flash)             │
│                             │                                       │
│  - Image generation         │  - Document analysis                  │
│  - Background removal       │  - HTML generation                    │
│                             │  - Chat editing                       │
└─────────────────────────────┴───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              1С SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│  POST /api/invoices/generate                                        │
│  { "supplier_name": "...", "data": {...} }                          │
│                                                                      │
│  Response: { "pdf_url": "https://...", "invoice_id": "..." }        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## База даних

### ERD Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    suppliers    │       │    templates    │       │template_versions│
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ name            │  │    │ supplier_id (FK)│◄─┘    │ template_id(FK) │◄─┐
│ name_normalized │  │    │ name            │       │ version         │  │
│ country         │  │    │ html_template   │───────│ html_template   │  │
│ has_logo        │  │    │ css_styles      │       │ change_desc     │  │
│ has_stamp       │  │    │ variables_schema│       │ created_at      │  │
│ metadata        │  │    │ version         │       └─────────────────┘  │
│ created_at      │  │    │ is_active       │                            │
└─────────────────┘  │    │ created_at      │                            │
                     │    └─────────────────┘                            │
                     │                                                   │
                     │    ┌─────────────────┐       ┌─────────────────┐  │
                     │    │ template_assets │       │ field_mappings  │  │
                     │    ├─────────────────┤       ├─────────────────┤  │
                     └───►│ id (PK)         │       │ id (PK)         │  │
                          │ supplier_id(FK) │       │ template_id(FK) │◄─┘
                          │ asset_type      │       │ template_var    │
                          │ storage_path    │       │ source_field    │
                          │ extraction_method       │ category        │
                          │ metadata        │       │ is_required     │
                          │ created_at      │       │ default_value   │
                          └─────────────────┘       │ transform_fn    │
                                                    └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│generated_invoices       │    settings     │       │   usage_logs    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ template_id(FK) │       │ key             │       │ operation       │
│ invoice_number  │       │ value           │       │ model           │
│ invoice_data    │       │ encrypted       │       │ tokens_in       │
│ pdf_url         │       │ updated_at      │       │ tokens_out      │
│ status          │       └─────────────────┘       │ cost_usd        │
│ created_at      │                                 │ created_at      │
└─────────────────┘                                 └─────────────────┘
```

### SQL Migrations

```sql
-- 001_create_suppliers.sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_normalized TEXT GENERATED ALWAYS AS (lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'))) STORED,
  country TEXT,
  has_logo BOOLEAN DEFAULT false,
  has_stamp BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name_normalized ON suppliers(name_normalized);

-- 002_create_templates.sql
CREATE TABLE invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  html_template TEXT NOT NULL,
  css_styles TEXT,
  variables_schema JSONB NOT NULL DEFAULT '{}',
  document_type TEXT DEFAULT 'invoice' CHECK (document_type IN ('invoice', 'proforma', 'commercial_invoice')),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  original_document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, is_active) WHERE is_active = true
);

-- 003_create_template_versions.sql
CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES invoice_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  html_template TEXT NOT NULL,
  css_styles TEXT,
  variables_schema JSONB,
  change_description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(template_id, version)
);

-- 004_create_template_assets.sql
CREATE TABLE template_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'stamp', 'signature')),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT DEFAULT 'image/png',
  extraction_method TEXT DEFAULT 'gpt4o' CHECK (extraction_method IN ('gpt4o', 'manual', 'auto')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 005_create_field_mappings.sql
CREATE TABLE field_mappings (
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

-- 006_create_generated_invoices.sql
CREATE TABLE generated_invoices (
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

CREATE INDEX idx_generated_invoices_status ON generated_invoices(status);
CREATE INDEX idx_generated_invoices_created ON generated_invoices(created_at DESC);

-- 007_create_settings.sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  encrypted BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO settings (key, value, description) VALUES
  ('openai_api_key', NULL, 'OpenAI API Key for GPT-4o'),
  ('google_ai_api_key', NULL, 'Google AI API Key for Gemini'),
  ('model_asset_extraction', 'gpt-4o', 'Model for logo/stamp extraction'),
  ('model_document_analysis', 'gemini-2.0-flash', 'Model for document analysis'),
  ('model_chat_editing', 'gemini-2.0-flash', 'Model for chat editing'),
  ('api_key_1c', NULL, 'API Key for 1C integration');

-- 008_create_usage_logs.sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id),
  template_id UUID REFERENCES invoice_templates(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_created ON usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_operation ON usage_logs(operation);

-- 009_create_api_keys.sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- перші 8 символів для відображення
  permissions JSONB DEFAULT '["generate"]',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (admin panel)
CREATE POLICY "Authenticated users can read all" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert" ON suppliers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update" ON suppliers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Similar policies for other tables...

-- Service role bypass for Edge Functions
CREATE POLICY "Service role full access" ON suppliers
  FOR ALL USING (auth.role() = 'service_role');
```

---

## AI Models Integration

### GPT-4o — Asset Extraction

```typescript
// supabase/functions/extract-assets/index.ts

import OpenAI from 'npm:openai';

interface ExtractAssetRequest {
  imageBase64: string;
  assetType: 'logo' | 'stamp' | 'signature';
  description?: string;
}

interface ExtractAssetResponse {
  success: boolean;
  imageBase64?: string;
  error?: string;
  usage?: {
    model: string;
    cost: number;
  };
}

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

export async function extractAsset(req: ExtractAssetRequest): Promise<ExtractAssetResponse> {
  const prompts = {
    logo: `Extract ONLY the company logo from this invoice image. 
           Remove all background, text, and other elements. 
           Return the logo as a clean PNG with transparent background.
           Keep original colors and proportions.`,
    
    stamp: `Extract ONLY the company stamp/seal from this invoice image.
            Remove all background and surrounding text.
            Return the stamp as a PNG with transparent background.
            Keep the original color (red, blue, or black).
            Include any signatures that are part of the stamp.`,
    
    signature: `Extract ONLY the handwritten signature from this invoice image.
                Remove all background and text.
                Return the signature as a PNG with transparent background.`
  };

  try {
    const response = await openai.images.edit({
      model: "gpt-4o", // або "dall-e-3" для image generation
      image: req.imageBase64,
      prompt: prompts[req.assetType] + (req.description ? ` Additional context: ${req.description}` : ''),
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    });

    // Estimate cost (approximate)
    const cost = 0.04; // $0.04 per image edit

    return {
      success: true,
      imageBase64: response.data[0].b64_json,
      usage: {
        model: 'gpt-4o',
        cost: cost
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Gemini 2.0 Flash — Document Analysis

```typescript
// supabase/functions/analyze-document/index.ts

import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

interface AnalyzeDocumentRequest {
  imageBase64: string;
  mimeType: string;
}

interface DocumentAnalysis {
  documentType: 'invoice' | 'proforma' | 'commercial_invoice';
  hasLogo: boolean;
  logoPosition?: { x: number; y: number; width: number; height: number };
  hasStamp: boolean;
  stampPosition?: { x: number; y: number; width: number; height: number };
  hasSignature: boolean;
  tableColumns: string[];
  sections: string[];
  detectedFields: Record<string, string>;
}

const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_AI_API_KEY')!);

export async function analyzeDocument(req: AnalyzeDocumentRequest): Promise<DocumentAnalysis> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `Analyze this invoice image and extract the following information as JSON:

1. documentType: "invoice", "proforma", or "commercial_invoice"
2. hasLogo: boolean - is there a company logo?
3. logoPosition: {x, y, width, height} in percentages if logo exists
4. hasStamp: boolean - is there a stamp/seal?
5. stampPosition: {x, y, width, height} in percentages if stamp exists
6. hasSignature: boolean
7. tableColumns: array of column names in the items table
8. sections: array of document sections (e.g., "header", "buyer_info", "seller_info", "items_table", "bank_details", "terms", "signature")
9. detectedFields: object with field names and their values found in the document

Return ONLY valid JSON, no markdown or explanation.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: req.mimeType,
        data: req.imageBase64
      }
    }
  ]);

  const text = result.response.text();
  const json = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
  
  return json as DocumentAnalysis;
}
```

### Gemini 2.0 Flash — HTML Template Generation

```typescript
// supabase/functions/generate-template/index.ts

interface GenerateTemplateRequest {
  imageBase64: string;
  mimeType: string;
  analysis: DocumentAnalysis;
  logoBase64?: string;
  stampBase64?: string;
}

export async function generateTemplate(req: GenerateTemplateRequest): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `Generate an HTML template for this invoice that exactly replicates its layout and styling.

REQUIREMENTS:
1. Use Handlebars syntax for variables: {{variable_name}}
2. For items array: {{#each items}}...{{/each}}
3. Use inline CSS styles
4. Page size: A4 (210mm x 297mm)
5. Max content width: 190mm (with 10mm margins)
6. Use table-layout: fixed for tables
7. Font sizes: 8-10px for content, 7-8px for tables
8. Include @page CSS rule for print

STANDARD VARIABLES TO USE:
- Buyer: {{buyer_name}}, {{buyer_address}}, {{buyer_vat}}, {{buyer_phone}}, {{buyer_email}}
- Seller: {{seller_name}}, {{seller_address}}
- Bank: {{beneficiary_name}}, {{account_number}}, {{bank_name}}, {{swift_code}}, {{bank_address}}
- Document: {{invoice_number}}, {{invoice_date}}, {{total_amount}}, {{currency}}, {{payment_terms}}
- Delivery: {{delivery_term}}, {{delivery_place}}, {{port_of_loading}}, {{port_of_discharge}}, {{bl_number}}, {{container_number}}
- Items: {{#each items}}{{this.number}}, {{this.description}}, {{this.quantity}}, {{this.unit_price}}, {{this.amount}}{{/each}}

${req.logoBase64 ? '- Logo: {{logo_base64}} (already extracted, use as <img src="data:image/png;base64,{{logo_base64}}")' : '- No logo detected'}
${req.stampBase64 ? '- Stamp: {{stamp_base64}} (already extracted)' : '- No stamp detected'}

DOCUMENT ANALYSIS:
${JSON.stringify(req.analysis, null, 2)}

Return ONLY the complete HTML code, starting with <!DOCTYPE html>.
Do NOT include any explanation or markdown code blocks.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: req.mimeType,
        data: req.imageBase64
      }
    }
  ]);

  let html = result.response.text();
  
  // Clean up response
  html = html.replace(/```html\n?|\n?```/g, '').trim();
  
  return html;
}
```

### Gemini 2.0 Flash — Chat Editing

```typescript
// supabase/functions/chat-edit/index.ts

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatEditRequest {
  currentHtml: string;
  message: string;
  history: ChatMessage[];
}

interface ChatEditResponse {
  updatedHtml: string;
  explanation: string;
  changes: string[];
}

export async function chatEdit(req: ChatEditRequest): Promise<ChatEditResponse> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const systemPrompt = `You are an HTML template editor assistant for invoice templates.

RULES:
1. Keep ALL Handlebars variables {{...}} intact
2. Maintain A4 print compatibility (190mm width)
3. Use inline CSS
4. Keep table-layout: fixed
5. Don't remove structural elements without explicit request
6. Be concise in explanations

Current HTML template:
\`\`\`html
${req.currentHtml}
\`\`\`

User request: ${req.message}

Respond with JSON:
{
  "updatedHtml": "...complete updated HTML...",
  "explanation": "Brief explanation of changes",
  "changes": ["change 1", "change 2", ...]
}`;

  const contents = [
    ...req.history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    })),
    {
      role: 'user',
      parts: [{ text: systemPrompt }]
    }
  ];

  const result = await model.generateContent({ contents });
  const text = result.response.text();
  const json = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
  
  return json as ChatEditResponse;
}
```

### Cost Tracking

```typescript
// supabase/functions/_shared/usage.ts

interface UsageRecord {
  operation: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  supplierId?: string;
  templateId?: string;
}

const MODEL_COSTS = {
  'gpt-4o': {
    input: 0.005,  // per 1K tokens
    output: 0.015, // per 1K tokens
    image: 0.04    // per image
  },
  'gemini-2.0-flash-exp': {
    input: 0.0001,  // per 1K tokens
    output: 0.0004  // per 1K tokens
  }
};

export async function logUsage(supabase: any, record: UsageRecord) {
  const costs = MODEL_COSTS[record.model];
  const cost = 
    (record.tokensInput / 1000) * costs.input +
    (record.tokensOutput / 1000) * costs.output;

  await supabase.from('usage_logs').insert({
    operation: record.operation,
    model: record.model,
    tokens_input: record.tokensInput,
    tokens_output: record.tokensOutput,
    cost_usd: cost,
    supplier_id: record.supplierId,
    template_id: record.templateId
  });

  return cost;
}
```

---

## API Endpoints

### Authentication

Всі API endpoints (крім /api/invoices/generate для 1С) вимагають Supabase Auth.

API для 1С використовує API Key в header:
```
Authorization: Bearer ite_xxxxxxxxxxxx
```

### Endpoints Specification

#### Suppliers

```
GET    /api/suppliers
       Query: ?search=name&country=CN&page=1&limit=20
       Response: { data: Supplier[], total: number, page: number }

GET    /api/suppliers/:id
       Response: Supplier with templates and assets

POST   /api/suppliers
       Body: { name: string, country?: string, metadata?: object }
       Response: Supplier

PUT    /api/suppliers/:id
       Body: Partial<Supplier>
       Response: Supplier

DELETE /api/suppliers/:id
       Response: { success: true }
```

#### Templates

```
GET    /api/templates
       Query: ?supplier_id=uuid&active_only=true
       Response: Template[]

GET    /api/templates/:id
       Response: Template with mappings and versions

POST   /api/templates
       Body: {
         supplier_id: string,
         name: string,
         html_template: string,
         css_styles?: string,
         variables_schema: object
       }
       Response: Template

PUT    /api/templates/:id
       Body: Partial<Template>
       Response: Template (creates new version automatically)

POST   /api/templates/:id/preview
       Body: { test_data: object }
       Response: { html: string } (rendered HTML for preview)
```

#### Template Versions

```
GET    /api/templates/:id/versions
       Response: TemplateVersion[]

GET    /api/templates/:id/versions/:version
       Response: TemplateVersion

POST   /api/templates/:id/versions/:version/restore
       Response: Template (restored to this version)
```

#### Assets

```
GET    /api/assets
       Query: ?supplier_id=uuid&type=logo|stamp|signature
       Response: Asset[]

POST   /api/assets/extract
       Body: {
         image_base64: string,
         mime_type: string,
         asset_type: 'logo' | 'stamp' | 'signature',
         supplier_id: string,
         description?: string
       }
       Response: Asset

POST   /api/assets/upload
       Body: FormData with file + supplier_id + asset_type
       Response: Asset

DELETE /api/assets/:id
       Response: { success: true }
```

#### Field Mappings

```
GET    /api/mappings/:template_id
       Response: FieldMapping[]

PUT    /api/mappings/:template_id
       Body: FieldMapping[] (replaces all mappings)
       Response: FieldMapping[]

POST   /api/mappings/:template_id/reset
       Response: FieldMapping[] (default mappings)
```

#### Document Analysis

```
POST   /api/analyze
       Body: {
         file_base64: string,
         mime_type: string, // application/pdf or image/*
         supplier_id?: string
       }
       Response: {
         analysis: DocumentAnalysis,
         suggested_template?: string,
         extracted_assets?: Asset[]
       }
```

#### Chat Editing

```
POST   /api/chat/edit
       Body: {
         template_id: string,
         message: string,
         history?: ChatMessage[]
       }
       Response: {
         updated_html: string,
         explanation: string,
         changes: string[]
       }
```

#### Invoice Generation (for 1С)

```
POST   /api/invoices/generate
       Headers: Authorization: Bearer ite_xxxxxxxxxxxx
       Body: {
         supplier_id?: string,
         supplier_name?: string, // alternative to supplier_id
         data: Invoice1CData
       }
       Response: {
         success: true,
         invoice_id: string,
         pdf_url: string,
         expires_at: string // URL expiration time
       }

POST   /api/invoices/generate/batch
       Headers: Authorization: Bearer ite_xxxxxxxxxxxx
       Body: {
         invoices: Array<{
           supplier_id?: string,
           supplier_name?: string,
           data: Invoice1CData
         }>
       }
       Response: {
         success: true,
         results: Array<{
           invoice_id: string,
           pdf_url: string,
           status: 'completed' | 'failed',
           error?: string
         }>,
         zip_url?: string // if > 5 invoices
       }

GET    /api/invoices/:id
       Response: GeneratedInvoice

GET    /api/invoices/:id/download
       Response: PDF file (binary)
```

#### Settings

```
GET    /api/settings
       Response: Setting[] (values masked for API keys)

PUT    /api/settings
       Body: { key: string, value: string }[]
       Response: { success: true }

POST   /api/settings/test-connection
       Body: { provider: 'openai' | 'google' }
       Response: { success: boolean, error?: string }
```

#### Usage & Statistics

```
GET    /api/usage
       Query: ?from=date&to=date&group_by=day|week|month
       Response: {
         total_cost: number,
         total_templates: number,
         total_pdfs: number,
         by_period: Array<{ period: string, cost: number, count: number }>,
         by_operation: Array<{ operation: string, cost: number, count: number }>
       }
```

#### API Keys Management

```
GET    /api/api-keys
       Response: ApiKey[] (key_hash not included)

POST   /api/api-keys
       Body: { name: string, permissions?: string[] }
       Response: { ...ApiKey, key: string } // full key shown only once

DELETE /api/api-keys/:id
       Response: { success: true }
```

---

## Field Mapping System

### Default Mappings

```typescript
// supabase/functions/_shared/default-mappings.ts

export const DEFAULT_MAPPINGS: FieldMapping[] = [
  // BUYER (Покупець — наша компанія)
  {
    templateVariable: 'buyer_name',
    sourceField: 'Организация_Наименование',
    category: 'buyer',
    isRequired: true,
    displayOrder: 1
  },
  {
    templateVariable: 'buyer_address',
    sourceField: 'Организация_ЮрАдрес',
    category: 'buyer',
    isRequired: true,
    displayOrder: 2
  },
  {
    templateVariable: 'buyer_vat',
    sourceField: 'ИНН',
    category: 'buyer',
    isRequired: true,
    displayOrder: 3
  },
  {
    templateVariable: 'buyer_phone',
    sourceField: 'Организация_Телефон',
    category: 'buyer',
    isRequired: false,
    displayOrder: 4
  },
  {
    templateVariable: 'buyer_email',
    sourceField: 'Организация_EMAIL',
    category: 'buyer',
    isRequired: false,
    displayOrder: 5
  },

  // SELLER (Постачальник)
  {
    templateVariable: 'seller_name',
    sourceField: 'Контрагент_Наименование',
    category: 'seller',
    isRequired: true,
    displayOrder: 1
  },
  {
    templateVariable: 'seller_address',
    sourceField: 'Контрагент_ЮрАдрес',
    category: 'seller',
    isRequired: true,
    displayOrder: 2
  },

  // BANK
  {
    templateVariable: 'beneficiary_name',
    sourceField: 'Контрагент_Наименование',
    category: 'bank',
    isRequired: true,
    displayOrder: 1
  },
  {
    templateVariable: 'account_number',
    sourceField: 'Контрагент_IBAN',
    category: 'bank',
    isRequired: true,
    displayOrder: 2
  },
  {
    templateVariable: 'bank_name',
    sourceField: 'Контрагент_Bank',
    category: 'bank',
    isRequired: true,
    displayOrder: 3
  },
  {
    templateVariable: 'swift_code',
    sourceField: 'Контрагент_SWIFT',
    category: 'bank',
    isRequired: true,
    displayOrder: 4
  },
  {
    templateVariable: 'bank_address',
    sourceField: 'Контрагент_BankAddress',
    category: 'bank',
    isRequired: false,
    displayOrder: 5
  },

  // DOCUMENT
  {
    templateVariable: 'invoice_number',
    sourceField: 'ВходящийДокумент_Номер',
    category: 'document',
    isRequired: true,
    displayOrder: 1
  },
  {
    templateVariable: 'invoice_date',
    sourceField: 'ВходящийДокумент_Дата_Анг',
    category: 'document',
    isRequired: true,
    transformFunction: 'formatDate',
    displayOrder: 2
  },
  {
    templateVariable: 'total_amount',
    sourceField: 'Итого_Сумма',
    category: 'document',
    isRequired: true,
    transformFunction: 'formatCurrency',
    displayOrder: 3
  },
  {
    templateVariable: 'currency',
    sourceField: 'Валюта',
    category: 'document',
    isRequired: true,
    displayOrder: 4
  },
  {
    templateVariable: 'payment_terms',
    sourceField: 'Payment_terms',
    category: 'document',
    isRequired: false,
    displayOrder: 5
  },

  // DELIVERY
  {
    templateVariable: 'delivery_term',
    sourceField: 'УсловиеПоставки',
    category: 'delivery',
    isRequired: true,
    displayOrder: 1
  },
  {
    templateVariable: 'delivery_place',
    sourceField: 'МестоПоставки_Анг',
    category: 'delivery',
    isRequired: true,
    displayOrder: 2
  },
  {
    templateVariable: 'port_of_loading',
    sourceField: 'POL',
    category: 'delivery',
    isRequired: false,
    displayOrder: 3
  },
  {
    templateVariable: 'port_of_discharge',
    sourceField: 'POD',
    category: 'delivery',
    isRequired: false,
    displayOrder: 4
  },
  {
    templateVariable: 'bl_number',
    sourceField: 'B/L No.',
    category: 'delivery',
    isRequired: false,
    displayOrder: 5
  },
  {
    templateVariable: 'bl_date',
    sourceField: 'ДатаКоносамента',
    category: 'delivery',
    isRequired: false,
    transformFunction: 'formatDate',
    displayOrder: 6
  },
  {
    templateVariable: 'container_number',
    sourceField: 'Container No.',
    category: 'delivery',
    isRequired: false,
    displayOrder: 7
  },

  // SHIPPER
  {
    templateVariable: 'shipper',
    sourceField: 'Отправитель',
    category: 'shipper',
    isRequired: false,
    displayOrder: 1
  },

  // ITEMS (handled separately in transform)
  {
    templateVariable: 'items[].description',
    sourceField: 'Строка_НоменклатураНаименованиеПолноеАнг',
    category: 'items',
    isRequired: true,
    displayOrder: 1
  },
  {
    templateVariable: 'items[].unit',
    sourceField: 'Строка_ЕдИзмер_Анг',
    category: 'items',
    isRequired: true,
    displayOrder: 2
  },
  {
    templateVariable: 'items[].quantity',
    sourceField: 'Строка_Количество',
    category: 'items',
    isRequired: true,
    displayOrder: 3
  },
  {
    templateVariable: 'items[].unit_price',
    sourceField: 'Строка_Цена',
    category: 'items',
    isRequired: true,
    transformFunction: 'formatCurrency',
    displayOrder: 4
  },
  {
    templateVariable: 'items[].amount',
    sourceField: 'Строка_Сумма',
    category: 'items',
    isRequired: true,
    transformFunction: 'formatCurrency',
    displayOrder: 5
  },
  {
    templateVariable: 'items[].country_of_origin',
    sourceField: 'Строка_СтранаПроисхожденияНоменклатуры',
    category: 'items',
    isRequired: false,
    displayOrder: 6
  }
];
```

### Transform Service

```typescript
// supabase/functions/_shared/transform.ts

import Handlebars from 'npm:handlebars';

interface TransformOptions {
  mappings: FieldMapping[];
  logoBase64?: string;
  stampBase64?: string;
  signatureBase64?: string;
}

export class FieldTransformService {
  
  transform(data: Invoice1CData, options: TransformOptions): TemplateVariables {
    const result: Partial<TemplateVariables> = {};
    
    // Group mappings by category
    const simpleFields = options.mappings.filter(m => !m.templateVariable.startsWith('items[].'));
    const itemFields = options.mappings.filter(m => m.templateVariable.startsWith('items[].'));
    
    // Transform simple fields
    for (const mapping of simpleFields) {
      const value = this.getNestedValue(data, mapping.sourceField);
      
      if (value !== undefined && value !== null && value !== '') {
        const transformed = this.applyTransform(value, mapping.transformFunction);
        result[mapping.templateVariable] = transformed;
      } else if (mapping.defaultValue) {
        result[mapping.templateVariable] = mapping.defaultValue;
      } else if (mapping.isRequired) {
        throw new Error(`Required field missing: ${mapping.sourceField}`);
      }
    }
    
    // Transform items array
    const itemsSource = data.Строки || data.items || [];
    result.items = itemsSource.map((row, index) => {
      const item: any = { number: index + 1 };
      
      for (const mapping of itemFields) {
        const fieldName = mapping.templateVariable.replace('items[].', '');
        const value = row[mapping.sourceField];
        
        if (value !== undefined) {
          item[fieldName] = this.applyTransform(value, mapping.transformFunction);
        }
      }
      
      return item;
    });
    
    // Add assets
    if (options.logoBase64) result.logo_base64 = options.logoBase64;
    if (options.stampBase64) result.stamp_base64 = options.stampBase64;
    if (options.signatureBase64) result.signature_base64 = options.signatureBase64;
    
    return result as TemplateVariables;
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private applyTransform(value: any, fn?: string): string {
    if (fn === null || fn === undefined) return String(value);
    
    switch (fn) {
      case 'formatDate':
        return this.formatDate(value);
      case 'formatCurrency':
        return this.formatCurrency(value);
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
  
  private formatDate(value: any): string {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  private formatCurrency(value: any): string {
    if (typeof value !== 'number') value = parseFloat(value) || 0;
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  // Render HTML template with variables
  renderTemplate(htmlTemplate: string, variables: TemplateVariables): string {
    const template = Handlebars.compile(htmlTemplate);
    return template(variables);
  }
}
```

---

## Frontend Components

### Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   │
│   ├── suppliers/
│   │   ├── SupplierList.tsx
│   │   ├── SupplierCard.tsx
│   │   └── SupplierForm.tsx
│   │
│   ├── templates/
│   │   ├── TemplateEditor.tsx      # Monaco editor + preview
│   │   ├── TemplatePreview.tsx     # iframe preview
│   │   ├── TemplateHistory.tsx     # version list
│   │   └── TemplateUploader.tsx    # drag & drop
│   │
│   ├── mappings/
│   │   ├── FieldMappingEditor.tsx  # main mapping UI
│   │   ├── MappingRow.tsx          # single field mapping
│   │   ├── CategoryTabs.tsx        # buyer/seller/bank tabs
│   │   └── FieldSelector.tsx       # dropdown with 1C fields
│   │
│   ├── assets/
│   │   ├── AssetExtractor.tsx      # GPT-4o extraction UI
│   │   ├── AssetPreview.tsx        # show extracted asset
│   │   └── AssetUploader.tsx       # manual upload
│   │
│   ├── chat/
│   │   ├── ChatPanel.tsx           # chat sidebar
│   │   ├── ChatMessage.tsx         # single message
│   │   └── ChatInput.tsx           # input + send
│   │
│   ├── invoices/
│   │   ├── InvoiceList.tsx         # generated invoices
│   │   ├── InvoicePreview.tsx      # preview before generate
│   │   └── BatchGenerator.tsx      # batch upload UI
│   │
│   ├── settings/
│   │   ├── SettingsPage.tsx
│   │   ├── ApiKeysSection.tsx
│   │   ├── ModelSelector.tsx
│   │   └── UsageStats.tsx
│   │
│   └── ui/                         # shared UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Modal.tsx
│       ├── Table.tsx
│       ├── Tabs.tsx
│       ├── Toast.tsx
│       └── Loading.tsx
│
├── pages/
│   ├── Dashboard.tsx
│   ├── Suppliers.tsx
│   ├── SupplierDetail.tsx
│   ├── TemplateEditor.tsx
│   ├── Invoices.tsx
│   └── Settings.tsx
│
├── hooks/
│   ├── useSuppliers.ts
│   ├── useTemplates.ts
│   ├── useMappings.ts
│   ├── useAssets.ts
│   ├── useChat.ts
│   └── useSettings.ts
│
├── lib/
│   ├── supabase.ts
│   ├── api.ts
│   └── utils.ts
│
└── types/
    └── index.ts
```

### Key Component: Field Mapping Editor

```tsx
// src/components/mappings/FieldMappingEditor.tsx

import { useState } from 'react';
import { useMappings } from '@/hooks/useMappings';

const CATEGORIES = [
  { id: 'buyer', label: 'Покупець', icon: '🏢' },
  { id: 'seller', label: 'Постачальник', icon: '🏭' },
  { id: 'bank', label: 'Банк', icon: '🏦' },
  { id: 'document', label: 'Документ', icon: '📄' },
  { id: 'delivery', label: 'Доставка', icon: '🚢' },
  { id: 'shipper', label: 'Відправник', icon: '📦' },
  { id: 'items', label: 'Товари', icon: '📋' },
];

// Available 1C fields for dropdown
const SOURCE_FIELDS = {
  buyer: [
    'Организация_Наименование',
    'Организация_ЮрАдрес', 
    'ИНН',
    'Организация_Телефон',
    'Организация_EMAIL',
  ],
  seller: [
    'Контрагент_Наименование',
    'Контрагент_ЮрАдрес',
  ],
  bank: [
    'Контрагент_Наименование',
    'Контрагент_IBAN',
    'Контрагент_Bank',
    'Контрагент_SWIFT',
    'Контрагент_BankAddress',
  ],
  document: [
    'ВходящийДокумент_Номер',
    'ВходящийДокумент_Дата',
    'ВходящийДокумент_Дата_Анг',
    'Итого_Сумма',
    'Итого_Количество',
    'Валюта',
    'Payment_terms',
  ],
  delivery: [
    'УсловиеПоставки',
    'МестоПоставки_Анг',
    'POL',
    'POD',
    'B/L No.',
    'ДатаКоносамента',
    'Container No.',
  ],
  shipper: [
    'Отправитель',
  ],
  items: [
    'Строка_НомерСтроки',
    'Строка_НоменклатураНаименованиеПолноеАнг',
    'Строка_ЕдИзмер_Анг',
    'Строка_Цена',
    'Строка_Количество',
    'Строка_Сумма',
    'Строка_СтранаПроисхожденияНоменклатуры',
  ],
};

export function FieldMappingEditor({ templateId }: { templateId: string }) {
  const [activeCategory, setActiveCategory] = useState('buyer');
  const { mappings, updateMappings, resetToDefault, isLoading } = useMappings(templateId);
  
  const categoryMappings = mappings.filter(m => m.category === activeCategory);
  
  const handleFieldChange = (mappingId: string, field: string, value: any) => {
    const updated = mappings.map(m => 
      m.id === mappingId ? { ...m, [field]: value } : m
    );
    updateMappings(updated);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="flex border-b">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 text-sm font-medium ${
              activeCategory === cat.id 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>
      
      {/* Mappings Table */}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500">
              <th className="pb-2">Змінна шаблону</th>
              <th className="pb-2">Поле 1С</th>
              <th className="pb-2">Трансформація</th>
              <th className="pb-2 w-20">Обов'язкове</th>
            </tr>
          </thead>
          <tbody>
            {categoryMappings.map(mapping => (
              <tr key={mapping.id} className="border-t">
                <td className="py-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {`{{${mapping.templateVariable}}}`}
                  </code>
                </td>
                <td className="py-2">
                  <select
                    value={mapping.sourceField}
                    onChange={(e) => handleFieldChange(mapping.id, 'sourceField', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    {SOURCE_FIELDS[activeCategory]?.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <select
                    value={mapping.transformFunction || ''}
                    onChange={(e) => handleFieldChange(mapping.id, 'transformFunction', e.target.value || null)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="">Без трансформації</option>
                    <option value="formatDate">Форматувати дату</option>
                    <option value="formatCurrency">Форматувати суму</option>
                    <option value="uppercase">ВЕРХНІЙ РЕГІСТР</option>
                    <option value="lowercase">нижній регістр</option>
                    <option value="trim">Видалити пробіли</option>
                  </select>
                </td>
                <td className="py-2 text-center">
                  <input
                    type="checkbox"
                    checked={mapping.isRequired}
                    onChange={(e) => handleFieldChange(mapping.id, 'isRequired', e.target.checked)}
                    className="w-4 h-4"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Actions */}
      <div className="border-t p-4 flex justify-between">
        <button
          onClick={resetToDefault}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Скинути до стандартних
        </button>
        <button
          onClick={() => updateMappings(mappings)}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Збереження...' : 'Зберегти'}
        </button>
      </div>
    </div>
  );
}
```

### Key Component: Template Editor with Chat

```tsx
// src/components/templates/TemplateEditor.tsx

import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { TemplatePreview } from './TemplatePreview';

interface Props {
  templateId: string;
  initialHtml: string;
  testData?: any;
}

export function TemplateEditor({ templateId, initialHtml, testData }: Props) {
  const [html, setHtml] = useState(initialHtml);
  const [showChat, setShowChat] = useState(true);
  const editorRef = useRef(null);
  
  const handleChatUpdate = (updatedHtml: string) => {
    setHtml(updatedHtml);
  };
  
  return (
    <div className="flex h-full">
      {/* Editor Panel */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-2 flex justify-between items-center">
          <span className="font-medium">HTML Шаблон</span>
          <button
            onClick={() => setShowChat(!showChat)}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            {showChat ? 'Сховати чат' : 'Показати чат'}
          </button>
        </div>
        
        <div className="flex-1 flex">
          {/* Monaco Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              language="html"
              value={html}
              onChange={(value) => setHtml(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                wordWrap: 'on',
                formatOnPaste: true,
              }}
              onMount={(editor) => { editorRef.current = editor; }}
            />
          </div>
          
          {/* Chat Panel */}
          {showChat && (
            <div className="w-80 border-l">
              <ChatPanel
                templateId={templateId}
                currentHtml={html}
                onUpdate={handleChatUpdate}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Preview Panel */}
      <div className="w-1/2 border-l flex flex-col">
        <div className="border-b p-2">
          <span className="font-medium">Попередній перегляд</span>
        </div>
        <div className="flex-1">
          <TemplatePreview html={html} testData={testData} />
        </div>
      </div>
    </div>
  );
}
```

---

## PDF Generation

### Puppeteer Service

```typescript
// supabase/functions/generate-pdf/index.ts

import puppeteer from 'npm:puppeteer-core@21.5.0';
import Handlebars from 'npm:handlebars';

interface GeneratePdfRequest {
  templateId: string;
  data: Invoice1CData;
  supplierId?: string;
  supplierName?: string;
}

interface GeneratePdfResponse {
  success: boolean;
  invoiceId?: string;
  pdfUrl?: string;
  error?: string;
  processingTimeMs?: number;
}

export async function generatePdf(
  supabase: any,
  req: GeneratePdfRequest
): Promise<GeneratePdfResponse> {
  const startTime = Date.now();
  
  try {
    // 1. Find template
    let template;
    if (req.templateId) {
      const { data } = await supabase
        .from('invoice_templates')
        .select('*, suppliers(*), template_assets(*)')
        .eq('id', req.templateId)
        .single();
      template = data;
    } else {
      // Find by supplier name
      const { data } = await supabase
        .from('invoice_templates')
        .select('*, suppliers!inner(*), template_assets(*)')
        .ilike('suppliers.name', `%${req.supplierName}%`)
        .eq('is_active', true)
        .single();
      template = data;
    }
    
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    
    // 2. Get field mappings
    const { data: mappings } = await supabase
      .from('field_mappings')
      .select('*')
      .eq('template_id', template.id);
    
    // 3. Get assets
    const assets = template.template_assets || [];
    const logoAsset = assets.find(a => a.asset_type === 'logo');
    const stampAsset = assets.find(a => a.asset_type === 'stamp');
    
    let logoBase64, stampBase64;
    
    if (logoAsset) {
      const { data } = await supabase.storage
        .from('assets')
        .download(logoAsset.storage_path);
      logoBase64 = await blobToBase64(data);
    }
    
    if (stampAsset) {
      const { data } = await supabase.storage
        .from('assets')
        .download(stampAsset.storage_path);
      stampBase64 = await blobToBase64(data);
    }
    
    // 4. Transform data
    const transformer = new FieldTransformService();
    const variables = transformer.transform(req.data, {
      mappings,
      logoBase64,
      stampBase64
    });
    
    // 5. Render HTML
    const compiledTemplate = Handlebars.compile(template.html_template);
    const html = compiledTemplate(variables);
    
    // 6. Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    
    await browser.close();
    
    // 7. Upload PDF to storage
    const invoiceNumber = variables.invoice_number || `INV-${Date.now()}`;
    const fileName = `${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const storagePath = `generated/${template.suppliers.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('generated')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (uploadError) throw uploadError;
    
    // 8. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated')
      .getPublicUrl(storagePath);
    
    // 9. Save record
    const { data: invoice } = await supabase
      .from('generated_invoices')
      .insert({
        template_id: template.id,
        invoice_number: invoiceNumber,
        supplier_name: template.suppliers.name,
        invoice_data: req.data,
        pdf_url: publicUrl,
        pdf_storage_path: storagePath,
        status: 'completed',
        processing_time_ms: Date.now() - startTime
      })
      .select()
      .single();
    
    return {
      success: true,
      invoiceId: invoice.id,
      pdfUrl: publicUrl,
      processingTimeMs: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    };
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
```

---

## Версійність шаблонів

### Auto-versioning on Update

```typescript
// supabase/functions/templates/update.ts

export async function updateTemplate(
  supabase: any,
  templateId: string,
  updates: Partial<Template>,
  changeDescription?: string
): Promise<Template> {
  
  // 1. Get current template
  const { data: current } = await supabase
    .from('invoice_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  
  // 2. Save current version to history
  await supabase.from('template_versions').insert({
    template_id: templateId,
    version: current.version,
    html_template: current.html_template,
    css_styles: current.css_styles,
    variables_schema: current.variables_schema,
    change_description: changeDescription || 'Auto-saved version'
  });
  
  // 3. Update template with new version number
  const { data: updated } = await supabase
    .from('invoice_templates')
    .update({
      ...updates,
      version: current.version + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .select()
    .single();
  
  return updated;
}

// Restore specific version
export async function restoreVersion(
  supabase: any,
  templateId: string,
  version: number
): Promise<Template> {
  
  // 1. Get version to restore
  const { data: versionData } = await supabase
    .from('template_versions')
    .select('*')
    .eq('template_id', templateId)
    .eq('version', version)
    .single();
  
  if (!versionData) {
    throw new Error('Version not found');
  }
  
  // 2. Update template (will auto-save current as new version)
  return updateTemplate(supabase, templateId, {
    html_template: versionData.html_template,
    css_styles: versionData.css_styles,
    variables_schema: versionData.variables_schema
  }, `Restored from version ${version}`);
}
```

---

## Batch Processing

### Batch Generation Endpoint

```typescript
// supabase/functions/generate-batch/index.ts

interface BatchRequest {
  invoices: Array<{
    supplier_id?: string;
    supplier_name?: string;
    data: Invoice1CData;
  }>;
}

interface BatchResponse {
  success: boolean;
  results: Array<{
    index: number;
    invoice_id?: string;
    pdf_url?: string;
    status: 'completed' | 'failed';
    error?: string;
  }>;
  zip_url?: string;
  total_time_ms: number;
}

export async function generateBatch(
  supabase: any,
  req: BatchRequest
): Promise<BatchResponse> {
  const startTime = Date.now();
  const results = [];
  const pdfPaths = [];
  
  // Process invoices in parallel (with limit)
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < req.invoices.length; i += BATCH_SIZE) {
    const batch = req.invoices.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(async (invoice, batchIndex) => {
        const index = i + batchIndex;
        
        try {
          const result = await generatePdf(supabase, invoice);
          
          if (result.success) {
            pdfPaths.push(result.pdfStoragePath);
            return {
              index,
              invoice_id: result.invoiceId,
              pdf_url: result.pdfUrl,
              status: 'completed' as const
            };
          } else {
            return {
              index,
              status: 'failed' as const,
              error: result.error
            };
          }
        } catch (error) {
          return {
            index,
            status: 'failed' as const,
            error: error.message
          };
        }
      })
    );
    
    results.push(...batchResults);
  }
  
  // Create ZIP if more than 5 invoices
  let zipUrl;
  if (pdfPaths.length > 5) {
    zipUrl = await createZipArchive(supabase, pdfPaths);
  }
  
  return {
    success: true,
    results,
    zip_url: zipUrl,
    total_time_ms: Date.now() - startTime
  };
}
```

---

## HTML Template Requirements

### CSS Rules for A4 Print

```css
/* ОБОВ'ЯЗКОВІ правила для коректного друку */

@page {
  size: A4;
  margin: 10mm;
}

* {
  box-sizing: border-box;
}

body {
  width: 190mm;
  max-width: 190mm;
  margin: 0 auto;
  padding: 0;
  font-family: Arial, sans-serif;
  font-size: 9px;
  line-height: 1.3;
  color: #000;
  background: #fff;
}

/* Таблиці */
table {
  width: 100%;
  table-layout: fixed;      /* КРИТИЧНО */
  border-collapse: collapse;
}

th, td {
  padding: 3px 2px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  vertical-align: top;
}

/* Уникнення розриву всередині елементів */
tr, .no-break {
  page-break-inside: avoid;
}

/* Заголовки */
h1 { font-size: 14px; }
h2 { font-size: 12px; }
h3 { font-size: 10px; }

/* Зображення */
img {
  max-width: 100%;
  height: auto;
}

img.logo {
  max-height: 60px;
  max-width: 150px;
}

img.stamp {
  max-height: 80px;
  max-width: 100px;
}

/* Print-specific */
@media print {
  body {
    width: 190mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .no-print {
    display: none !important;
  }
}
```

### Template Structure Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice {{invoice_number}}</title>
  <style>
    /* CSS rules as above */
  </style>
</head>
<body>
  <!-- Header -->
  <header>
    {{#if logo_base64}}
    <img src="data:image/png;base64,{{logo_base64}}" class="logo" alt="Logo">
    {{/if}}
    <div class="company-info">
      <h1>{{seller_name}}</h1>
      <p>{{seller_address}}</p>
    </div>
    <div class="invoice-info">
      <p><strong>Invoice #:</strong> {{invoice_number}}</p>
      <p><strong>Date:</strong> {{invoice_date}}</p>
    </div>
  </header>
  
  <!-- Buyer Info -->
  <section class="buyer">
    <h3>Bill To:</h3>
    <p>{{buyer_name}}</p>
    <p>{{buyer_address}}</p>
    <p>VAT: {{buyer_vat}}</p>
  </section>
  
  <!-- Items Table -->
  <table class="items">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 45%;">Description</th>
        <th style="width: 10%;">Qty</th>
        <th style="width: 15%;">Unit Price</th>
        <th style="width: 15%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{this.number}}</td>
        <td>{{this.description}}</td>
        <td>{{this.quantity}}</td>
        <td>{{this.unit_price}}</td>
        <td>{{this.amount}}</td>
      </tr>
      {{/each}}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align: right;"><strong>Total:</strong></td>
        <td><strong>{{currency}} {{total_amount}}</strong></td>
      </tr>
    </tfoot>
  </table>
  
  <!-- Terms & Bank -->
  <section class="terms">
    <p><strong>Payment Terms:</strong> {{payment_terms}}</p>
    <p><strong>Delivery:</strong> {{delivery_term}} {{delivery_place}}</p>
  </section>
  
  <section class="bank">
    <h3>Bank Details:</h3>
    <p>Beneficiary: {{beneficiary_name}}</p>
    <p>Account: {{account_number}}</p>
    <p>Bank: {{bank_name}}</p>
    <p>SWIFT: {{swift_code}}</p>
  </section>
  
  <!-- Stamp & Signature -->
  <footer>
    {{#if stamp_base64}}
    <img src="data:image/png;base64,{{stamp_base64}}" class="stamp" alt="Stamp">
    {{/if}}
  </footer>
</body>
</html>
```

---

## Edge Cases

| # | Проблема | Рішення |
|---|----------|---------|
| 1 | Різні структури таблиць (4-9 колонок) | AI визначає колонки, зберігає в variables_schema |
| 2 | Різні типи печаток (сині/червоні) | GPT-4o зберігає оригінальний колір |
| 3 | Текст перекриває печатку | GPT-4o автоматично очищує |
| 4 | Документи без лого | has_logo = false, текстовий header |
| 5 | Печатка обрізана на скані | Можливість ручного завантаження |
| 6 | Різні формати дат/чисел | Transform functions |
| 7 | Багаторядкові описи товарів | CSS word-wrap: break-word |
| 8 | FOC позиції | Поле is_foc в items |
| 9 | Таблиця з колонкою Photo | Ігнорувати в шаблоні |
| 10 | Світлий/вицвілий скан | GPT-4o справляється |
| 11 | Підпис без печатки | asset_type = 'signature' |
| 12 | Handling Fee | Окреме поле {{handling_fee}} |
| 13 | Кольорові варіанти товарів | Кожен колір = окремий рядок |

---

## File Structure

```
invoice-template-engine/
├── apps/
│   └── web/                              # React frontend
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── types/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── package.json
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── supabase/
│   ├── functions/
│   │   ├── analyze-document/
│   │   │   └── index.ts
│   │   ├── extract-assets/
│   │   │   └── index.ts
│   │   ├── generate-template/
│   │   │   └── index.ts
│   │   ├── generate-pdf/
│   │   │   └── index.ts
│   │   ├── generate-batch/
│   │   │   └── index.ts
│   │   ├── chat-edit/
│   │   │   └── index.ts
│   │   ├── _shared/
│   │   │   ├── cors.ts
│   │   │   ├── auth.ts
│   │   │   ├── transform.ts
│   │   │   ├── usage.ts
│   │   │   └── default-mappings.ts
│   │   └── config.toml
│   │
│   ├── migrations/
│   │   ├── 001_create_suppliers.sql
│   │   ├── 002_create_templates.sql
│   │   ├── 003_create_template_versions.sql
│   │   ├── 004_create_template_assets.sql
│   │   ├── 005_create_field_mappings.sql
│   │   ├── 006_create_generated_invoices.sql
│   │   ├── 007_create_settings.sql
│   │   ├── 008_create_usage_logs.sql
│   │   └── 009_create_api_keys.sql
│   │
│   └── config.toml
│
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

---

## Environment Variables

```env
# ===================
# SUPABASE
# ===================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# ===================
# AI MODELS
# ===================
OPENAI_API_KEY=sk-...           # GPT-4o for asset extraction
GOOGLE_AI_API_KEY=AIza...       # Gemini 2.0 Flash

# ===================
# PDF GENERATION
# ===================
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ===================
# APPLICATION
# ===================
VITE_APP_NAME="Invoice Template Engine"
VITE_APP_URL=https://invoices.done.ua
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Supabase project setup
- [ ] Database migrations
- [ ] Storage buckets configuration
- [ ] Basic auth setup
- [ ] Environment configuration

### Phase 2: AI Integration (Week 2-3)
- [ ] GPT-4o asset extraction endpoint
- [ ] Gemini document analysis endpoint
- [ ] Gemini template generation endpoint
- [ ] Usage logging

### Phase 3: Core Backend (Week 3-4)
- [ ] Suppliers CRUD
- [ ] Templates CRUD with versioning
- [ ] Field mappings CRUD
- [ ] Transform service
- [ ] Assets management

### Phase 4: PDF Generation (Week 4-5)
- [ ] Puppeteer integration
- [ ] Single invoice generation
- [ ] Batch processing
- [ ] Storage upload

### Phase 5: Frontend - Basic (Week 5-6)
- [ ] Layout and navigation
- [ ] Suppliers list and detail
- [ ] Template uploader
- [ ] Asset preview

### Phase 6: Frontend - Editor (Week 6-7)
- [ ] Monaco editor integration
- [ ] Template preview
- [ ] Field mapping editor
- [ ] Chat editing panel

### Phase 7: API & Integration (Week 7-8)
- [ ] 1C API endpoint
- [ ] API key management
- [ ] Rate limiting
- [ ] Documentation

### Phase 8: Polish (Week 8-9)
- [ ] Settings page
- [ ] Usage statistics
- [ ] Error handling
- [ ] Testing

### Phase 9: Deploy (Week 9-10)
- [ ] Vercel deployment
- [ ] Supabase production
- [ ] Domain setup
- [ ] Monitoring

---

## Cost Estimation

### Per Template Creation
| Operation | Model | Cost |
|-----------|-------|------|
| Logo extraction | GPT-4o | ~$0.02 |
| Stamp extraction | GPT-4o | ~$0.02 |
| Document analysis | Gemini Flash | ~$0.0001 |
| HTML generation | Gemini Flash | ~$0.0003 |
| **Total** | | **~$0.04-0.05** |

### Per PDF Generation
| Operation | Cost |
|-----------|------|
| Handlebars rendering | $0 |
| Puppeteer PDF | $0 |
| Storage | ~$0.0001 |
| **Total** | **~$0** |

### Monthly Estimate (100 suppliers, 1000 PDFs)
| Item | Cost |
|------|------|
| Template creation | 100 × $0.05 = $5 |
| PDF generation | 1000 × $0 = $0 |
| Supabase (free tier) | $0 |
| Vercel (free tier) | $0 |
| **Total** | **~$5/month** |

---

## Notes for AI Agents

1. **При створенні компонентів** — використовуй Tailwind CSS
2. **При роботі з Supabase** — завжди перевіряй RLS policies
3. **При генерації HTML шаблонів** — дотримуйся A4 вимог (190mm width)
4. **При роботі з GPT-4o** — логуй usage для відстеження витрат
5. **При batch processing** — обмежуй паралельні запити (5 одночасно)
6. **При версіонуванні** — завжди зберігай попередню версію перед оновленням

---

*Специфікація версія 2.0 | Останнє оновлення: April 2025*
