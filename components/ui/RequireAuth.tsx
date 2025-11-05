'use client';

import { PropsWithChildren, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';

export default function RequireAuth({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(pathname || '/');
      router.replace(`/login?next=${next}`);
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-slate-500">
        Verificando sessão…
      </div>
    );
  }

  if (!user) return null; // enquanto redireciona

  return <>{children}</>;
}
