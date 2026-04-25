import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/templates', label: 'Templates' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/settings', label: 'Settings' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user) navigate('/login');
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) navigate('/login');
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const activeClass = useMemo(
    () => 'rounded-lg px-3 py-2 text-sm font-medium bg-slate-800 text-white',
    [],
  );
  const idleClass = useMemo(
    () => 'rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white',
    [],
  );

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold tracking-tight">Invoice Template Engine</div>
            <div className="text-xs text-slate-400">Admin panel</div>
          </div>
          <div className="flex items-center gap-3">
            {email ? <div className="text-xs text-slate-300">{email}</div> : null}
            <button
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium hover:bg-slate-700"
              onClick={async () => {
                await supabase.auth.signOut();
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? activeClass : idleClass)}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/30 p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

