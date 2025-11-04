'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid, TrendingUp, Briefcase, CreditCard, Repeat,
  PiggyBank, LineChart, Moon, Sun
} from 'lucide-react';

type Item = { id: string; label: string; icon: React.ComponentType<any>; aliasOf?: string };

export default function TopNav() {
  // Nova sequência com "Gastos Fixos" no lugar de "Despesas"
  const items: Item[] = useMemo(() => ([
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'renda-fixa', label: 'Renda', icon: TrendingUp, aliasOf: 'renda-fixa' },
    { id: 'freelancer', label: 'Freelancer', icon: Briefcase },
    { id: 'cartoes', label: 'Cartões', icon: CreditCard },
    { id: 'renda-fixa-dup', label: 'Renda Fixa', icon: Repeat, aliasOf: 'renda-fixa' },
    { id: 'poupanca', label: 'Poupança', icon: PiggyBank, aliasOf: 'gastos-fixos' },
    { id: 'gastos-fixos', label: 'Gastos Fixos', icon: LineChart },
  ]), []);

  const [active, setActive] = useState<string>('dashboard');
  const [dark, setDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );

  // Observa as seções para destacar o ativo
  useEffect(() => {
    const ids = ['dashboard', 'renda-fixa', 'freelancer', 'cartoes', 'gastos-fixos'];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const scrollTo = (targetId: string) => {
    const id =
      targetId === 'renda-fixa-dup' ? 'renda-fixa'
      : targetId === 'poupanca' ? 'gastos-fixos'
      : (items.find(i => i.id === targetId)?.aliasOf ?? targetId);

    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = !dark;
    setDark(next);
    root.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) {
        const isDark = saved === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        setDark(isDark);
      }
    } catch {}
  }, []);

  return (
    <div className="sticky top-4 z-40 mx-auto w-full max-w-6xl px-4">
      {/* Cabeçalho superior */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-[15px] font-medium text-blue-600">Painel Financeiro</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 -mt-0.5">
            Gerencie suas finanças de forma inteligente
          </p>
        </div>
        <button
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-700 shadow ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700"
          aria-label="Alternar tema"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Menu principal */}
      <nav className="bg-white/90 backdrop-blur rounded-full shadow-md ring-1 ring-zinc-200 px-2 py-1.5 dark:bg-zinc-900/80 dark:ring-zinc-700">
        <ul className="flex flex-wrap items-center gap-1">
          {items.map(({ id, label, icon: Icon, aliasOf }) => {
            const realId = aliasOf ?? id;
            const isActive = active === realId;
            return (
              <li key={id}>
                <button
                  onClick={() => scrollTo(id)}
                  className={[
                    'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-all',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                  ].join(' ')}
                >
                  <Icon size={16} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
