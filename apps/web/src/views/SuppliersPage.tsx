import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabase';

type Supplier = {
  id: string;
  name: string;
  country: string | null;
  created_at: string;
};

export function SuppliersPage() {
  const offline = supabase == null;
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [search, setSearch] = useState('');

  const q = useQuery({
    queryKey: ['suppliers', search],
    enabled: !offline,
    queryFn: async () => {
      const res = await apiFetch<{ success: true; data: Supplier[]; total: number }>(
        `/api/suppliers?search=${encodeURIComponent(search)}`,
      );
      return res;
    },
  });

  const createM = useMutation({
    mutationFn: async () =>
      apiFetch<{ success: true; data: Supplier }>(`/api/suppliers`, {
        method: 'POST',
        body: JSON.stringify({ name, country: country || undefined }),
      }),
    onSuccess: async () => {
      setName('');
      setCountry('');
      await qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const delM = useMutation({
    mutationFn: async (id: string) => apiFetch(`/api/suppliers/${id}`, { method: 'DELETE' }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const suppliers = q.data?.data ?? [];
  const total = q.data?.total ?? 0;

  const hint = useMemo(() => {
    if (offline) return 'Офлайн-режим: налаштуй `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, щоб працювати з Supabase.';
    if (q.isLoading) return 'Завантаження...';
    if (q.isError) return (q.error as Error).message;
    return null;
  }, [offline, q.isLoading, q.isError, q.error]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createM.mutateAsync();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Постачальники</div>
          <div className="mt-1 text-sm text-slate-300">Всього: {total}</div>
        </div>
      </div>

      {hint ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3 text-sm text-slate-300">
          {hint}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
        <div className="text-sm font-semibold">Додати постачальника</div>
        <form onSubmit={onSubmit} className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-slate-600"
            placeholder="Назва"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={offline || createM.isPending}
          />
          <input
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-slate-600"
            placeholder="Країна (опційно)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={offline || createM.isPending}
          />
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
            disabled={offline || createM.isPending}
          >
            {createM.isPending ? 'Додаю...' : 'Додати'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">Список</div>
          <input
            className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-slate-600"
            placeholder="Пошук за назвою..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={offline}
          />
        </div>

        <div className="mt-3 overflow-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950">
              <tr className="text-slate-400">
                <th className="px-3 py-2">Назва</th>
                <th className="px-3 py-2">Країна</th>
                <th className="px-3 py-2">Дії</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-slate-300">{s.country ?? '—'}</td>
                  <td className="px-3 py-2">
                    <button
                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700 disabled:opacity-60"
                      onClick={() => delM.mutate(s.id)}
                      disabled={offline || delM.isPending}
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && !q.isLoading ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-sm text-slate-400">
                    Нічого не знайдено
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

