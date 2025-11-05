import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const isAuth = req.cookies.get('auth')?.value === '1';
  const url = req.nextUrl.clone();

  // Protege tudo, exceto login
  if (!isAuth && !url.pathname.startsWith('/login')) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Se já logado e tentar acessar /login, manda pro painel
  if (isAuth && url.pathname.startsWith('/login')) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api).*)'],
};
