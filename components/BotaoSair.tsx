'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export function BotaoSair() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Cookies.remove('auth', { path: '/' }); // apaga o mesmo cookie do login
      router.refresh();                      // força reavaliação pelo middleware
      router.replace('/login');              // vai para o login
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
