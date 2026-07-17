'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { requestPasswordReset } from '../lib/auth';
import styles from './forgot-password.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await requestPasswordReset(email);

      if (result.success) {
        setSent(true);
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
          {sent ? (
            /* ── Success state ── */
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <CheckCircle size={32} />
              </div>
              <h2 className={styles.cardTitle}>Check your email</h2>
              <p className={styles.cardSubtitle}>
                We&apos;ve sent a password reset link to <strong>{email}</strong>. 
                Click the link in the email to reset your password.
              </p>
              <p className={styles.hint}>
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button
                  type="button"
                  className={styles.resendButton}
                  onClick={() => {
                    setSent(false);
                    setError('');
                  }}
                >
                  try again
                </button>
              </p>
              <Link href="/login" className={styles.backLink}>
                <ArrowLeft size={16} />
                Back to sign in
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Forgot password?</h2>
                <p className={styles.cardSubtitle}>
                  Enter the email address you used to sign up and we&apos;ll send you a link to reset your password.
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
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="forgot-email">
                    Email address
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="forgot-email"
                      type="email"
                      className={styles.input}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                    />
                    <span className={styles.inputIcon}>
                      <Mail size={18} />
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  <span className={styles.buttonContent}>
                    {isLoading ? 'Sending...' : 'Send reset link'}
                    {!isLoading && <ArrowRight size={18} />}
                  </span>
                </button>
              </form>

              <Link href="/login" className={styles.backLink}>
                <ArrowLeft size={16} />
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
