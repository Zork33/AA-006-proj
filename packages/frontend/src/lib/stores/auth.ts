const STORAGE_KEY = 'admin_token';
const REFRESH_KEY = 'admin_refresh';
const ROLE_KEY = 'admin_role';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let userRole: string | null = null;
let listeners: Array<() => void> = [];

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeAuth(fn: () => void) {
  listeners = [...listeners, fn];
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function getAuthToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function getUserRole() {
  return userRole;
}

export function isAuthenticated() {
  return !!accessToken;
}

export function setTokens(access: string, refresh: string, role?: string) {
  accessToken = access;
  refreshToken = refresh;
  userRole = role ?? null;
  localStorage.setItem(STORAGE_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  if (role) localStorage.setItem(ROLE_KEY, role);
  notify();
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  userRole = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
  notify();
}

export function loadTokens() {
  const access = localStorage.getItem(STORAGE_KEY);
  const refresh = localStorage.getItem(REFRESH_KEY);
  const role = localStorage.getItem(ROLE_KEY);
  if (access) {
    accessToken = access;
    refreshToken = refresh;
    userRole = role || decodeRole(access);
    notify();
  }
}

function decodeRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

export function isSuperadmin() {
  return userRole === 'superadmin';
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = accessToken;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearTokens();
    throw new Error('Session expired');
  }

  return res;
}
