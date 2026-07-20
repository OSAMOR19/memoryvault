/**
 * MemoryVault — Auth Utilities (Supabase)
 *
 * All authentication flows powered by Supabase Auth.
 */

import { supabase } from './supabase';

// ── Validation helpers (unchanged) ────────────────────────

export function validateEmail(email) {
  if (!email) return 'Email is required';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Please enter a valid email address';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

export function validateName(name) {
  if (!name) return 'Full name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  return null;
}

// ── Sign Up ───────────────────────────────────────────────

export async function signUp({ name, email, password }) {
  const nameError = validateName(name);
  if (nameError) return { success: false, error: nameError };

  const emailError = validateEmail(email);
  if (emailError) return { success: false, error: emailError };

  const passwordError = validatePassword(password);
  if (passwordError) return { success: false, error: passwordError };

  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: {
      data: { name: name.trim() },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { success: false, error: 'An account with this email already exists' };
    }
    return { success: false, error: error.message };
  }

  // If Supabase has email confirmation enabled but returns a user with no
  // identities, the email already exists (duplicate signup attempt).
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { success: false, error: 'An account with this email already exists' };
  }

  // If there's a session, user is auto-confirmed and logged in
  if (data.session) {
    return {
      success: true,
      user: {
        id: data.user.id,
        name: name.trim(),
        email: data.user.email,
        createdAt: data.user.created_at,
      },
    };
  }

  // No session = email confirmation is required
  return {
    success: true,
    needsConfirmation: true,
    user: {
      id: data.user.id,
      name: name.trim(),
      email: data.user.email,
      createdAt: data.user.created_at,
    },
  };
}

// ── Nimiq Wallet 1-Click Login ───────────────────────────

export async function loginWithNimiqWallet(identity) {
  if (!identity || !identity.address) {
    return { success: false, error: 'Could not detect Nimiq Wallet account.' };
  }

  const cleanId = identity.address.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const nimiqEmail = `nimiq_${cleanId}@memoryvault.com`;
  const nimiqPassword = `NimiqPass_${cleanId}!`;
  const nimiqName = identity.type === 'account' ? `Nimiq (${identity.address.slice(0, 10)}...)` : 'Nimiq Wallet User';

  // 1. Try signing in if user account already exists
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: nimiqEmail,
    password: nimiqPassword,
  });

  if (signInData?.session && signInData?.user) {
    const profile = await getProfile(signInData.user.id);
    return {
      success: true,
      user: {
        id: signInData.user.id,
        name: profile?.name || nimiqName,
        email: signInData.user.email,
        createdAt: signInData.user.created_at,
      },
    };
  }

  // 2. If user doesn't exist, auto-signup
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: nimiqEmail,
    password: nimiqPassword,
    options: {
      data: { name: nimiqName },
    },
  });

  if (signUpError) {
    // If user already exists but password login failed, attempt password reset / direct sign in
    if (signUpError.message.includes('already registered')) {
      const { data: retryData } = await supabase.auth.signInWithPassword({
        email: nimiqEmail,
        password: nimiqPassword,
      });
      if (retryData?.session) {
        return {
          success: true,
          user: {
            id: retryData.user.id,
            name: nimiqName,
            email: retryData.user.email,
            createdAt: retryData.user.created_at,
          },
        };
      }
    }
    return { success: false, error: signUpError.message };
  }

  if (signUpData?.session && signUpData?.user) {
    return {
      success: true,
      user: {
        id: signUpData.user.id,
        name: nimiqName,
        email: signUpData.user.email,
        createdAt: signUpData.user.created_at,
      },
    };
  }

  if (signUpData?.user && !signUpData?.session) {
    // Supabase requires email confirmation in dashboard settings
    return {
      success: false,
      error: 'Please disable "Confirm Email" in Supabase Auth settings to enable 1-click Nimiq Wallet login.',
    };
  }

  return { success: false, error: 'Failed to authenticate Nimiq Wallet.' };
}

// ── Google OAuth ──────────────────────────────────────────

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // The browser will redirect to Google, so this line
  // is only reached if something went wrong.
  return { success: true };
}

// ── Log In ────────────────────────────────────────────────

export async function logIn({ email, password, remember = false }) {
  const emailError = validateEmail(email);
  if (emailError) return { success: false, error: emailError };

  if (!password) return { success: false, error: 'Password is required' };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: 'Invalid email or password. Please try again.' };
    }
    return { success: false, error: error.message };
  }

  // Store remembered email
  if (remember) {
    try { localStorage.setItem('memoryvault_remember', email); } catch {}
  } else {
    try { localStorage.removeItem('memoryvault_remember'); } catch {}
  }

  const profile = await getProfile(data.user.id);

  return {
    success: true,
    user: {
      id: data.user.id,
      name: profile?.name || data.user.user_metadata?.name || '',
      email: data.user.email,
      createdAt: data.user.created_at,
    },
  };
}

// ── Session ───────────────────────────────────────────────

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const profile = await getProfile(session.user.id);

  return {
    id: session.user.id,
    name: profile?.name || session.user.user_metadata?.name || '',
    email: session.user.email,
    createdAt: session.user.created_at,
  };
}

export async function isAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}

// ── Log Out ───────────────────────────────────────────────

export async function logOut() {
  await supabase.auth.signOut();
}

// ── Profile helpers ───────────────────────────────────────

export async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, profile: data };
}

// ── Password ──────────────────────────────────────────────

export async function changePassword(newPassword) {
  const pwError = validatePassword(newPassword);
  if (pwError) return { success: false, error: pwError };

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Password Reset Request ────────────────────────────────

export async function requestPasswordReset(email) {
  const emailError = validateEmail(email);
  if (emailError) return { success: false, error: emailError };

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.toLowerCase().trim(),
    {
      redirectTo: `${window.location.origin}/reset-password`,
    }
  );

  if (error) return { success: false, error: error.message };

  // Always return success even if email doesn't exist (security best practice)
  return { success: true };
}

// ── Delete account ────────────────────────────────────────
// Note: Full account deletion requires a server-side function with
// service_role key. For now we sign out and delete profile data.
export async function deleteAccount(userId) {
  // Delete user's capsules (cascade will handle photos)
  await supabase.from('capsules').delete().eq('user_id', userId);
  // Delete profile
  await supabase.from('profiles').delete().eq('id', userId);
  // Sign out
  await supabase.auth.signOut();
  return { success: true };
}

// ── Remember email ────────────────────────────────────────

export function getRememberedEmail() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('memoryvault_remember') || '';
}

// ── Legacy cleanup ────────────────────────────────────────

export function clearOldData() {
  if (typeof window === 'undefined') return;
  const oldKeys = [
    'memoryvault_capsules_v1', 'memoryvault_onboarded',
    'memoryvault_user', 'memoryvault_auth', 'memoryvault_capsules',
  ];
  oldKeys.forEach((key) => {
    try { localStorage.removeItem(key); } catch {}
  });
}
