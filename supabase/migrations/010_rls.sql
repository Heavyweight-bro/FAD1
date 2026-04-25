ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admin panel)
CREATE POLICY "authenticated_select_suppliers" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_mutate_suppliers" ON suppliers
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_select_templates" ON invoice_templates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_mutate_templates" ON invoice_templates
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_select_versions" ON template_versions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_mutate_versions" ON template_versions
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_select_assets" ON template_assets
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_mutate_assets" ON template_assets
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_select_mappings" ON field_mappings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_mutate_mappings" ON field_mappings
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_select_invoices" ON generated_invoices
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_mutate_invoices" ON generated_invoices
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_select_settings" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_mutate_settings" ON settings
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_select_usage" ON usage_logs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_usage" ON usage_logs
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "authenticated_select_api_keys" ON api_keys
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_mutate_api_keys" ON api_keys
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

