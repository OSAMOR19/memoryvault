/**
 * MemoryVault Auth Utilities
 * localStorage-based authentication for demo/prototype purposes.
 */

const USER_KEY = 'memoryvault_user';
const AUTH_KEY = 'memoryvault_auth';
const REMEMBER_KEY = 'memoryvault_remember';

/**
 * Clear old v1 data and free up localStorage space.
 * Call this once on app boot.
 */
export function clearOldData() {
  if (typeof window === 'undefined') return;
  // Remove old v1 keys that might be filling up quota
  const oldKeys = ['memoryvault_capsules_v1', 'memoryvault_onboarded'];
  oldKeys.forEach((key) => {
    try { localStorage.removeItem(key); } catch {}
  });
  // If localStorage is nearly full, clear everything and start fresh
  try {
    localStorage.setItem('__quota_test__', 'x'.repeat(1024));
    localStorage.removeItem('__quota_test__');
  } catch {
    // Quota exceeded — clear all MemoryVault data to recover
    try {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem('memoryvault_capsules');
    } catch {}
  }
}

/**
 * Validate an email address format.
 */
export function validateEmail(email) {
  if (!email) return 'Email is required';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Please enter a valid email address';
  return null;
}

/**
 * Validate password strength.
 */
export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

/**
 * Validate a full name.
 */
export function validateName(name) {
  if (!name) return 'Full name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  return null;
}

/**
 * Simple hash for password storage (NOT for production — use bcrypt server-side).
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Get all stored users.
 */
function getUsers() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save users array to localStorage.
 */
function saveUsers(users) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(users));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      // Storage full — try to clear old capsule data and retry
      try {
        localStorage.removeItem('memoryvault_capsules');
        localStorage.setItem(USER_KEY, JSON.stringify(users));
      } catch {
        throw new Error('Storage is full. Please clear your browser data and try again.');
      }
    } else {
      throw e;
    }
  }
}

/**
 * Sign up a new user.
 * Returns { success: true, user } or { success: false, error }.
 */
export function signUp({ name, email, password }) {
  const nameError = validateName(name);
  if (nameError) return { success: false, error: nameError };

  const emailError = validateEmail(email);
  if (emailError) return { success: false, error: emailError };

  const passwordError = validatePassword(password);
  if (passwordError) return { success: false, error: passwordError };

  const users = getUsers();
  const exists = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (exists) {
    return { success: false, error: 'An account with this email already exists' };
  }

  const user = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);

  // Auto-login after signup
  setAuthSession(user);

  return { success: true, user: sanitizeUser(user) };
}

/**
 * Log in an existing user.
 * Returns { success: true, user } or { success: false, error }.
 */
export function logIn({ email, password, remember = false }) {
  const emailError = validateEmail(email);
  if (emailError) return { success: false, error: emailError };

  if (!password) return { success: false, error: 'Password is required' };

  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim()
  );

  if (!user) {
    return { success: false, error: 'No account found with this email' };
  }

  if (user.passwordHash !== simpleHash(password)) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  setAuthSession(user, remember);

  return { success: true, user: sanitizeUser(user) };
}

/**
 * Set the auth session in localStorage.
 */
function setAuthSession(user, remember = false) {
  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    loggedInAt: new Date().toISOString(),
    remember,
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, email);
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

/**
 * Get the current auth session, or null.
 */
export function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Check if a user is currently authenticated.
 */
export function isAuthenticated() {
  return getSession() !== null;
}

/**
 * Log out the current user.
 */
export function logOut() {
  localStorage.removeItem(AUTH_KEY);
}

/**
 * Get the remembered email, if any.
 */
export function getRememberedEmail() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(REMEMBER_KEY) || '';
}

/**
 * Strip sensitive fields before returning user data.
 */
function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}
