CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  encrypted BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value, description) VALUES
  ('openai_api_key', NULL, 'OpenAI API Key for GPT-4o'),
  ('google_ai_api_key', NULL, 'Google AI API Key for Gemini'),
  ('model_asset_extraction', 'gpt-4o', 'Model for logo/stamp extraction'),
  ('model_document_analysis', 'gemini-2.0-flash', 'Model for document analysis'),
  ('model_chat_editing', 'gemini-2.0-flash', 'Model for chat editing'),
  ('api_key_1c', NULL, 'API Key for 1C integration')
ON CONFLICT (key) DO NOTHING;

