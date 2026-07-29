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
  Sparkles,
  Package,
  Shield,
} from 'lucide-react';
import { logIn, signInWithGoogle, getRememberedEmail, isAuthenticated, loginWithNimiqWallet } from '../lib/auth';
import { getNimiqAuthIdentity, isNimiqHost } from '../lib/nimiq';
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

  const [activeSlide, setActiveSlide] = useState(0);
  const slides = [
    {
      title: "Time-Locked Capsules",
      description: "Seal messages, photos, and letters in a digital vault. They stay securely locked until your exact chosen unlock date.",
      illustration: (
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(233, 177, 20, 0.1)', animation: 'pulseGlow 2s infinite ease-in-out' }} />
          <div style={{ position: 'absolute', width: '80%', height: '80%', borderRadius: '50%', background: 'rgba(233, 177, 20, 0.15)' }} />
          <Lock size={48} style={{ color: '#E9B114', zIndex: 1 }} />
        </div>
      )
    },
    {
      title: "Schedule for Any Occasion",
      description: "Deliver memories for birthdays, graduations, anniversaries, or wedding days. The perfect surprise for the future.",
      illustration: (
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(233, 177, 20, 0.08)' }} />
          <div style={{ position: 'absolute', width: '80%', height: '80%', border: '2px dashed rgba(233, 177, 20, 0.4)', borderRadius: '50%', animation: 'rotateClock 20s linear infinite' }} />
          <Clock size={48} style={{ color: '#E9B114', zIndex: 1 }} />
        </div>
      )
    },
    {
      title: "Attach NIM Crypto Gifts",
      description: "Add NIM cryptocurrency to your capsules. The recipient receives the crypto automatically when the capsule opens.",
      illustration: (
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(233, 177, 20, 0.1)' }} />
          <div style={{ animation: 'floatCoin 3s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#E9B114" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="56" height="56">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
              <path d="M12 6L6 9.5v5l6 3.5 6-3.5v-5z" opacity="0.6" />
            </svg>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(slideInterval);
  }, [slides.length]);

  useEffect(() => {
    // Redirect if already logged in
    (async () => {
      if (await isAuthenticated()) {
        router.push('/dashboard');
        return;
      }

      // Auto-detect Nimiq Host and prompt 1-click login
      if (isNimiqHost()) {
        handleNimiqLogin();
      }
    })();
    // Pre-fill remembered email
    const remembered = getRememberedEmail();
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, [router]);
  async function handleGoogleLogin() {
    setIsLoading(true);
    setGlobalError('');
    try {
      const result = await signInWithGoogle();
      if (result && !result.success) {
        setGlobalError(result.error || 'Failed to start Google sign-in.');
        setIsLoading(false);
      }
    } catch (err) {
      setGlobalError(err.message || 'Something went wrong with Google sign-in.');
      setIsLoading(false);
    }
  }

  async function handleNimiqLogin() {
    setIsLoading(true);
    setGlobalError('');
    try {
      const identity = await getNimiqAuthIdentity();
      if (!identity) {
        setGlobalError('Open this app inside Nimiq Pay to connect your wallet.');
        setIsLoading(false);
        return;
      }
      const result = await loginWithNimiqWallet(identity);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setGlobalError(result.error || 'Open this app inside Nimiq Pay to connect your wallet.');
        setIsLoading(false);
      }
    } catch (err) {
      setGlobalError('Open this app inside Nimiq Pay to connect your wallet.');
      setIsLoading(false);
    }
  }

  async function handleSubmit(e) {
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

    try {
      const result = await logIn({ email, password, remember });

      if (result.success) {
        router.push('/dashboard');
      } else {
        setGlobalError(result.error);
        setIsLoading(false);
      }
    } catch (err) {
      setGlobalError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Left Branding Panel ── */}
      <aside className={styles.brandPanel}>
        <div className={styles.brandPanelInner} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
          <div className={styles.brandLogo} style={{ width: '96px', height: '96px', marginBottom: '24px', justifyContent: 'center' }}>
            <div className={styles.brandLogoIcon} style={{ width: '96px', height: '96px', borderRadius: '24px' }}>
              <img src="/logo.png" alt="NimCapsule" width={96} height={96} style={{ display: 'block' }} />
            </div>
          </div>

          <h1 className={styles.brandName} style={{ textAlign: 'center', fontSize: '38px', marginBottom: '8px', width: '100%' }}>NimCapsule</h1>
          <p className={styles.brandTagline} style={{ textAlign: 'center', fontSize: '18px', color: '#6B6B6B', marginBottom: '40px', width: '100%', fontStyle: 'normal' }}>Your memories, sealed in time.</p>

          {/* Carousel */}
          <div style={{ width: '100%', maxWidth: '380px', marginTop: '20px' }}>
            <div style={{ minHeight: '280px', textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }} key={activeSlide}>
              {slides[activeSlide].illustration}
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>
                {slides[activeSlide].title}
              </h2>
              <p style={{ fontSize: '15px', color: '#6B6B6B', lineHeight: '1.6', margin: '0' }}>
                {slides[activeSlide].description}
              </p>
            </div>

            {/* Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    border: 'none',
                    background: activeSlide === idx ? '#E9B114' : 'rgba(233, 177, 20, 0.25)',
                    cursor: 'pointer',
                    padding: '0',
                    transition: 'background 0.3s ease'
                  }}
                  type="button"
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
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
              <img src="/logo.png" alt="NimCapsule" width={22} height={22} style={{ display: 'block' }} />
            </div>
            <span className={styles.mobileLogoText}>NimCapsule</span>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Welcome back</h2>
              <p className={styles.cardSubtitle}>
                Sign in to revisit your sealed memories
              </p>
            </div>

            {/* Social & Nimiq Buttons */}
            <div className={styles.socialButtons}>
              <button
                type="button"
                className={styles.socialButton}
                onClick={handleNimiqLogin}
                style={{ background: 'linear-gradient(135deg, #E9B114, #C49710)', color: '#FFF', fontWeight: 600, border: 'none', marginBottom: '8px' }}
              >
                <span className={styles.socialIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" style={{ display: 'block' }}>
                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
                  </svg>
                </span>
                Continue with Nimiq Wallet
              </button>
              <button type="button" className={styles.socialButton} onClick={handleGoogleLogin} disabled={isLoading}>
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
                <a href="/forgot-password" className={styles.forgotLink}>
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
