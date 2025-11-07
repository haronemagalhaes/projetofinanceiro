'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export function BotaoSair() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // encerra sessão do Firebase
      await signOut(auth);

      // remove o cookie do middleware
      Cookies.remove('auth', { path: '/' });

      // redireciona direto (sem refresh extra)
      router.replace('/login');
    } catch (e) {
      console.error('Erro ao sair:', e);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
    >
      Sair
    </button>
  );
}
