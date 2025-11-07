// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  try {
    const { pathname, search } = req.nextUrl;
    const isAuth = req.cookies.get('auth')?.value === '1';

    // rotas públicas e estáticos
    const publicPaths = [
      '/login',
      '/debug',
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml',
      '/manifest.webmanifest',
    ];
    const isAsset =
      pathname.startsWith('/_next') ||
      pathname.startsWith('/assets') ||
      pathname.startsWith('/images') ||
      pathname.startsWith('/fonts') ||
      /\.(png|jpg|jpeg|gif|svg|ico|css|js|txt|woff2?)$/i.test(pathname);

    const isPublic = publicPaths.some(p => pathname.startsWith(p)) || isAsset;

    // não logado -> manda para /login com ?next=
    if (!isAuth && !isPublic) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
      return NextResponse.redirect(url);
    }

    // logado em /login -> volta para next ou /
    if (isAuth && pathname.startsWith('/login')) {
      const next = req.nextUrl.searchParams.get('next') || '/';
      const url = req.nextUrl.clone();
      url.pathname = next;
      url.search = '';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch (err) {
    // nunca derrube o app por erro de middleware
    console.error('middleware error:', err);
    return NextResponse.next();
  }
}

// matcher: protege tudo que não for estático
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|assets|images|fonts|api).*)',
  ],
};
