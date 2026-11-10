import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifyToken } from './lib/auth';

const roleDestinations = {
  ADMIN: '/dashboard/admin',
  EMPLOYEE: '/dashboard/employee',
  CLIENT: '/dashboard/client',
};

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifyToken(token) : null;
  const destination = roleDestinations[String(session?.role || '').toUpperCase()];
  const isLoginPage = pathname === '/login' || pathname === '/login/';
  const isHomePage = pathname === '/' || pathname === '/home';
  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  if ((isLoginPage || isHomePage) && destination) {
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isDashboard) {
    if (!session?.userId || !destination) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return NextResponse.redirect(new URL(destination, request.url));
    }

    if (pathname !== destination && !pathname.startsWith(`${destination}/`)) {
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/home', '/login', '/dashboard/:path*'],
};