'use client';

import { useState } from 'react';
import RequireAuth from '@/components/ui/RequireAuth';
import DashboardGeral from './Home/DashboardGeral';
import RendaFixa from './Home/RendaFixa';
import Poupanca from './Home/Poupanca';
import Freelancer from './Home/Freelancer';
import CartoesCredito from './Home/Cartoes/CartoesCredito';
import GastosFixos from './Home/GastosFixos';
import { LayoutDashboard, Repeat, Wallet, CreditCard, Briefcase, PiggyBank, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const TABS = [
  { id: 'rendafixa',  label: 'Renda Fixa',   icon: Repeat,         component: RendaFixa },
  { id: 'gastosfixos',label: 'Gastos Fixos', icon: Wallet,         component: GastosFixos },
  { id: 'cartoes',    label: 'Cartões',      icon: CreditCard,     component: CartoesCredito },
  { id: 'freelancer', label: 'Freelancer',   icon: Briefcase,      component: Freelancer },
  { id: 'poupanca',   label: 'Poupança',     icon: PiggyBank,      component: Poupanca },
  { id: 'dashboard',  label: 'Dashboard',    icon: LayoutDashboard,component: DashboardGeral },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Page() {
  const [active, setActive] = useState<TabId>('rendafixa');
  const ActiveComp = TABS.find(t => t.id === active)?.component ?? null;
  const { user } = useAuth();

  return (
    <RequireAuth>
      <div className="min-h-screen bg-neutral-50 text-slate-900 dark:bg-[#0b0d12] dark:text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Painel Financeiro</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Gerencie suas finanças de forma inteligente
              </p>
              {user?.email && (
                <p className="text-xs text-slate-500 mt-1">Logado como: {user.email}</p>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => signOut(auth)}
              className="gap-2"
              title="Sair"
            >
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </header>

          <nav className="sticky top-0 z-10 mb-6 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 backdrop-blur dark:bg-white/5 dark:ring-white/10">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {TABS.map(({ id, label, icon: Icon }) => {
                const isActive = active === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActive(id)}
                    className={[
                      'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                      'ring-1 ring-transparent',
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-50 ring-slate-200 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10 dark:ring-white/10',
                    ].join(' ')}
                    aria-pressed={isActive}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </nav>

          <section className="space-y-6">{ActiveComp && <ActiveComp />}</section>
        </div>
      </div>
    </RequireAuth>
  );
}
