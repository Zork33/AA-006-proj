const ROLE_KEY = 'admin_role';

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

export function getUserRole() {
  return userRole;
}

export function isAuthenticated() {
  // Check if access_token cookie exists
  return document.cookie.includes('access_token=');
}

export function setAuthData(role?: string) {
  userRole = role ?? null;
  if (role) localStorage.setItem(ROLE_KEY, role);
  notify();
}

export function clearAuthData() {
  userRole = null;
  localStorage.removeItem(ROLE_KEY);
  notify();
}

export function loadAuthData() {
  const role = localStorage.getItem(ROLE_KEY);
  if (role) {
    userRole = role;
    notify();
  }
}

export function isSuperadmin() {
  return userRole === 'superadmin';
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include', // Send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearAuthData();
    throw new Error('Session expired');
  }

  return res;
}
