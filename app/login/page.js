'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Clock,
  Gift,
  Heart,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Vault,
  Shield,
  Sparkles,
} from 'lucide-react';
import { logIn, getRememberedEmail, isAuthenticated } from '../lib/auth';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Redirect if already logged in
    if (isAuthenticated()) {
      router.push('/dashboard');
      return;
    }
    // Pre-fill remembered email
    const remembered = getRememberedEmail();
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, [router]);

  function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setGlobalError('');

    // Client-side field validation
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    // Simulate slight network delay for realism
    setTimeout(() => {
      const result = logIn({ email, password, remember });

      if (result.success) {
        router.push('/dashboard');
      } else {
        setGlobalError(result.error);
        setIsLoading(false);
      }
    }, 600);
  }

  return (
    <div className={styles.page}>
      {/* ── Left Branding Panel ── */}
      <aside className={styles.brandPanel}>
        <div className={styles.decorativeIcons}>
          <Lock size={48} className={`${styles.decorIcon} ${styles.decorIcon1}`} />
          <Clock size={40} className={`${styles.decorIcon} ${styles.decorIcon2}`} />
          <Gift size={36} className={`${styles.decorIcon} ${styles.decorIcon3}`} />
          <Heart size={44} className={`${styles.decorIcon} ${styles.decorIcon4}`} />
        </div>

        <div className={styles.brandPanelInner}>
          <div className={styles.brandLogo}>
            <div className={styles.brandLogoIcon}>
              <Vault size={22} />
            </div>
          </div>

          <h1 className={styles.brandName}>MemoryVault</h1>
          <p className={styles.brandTagline}>Your memories, sealed in time.</p>

          <div className={styles.brandFeatures}>
            <div className={styles.brandFeature}>
              <div className={styles.brandFeatureIcon}>
                <Lock size={18} />
              </div>
              <span className={styles.brandFeatureText}>
                Encrypted time capsules only you can unlock
              </span>
            </div>
            <div className={styles.brandFeature}>
              <div className={styles.brandFeatureIcon}>
                <Clock size={18} />
              </div>
              <span className={styles.brandFeatureText}>
                Schedule memories to open on any future date
              </span>
            </div>
            <div className={styles.brandFeature}>
              <div className={styles.brandFeatureIcon}>
                <Gift size={18} />
              </div>
              <span className={styles.brandFeatureText}>
                Attach photos, letters, and digital gifts
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right Form Panel ── */}
      <main className={styles.formPanel}>
        <div className={styles.formContainer}>
          {/* Mobile logo */}
          <div className={styles.mobileLogo}>
            <div className={styles.mobileLogoIcon}>
              <Vault size={18} />
            </div>
            <span className={styles.mobileLogoText}>MemoryVault</span>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Welcome back</h2>
              <p className={styles.cardSubtitle}>
                Sign in to revisit your sealed memories
              </p>
            </div>

            {/* Social Buttons */}
            <div className={styles.socialButtons}>
              <button type="button" className={styles.socialButton}>
                <span className={styles.socialIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </span>
                Continue with Google
              </button>
              <button type="button" className={styles.socialButton}>
                <span className={styles.socialIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1A1A1A">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                </span>
                Continue with Apple
              </button>
            </div>

            {/* Divider */}
            <div className={styles.divider}>
              <div className={styles.dividerLine} />
              <span className={styles.dividerText}>or continue with email</span>
              <div className={styles.dividerLine} />
            </div>

            {/* Global Error */}
            {globalError && (
              <div className={styles.globalError}>
                <span className={styles.globalErrorIcon}>
                  <AlertCircle size={18} />
                </span>
                {globalError}
              </div>
            )}

            {/* Form */}
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="login-email">
                  Email address
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="login-email"
                    type="email"
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    autoComplete="email"
                    autoFocus
                  />
                  <span className={styles.inputIcon}>
                    <Mail size={18} />
                  </span>
                </div>
                {errors.email && (
                  <p className={styles.fieldError}>{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="login-password">
                  Password
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    autoComplete="current-password"
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
                {errors.password && (
                  <p className={styles.fieldError}>{errors.password}</p>
                )}
              </div>

              {/* Options row */}
              <div className={styles.formOptions}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <a href="#" className={styles.forgotLink}>
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading}
              >
                <span className={styles.buttonContent}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                  {!isLoading && <ArrowRight size={18} />}
                </span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className={styles.footerText}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className={styles.footerLink}>
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
