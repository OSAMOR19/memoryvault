'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Shield,
} from 'lucide-react';
import { changePassword, validatePassword } from '../lib/auth';
import { supabase } from '../lib/supabase';
import styles from './reset-password.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase will automatically handle the token from the URL hash
  // and establish a session when the user arrives via the reset link
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSessionReady(true);
        }
        if (event === 'SIGNED_IN') {
          setSessionReady(true);
        }
      }
    );

    // Also check if there's already a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validate
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword(password);

      if (result.success) {
        setSuccess(true);
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <img src="/logo.png" alt="MemoryVault" width={22} height={22} style={{ display: 'block' }} />
          </div>
          <span className={styles.logoText}>MemoryVault</span>
        </div>

        <div className={styles.card}>
          {success ? (
            /* ── Success State ── */
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <CheckCircle size={32} />
              </div>
              <h2 className={styles.cardTitle}>Password updated!</h2>
              <p className={styles.cardSubtitle}>
                Your password has been successfully reset. You&apos;ll be redirected to your dashboard in a moment.
              </p>
              <Link href="/dashboard" className={styles.submitButton} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', marginTop: '24px' }}>
                Go to Dashboard
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : !sessionReady ? (
            /* ── Loading / Invalid Link ── */
            <div className={styles.loadingState}>
              <div className={styles.loadingIcon}>
                <Shield size={28} />
              </div>
              <h2 className={styles.cardTitle}>Verifying your link...</h2>
              <p className={styles.cardSubtitle}>
                Please wait while we verify your password reset link. If this takes too long, the link may have expired.
              </p>
              <Link href="/forgot-password" className={styles.backLink}>
                Request a new reset link
              </Link>
            </div>
          ) : (
            /* ── Form State ── */
            <>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Set new password</h2>
                <p className={styles.cardSubtitle}>
                  Choose a strong password for your MemoryVault account.
                </p>
              </div>

              {error && (
                <div className={styles.globalError}>
                  <span className={styles.globalErrorIcon}>
                    <AlertCircle size={18} />
                  </span>
                  {error}
                </div>
              )}

              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                {/* New Password */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="new-password">
                    New password
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      autoFocus
                      style={{ paddingRight: '48px' }}
                    />
                    <span className={styles.inputIcon}>
                      <KeyRound size={18} />
                    </span>
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="confirm-password">
                    Confirm new password
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      className={styles.input}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      style={{ paddingRight: '48px' }}
                    />
                    <span className={styles.inputIcon}>
                      <KeyRound size={18} />
                    </span>
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password requirements */}
                <div className={styles.requirements}>
                  <p className={styles.requirementsTitle}>Password must have:</p>
                  <ul className={styles.requirementsList}>
                    <li className={password.length >= 8 ? styles.met : ''}>At least 8 characters</li>
                    <li className={/[A-Z]/.test(password) ? styles.met : ''}>One uppercase letter</li>
                    <li className={/[a-z]/.test(password) ? styles.met : ''}>One lowercase letter</li>
                    <li className={/[0-9]/.test(password) ? styles.met : ''}>One number</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  <span className={styles.buttonContent}>
                    {isLoading ? 'Updating...' : 'Update password'}
                    {!isLoading && <ArrowRight size={18} />}
                  </span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
