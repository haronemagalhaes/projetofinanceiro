'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebaseConfig';
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { Eye, EyeOff, LogIn } from 'lucide-react';

// Se você usa shadcn-ui:
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Se não tiver shadcn, troque pelos seus inputs/botões.

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const allowed = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL || '').trim().toLowerCase();

  // Se quiser permitir vários e-mails, use:
  // const allowedList = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '')
  //   .split(',')
  //   .map((s) => s.trim().toLowerCase())
  //   .filter(Boolean);

  const validateAllowed = (mail: string) => {
    const m = (mail || '').trim().toLowerCase();
    if (!allowed) return true; // se não configurou, não bloqueia
    return m === allowed;
    // Para lista:
    // return allowedList.length === 0 ? true : allowedList.includes(m);
  };

  const setAuthCookie = () => {
    // cookie simples pro middleware liberar
    document.cookie = 'auth=1; Path=/; Max-Age=2592000; SameSite=Lax';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!validateAllowed(email)) {
      setErro('Este e-mail não está autorizado a acessar o painel.');
      return;
    }

    try {
      setLoading(true);
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, senha);
      setAuthCookie();
      router.replace('/'); // vai pro painel
    } catch (err: any) {
      const code = String(err?.code || err?.message || err);
      let msg = 'Falha ao entrar. Verifique e-mail e senha.';
      if (code.includes('auth/invalid-credential')) msg = 'E-mail ou senha inválidos.';
      if (code.includes('auth/user-not-found')) msg = 'Usuário não encontrado.';
      if (code.includes('auth/wrong-password')) msg = 'Senha incorreta.';
      if (code.includes('auth/too-many-requests')) msg = 'Muitas tentativas. Tente novamente mais tarde.';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  // Opcional: criar usuário (apenas se o e-mail for permitido)
  const handleCreate = async () => {
    setErro(null);
    if (!validateAllowed(email)) {
      setErro('Este e-mail não está autorizado a criar conta.');
      return;
    }
    try {
      setLoading(true);
      await setPersistence(auth, browserLocalPersistence);
      await createUserWithEmailAndPassword(auth, email, senha);
      setAuthCookie();
      router.replace('/');
    } catch (err: any) {
      const code = String(err?.code || err?.message || err);
      let msg = 'Não foi possível criar a conta.';
      if (code.includes('auth/email-already-in-use')) msg = 'Este e-mail já está em uso.';
      if (code.includes('auth/weak-password')) msg = 'Senha muito fraca (mín. 6 caracteres).';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#0b0d12] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow ring-1 ring-slate-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <header className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Entrar no Painel Financeiro
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Acesso restrito por e-mail autorizado
          </p>
        </header>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="senha">Senha</Label>
            <div className="relative mt-1">
              <Input
                id="senha"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-2 inline-flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {erro && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900">
              {erro}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <LogIn size={16} />
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        {/* Ações auxiliares */}
        <div className="mt-4 space-y-2 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>
            Primeiro acesso?{' '}
            <button
              onClick={handleCreate}
              className="underline decoration-dotted underline-offset-4 hover:text-slate-700 dark:hover:text-slate-200"
              disabled={loading}
            >
              Criar conta
            </button>{' '}
            (somente e-mail autorizado).
          </p>
          <p className="opacity-70">
            E-mail permitido: {allowed ? <code>{allowed}</code> : ''}
          </p>
        </div>
      </div>
    </main>
  );
}
