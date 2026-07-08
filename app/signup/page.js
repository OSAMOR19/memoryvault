'use client';

import { useState, useEffect, useMemo } from 'react';
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
  User,
  Vault,
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  signUp,
  validateEmail,
  validatePassword,
  validateName,
  isAuthenticated,
} from '../lib/auth';
import styles from './signup.module.css';

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
}

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    (async () => {
      if (await isAuthenticated()) {
        router.push('/dashboard');
      }
    })();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setGlobalError('');

    // Validate all fields
    const newErrors = {};
    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    if (nameErr) newErrors.name = nameErr;
    if (emailErr) newErrors.email = emailErr;
    if (passErr) newErrors.password = passErr;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp({ name, email, password });

      if (result.success && !result.needsConfirmation) {
        router.push('/dashboard');
      } else if (result.success && result.needsConfirmation) {
        setGlobalError('');
        setIsLoading(false);
        // Show confirmation message — user must verify email
        alert('Account created! Please check your email to confirm your account, then log in.');
        router.push('/login');
      } else {
        setGlobalError(result.error);
        setIsLoading(false);
      }
    } catch (err) {
      setGlobalError(err.message || 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  }

  const strengthClasses = ['', styles.strengthSegmentActive1, styles.strengthSegmentActive2, styles.strengthSegmentActive3, styles.strengthSegmentActive4];
  const strengthTextClasses = ['', styles.strengthWeak, styles.strengthFair, styles.strengthGood, styles.strengthStrong];

  return (
    <div className={styles.page}>
      {/* ── Left Branding Panel ── */}
      <aside className={styles.brandPanel}>
        <div className={styles.decorativeIcons}>
          <Heart size={48} className={`${styles.decorIcon} ${styles.decorIcon1}`} />
          <Sparkles size={40} className={`${styles.decorIcon} ${styles.decorIcon2}`} />
          <Gift size={36} className={`${styles.decorIcon} ${styles.decorIcon3}`} />
          <Clock size={44} className={`${styles.decorIcon} ${styles.decorIcon4}`} />
        </div>

        <div className={styles.brandPanelInner}>
          <div className={styles.brandLogo}>
            <div className={styles.brandLogoIcon}>
              <Vault size={22} />
            </div>
          </div>

          <h1 className={styles.brandName}>MemoryVault</h1>
          <p className={styles.brandTagline}>
            Begin preserving what matters most.
          </p>

          {/* Testimonial */}
          <div className={styles.brandTestimonial}>
            <p className={styles.testimonialQuote}>
              &ldquo;I sealed a letter for my daughter to open on her 18th birthday. Knowing it will be waiting for her in the future gives me such peace.&rdquo;
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>S</div>
              <div>
                <p className={styles.testimonialName}>Sarah M.</p>
                <p className={styles.testimonialRole}>Member since 2025</p>
              </div>
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
              <h2 className={styles.cardTitle}>Create your vault</h2>
              <p className={styles.cardSubtitle}>
                Start preserving memories for the future
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
              {/* Name */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="signup-name">
                  Full name
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="signup-name"
                    type="text"
                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    autoComplete="name"
                    autoFocus
                  />
                  <span className={styles.inputIcon}>
                    <User size={18} />
                  </span>
                </div>
                {errors.name && (
                  <p className={styles.fieldError}>{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="signup-email">
                  Email address
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="signup-email"
                    type="email"
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    autoComplete="email"
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
                <label className={styles.label} htmlFor="signup-password">
                  Password
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    autoComplete="new-password"
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

                {/* Strength indicator */}
                {password.length > 0 && (
                  <>
                    <div className={styles.strengthBar}>
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`${styles.strengthSegment} ${
                            strength.score >= level ? strengthClasses[level] : ''
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`${styles.strengthText} ${strengthTextClasses[strength.score]}`}>
                      {strength.label}
                    </p>
                  </>
                )}

                {errors.password && (
                  <p className={styles.fieldError}>{errors.password}</p>
                )}
              </div>

              {/* Terms */}
              <p className={styles.termsText}>
                By creating an account, you agree to our{' '}
                <a href="#" className={styles.termsLink}>Terms of Service</a>
                {' '}and{' '}
                <a href="#" className={styles.termsLink}>Privacy Policy</a>
              </p>

              {/* Submit */}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading}
              >
                <span className={styles.buttonContent}>
                  {isLoading ? 'Creating your vault...' : 'Create account'}
                  {!isLoading && <ArrowRight size={18} />}
                </span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" className={styles.footerLink}>
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
