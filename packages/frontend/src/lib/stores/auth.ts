const ROLE_KEY = 'user_role';
const USER_ID_KEY = 'user_id';
const USER_CODE_KEY = 'user_code';

let userRole: string | null = null;
let userId: string | null = null;
let userCode: string | null = null;
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

export function getUserId() {
  return userId;
}

export function getUserCode() {
  return userCode;
}

export function isAuthenticated() {
  return localStorage.getItem(ROLE_KEY) !== null;
}

export function setAuthData(role?: string, id?: string, code?: string) {
  userRole = role ?? null;
  userId = id ?? null;
  userCode = code ?? null;
  if (role) localStorage.setItem(ROLE_KEY, role);
  if (id) localStorage.setItem(USER_ID_KEY, id);
  if (code) localStorage.setItem(USER_CODE_KEY, code);
  notify();
}

export function clearAuthData() {
  userRole = null;
  userId = null;
  userCode = null;
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_CODE_KEY);
  notify();
}

export function loadAuthData() {
  const role = localStorage.getItem(ROLE_KEY);
  const id = localStorage.getItem(USER_ID_KEY);
  const code = localStorage.getItem(USER_CODE_KEY);
  if (role) {
    userRole = role;
    userId = id;
    userCode = code;
    notify();
  }
}

export function isSuperAdmin() {
  return userRole === 'super_admin';
}

export function isPartnerAdmin() {
  return userRole === 'super_admin' || userRole === 'partner_admin';
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
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
