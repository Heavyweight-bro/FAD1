import { useMemo, useState } from 'react';
import Handlebars from 'handlebars';
import { useOfflineStore } from '../offline/offlineStore';
import { SAMPLE_1C_DATA } from '../offline/sample-data';
import { transform1cData } from '../offline/transform';
import type { FieldCategory, FieldMapping } from '../offline/types';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabase';
import { pdfFirstPageToPngBase64 } from '../lib/pdf';

const CATEGORIES: Array<{ id: FieldCategory; label: string }> = [
  { id: 'buyer', label: 'Покупець' },
  { id: 'seller', label: 'Постачальник' },
  { id: 'bank', label: 'Банк' },
  { id: 'document', label: 'Документ' },
  { id: 'delivery', label: 'Доставка' },
  { id: 'shipper', label: 'Відправник' },
  { id: 'items', label: 'Товари' },
];

export function TemplatesPage() {
  const online = supabase != null;
  const suppliers = useOfflineStore((s) => s.suppliers);
  const templates = useOfflineStore((s) => s.templates);
  const selectedTemplateId = useOfflineStore((s) => s.selectedTemplateId);
  const setSelectedTemplate = useOfflineStore((s) => s.setSelectedTemplate);
  const createTemplateForSupplier = useOfflineStore((s) => s.createTemplateForSupplier);
  const updateTemplate = useOfflineStore((s) => s.updateTemplate);
  const updateTemplateOriginalPdf = useOfflineStore((s) => s.updateTemplateOriginalPdf);
  const setMappings = useOfflineStore((s) => s.setMappings);
  const resetMappings = useOfflineStore((s) => s.resetMappings);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const [activeCategory, setActiveCategory] = useState<FieldCategory>('document');
  const [testJson, setTestJson] = useState(() => JSON.stringify(SAMPLE_1C_DATA, null, 2));
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string>('');

  const supplierName = useMemo(() => {
    if (!selected) return '';
    return suppliers.find((s) => s.id === selected.supplier_id)?.name ?? '';
  }, [selected, suppliers]);

  async function onPdfUpload(file: File) {
    if (!selected) return;
    const url = URL.createObjectURL(file);
    updateTemplateOriginalPdf(selected.id, { name: file.name, url });
  }

  async function generateFromPdf(file: File) {
    if (!selected) return;
    if (!online) {
      setAiError('AI генерація доступна в онлайн-режимі (Supabase + Edge Function).');
      return;
    }
    setAiError(null);
    setAiNote('');
    setAiBusy(true);
    try {
      const { base64, mimeType } = await pdfFirstPageToPngBase64(file);
      const res = await apiFetch<{ success: true; html_template: string; note?: string }>(`/api/generate-template`, {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: selected.supplier_id,
          image_base64: base64,
          mime_type: mimeType,
        }),
      });
      updateTemplate(selected.id, { html_template: res.html_template });
      setAiNote(res.note ?? 'Шаблон згенеровано. Перевір і відредагуй перед збереженням.');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setAiBusy(false);
    }
  }

  function onImportHtml(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (!selected) return;
      updateTemplate(selected.id, { html_template: String(reader.result ?? '') });
    };
    reader.readAsText(file);
  }

  function renderPreview() {
    setRenderError(null);
    try {
      if (!selected) return;
      const data = JSON.parse(testJson);
      const vars = transform1cData(data, selected.mappings);
      const tpl = Handlebars.compile(selected.html_template);
      const html = tpl(vars);
      setRenderedHtml(html);
    } catch (e) {
      setRenderedHtml('');
      setRenderError(e instanceof Error ? e.message : 'Render failed');
    }
  }

  function updateMapping(id: string, patch: Partial<FieldMapping>) {
    if (!selected) return;
    const next = selected.mappings.map((m) => (m.id === id ? { ...m, ...patch } : m));
    setMappings(selected.id, next);
  }

  if (!selected) {
    return (
      <div>
        <div className="text-base font-semibold">Templates (offline)</div>
        <div className="mt-2 text-sm text-slate-300">Нема шаблонів. Створи новий для будь-якого supplier.</div>
      </div>
    );
  }

  const categoryMappings = selected.mappings
    .filter((m) => m.field_category === activeCategory)
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Шаблони</div>
          <div className="mt-1 text-sm text-slate-300">
            Постачальник: <span className="text-slate-100">{supplierName}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Режим: {online ? 'онлайн (Supabase)' : 'офлайн (локальний sandbox)'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            value={selected.id}
            onChange={(e) => setSelectedTemplate(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (v{t.version})
              </option>
            ))}
          </select>
          <button
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-700"
            onClick={() => createTemplateForSupplier(selected.supplier_id)}
          >
            Новий шаблон
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="text-sm font-semibold">1) Завантаж оригінальний PDF</div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPdfUpload(f);
              }}
              className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border file:border-slate-700 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:text-slate-100 hover:file:bg-slate-800"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold hover:bg-indigo-500 disabled:opacity-60"
              disabled={!selected.original_pdf_url || aiBusy}
              onClick={async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/pdf';
                input.onchange = () => {
                  const f = input.files?.[0];
                  if (f) void generateFromPdf(f);
                };
                input.click();
              }}
              title={online ? 'Згенерувати HTML через Gemini' : 'Потрібен онлайн режим'}
            >
              {aiBusy ? 'Генерую…' : 'AI: згенерувати HTML'}
            </button>
          </div>
          {aiError ? (
            <div className="mt-3 rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
              {aiError}
            </div>
          ) : null}
          {aiNote ? <div className="mt-3 text-xs text-emerald-200/90">{aiNote}</div> : null}
          {selected.original_pdf_name && selected.original_pdf_url ? (
            <div className="mt-3">
              <div className="text-xs text-slate-400">Завантажено: {selected.original_pdf_name}</div>
              <div className="mt-2 aspect-[3/4] overflow-hidden rounded-xl border border-slate-800 bg-black/20">
                <iframe title="original-pdf" src={selected.original_pdf_url} className="h-full w-full" />
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400">
              Завантаж PDF, щоб пройти флоу. В офлайн-режимі PDF не аналізується; в онлайн-режимі AI бере першу сторінку як зображення.
            </div>
          )}

          <div className="mt-6 text-sm font-semibold">2) Імпорт / редагування HTML</div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="file"
              accept=".html,text/html"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportHtml(f);
              }}
              className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border file:border-slate-700 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:text-slate-100 hover:file:bg-slate-800"
            />
          </div>
          <label className="mt-3 block text-xs text-slate-300">
            Назва
            <input
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-slate-600"
              value={selected.name}
              onChange={(e) => updateTemplate(selected.id, { name: e.target.value })}
            />
          </label>
        </section>

        <section className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">HTML шаблон</div>
            <button
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold hover:bg-indigo-500"
              onClick={renderPreview}
            >
              Згенерувати превʼю
            </button>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div>
              <textarea
                value={selected.html_template}
                onChange={(e) => updateTemplate(selected.id, { html_template: e.target.value })}
                className="h-[520px] w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-slate-600"
              />
            </div>
            <div>
              <div className="rounded-xl border border-slate-800 bg-white">
                {renderError ? (
                  <div className="p-3 text-xs text-rose-700">{renderError}</div>
                ) : renderedHtml ? (
                  <iframe
                    title="preview"
                    className="h-[520px] w-full rounded-xl"
                    srcDoc={renderedHtml}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="p-3 text-xs text-slate-700">
                    Натисни <b>Згенерувати превʼю</b>, щоб побачити результат.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-xs font-semibold text-slate-100">Тестові дані (JSON з 1C)</div>
              <textarea
                value={testJson}
                onChange={(e) => setTestJson(e.target.value)}
                className="mt-2 h-[220px] w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-slate-600"
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-100">Мапінг полів</div>
                <button
                  className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-slate-700"
                  onClick={() => resetMappings(selected.id)}
                >
                  Скинути
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    className={
                      c.id === activeCategory
                        ? 'rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-50'
                        : 'rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-900'
                    }
                    onClick={() => setActiveCategory(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 max-h-[170px] overflow-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-950">
                    <tr className="text-slate-400">
                      <th className="px-2 py-2">Template var</th>
                      <th className="px-2 py-2">1C field</th>
                      <th className="px-2 py-2">Transform</th>
                      <th className="px-2 py-2">Req</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryMappings.map((m) => (
                      <tr key={m.id} className="border-t border-slate-800">
                        <td className="px-2 py-2 font-mono text-slate-200">{m.template_variable}</td>
                        <td className="px-2 py-2">
                          <input
                            className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-slate-600"
                            value={m.source_field}
                            onChange={(e) => updateMapping(m.id, { source_field: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                            value={m.transform_function ?? ''}
                            onChange={(e) =>
                              updateMapping(m.id, {
                                transform_function: (e.target.value || null) as any,
                              })
                            }
                          >
                            <option value="">none</option>
                            <option value="formatDate">formatDate</option>
                            <option value="formatCurrency">formatCurrency</option>
                            <option value="uppercase">uppercase</option>
                            <option value="lowercase">lowercase</option>
                            <option value="trim">trim</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={m.is_required}
                            onChange={(e) => updateMapping(m.id, { is_required: e.target.checked })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
