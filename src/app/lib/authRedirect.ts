const AUTH_ROUTES = ['/signin', '/register', '/verify-email'];

export function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';

  const pathname = value.split(/[?#]/, 1)[0];
  if (AUTH_ROUTES.some((route) => pathname === route)) return '/';

  return value;
}

export function authRoute(route: 'signin' | 'register', returnTo: string) {
  return `/${route}?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}
