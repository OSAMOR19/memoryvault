'use client';

import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Link from 'next/link';
import { Shield, Mail, User, Info, CheckCircle, ArrowRight } from 'lucide-react';

export default function OAuthConsentPage() {
  return (
    <>
      <Navbar />
      <main style={{ 
        maxWidth: '800px', 
        margin: '120px auto 60px', 
        padding: '0 24px', 
        fontFamily: 'var(--font-geist), -apple-system, BlinkMacSystemFont, sans-serif', 
        color: '#1A1A1A', 
        lineHeight: '1.6' 
      }}>
        {/* Title Section */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '64px', 
            height: '64px', 
            borderRadius: '16px', 
            background: 'rgba(233, 177, 20, 0.1)', 
            color: '#E9B114',
            marginBottom: '16px'
          }}>
            <Shield size={32} />
          </div>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '800', 
            marginBottom: '12px', 
            letterSpacing: '-0.02em', 
            color: '#1A1A1A' 
          }}>
            Google OAuth Consent & Data Usage
          </h1>
          <p style={{ color: '#6B6B6B', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Learn how NimCapsule requests, accesses, and safeguards your Google user data when you authenticate.
          </p>
        </div>

        {/* Informational Card */}
        <div style={{ 
          background: '#FFFFFF', 
          border: '1px solid #EBE6DF', 
          borderRadius: '16px', 
          padding: '32px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          marginBottom: '32px'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: '#1A1A1A' }}>
            What information do we collect?
          </h2>
          <p style={{ color: '#6B6B6B', marginBottom: '24px' }}>
            NimCapsule requests only the minimum necessary information to authenticate your account and personalize your dashboard. We do not ask for or access sensitive system or contact scopes.
          </p>

          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '24px' }}>
            {/* Scope 1 */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ 
                color: '#E9B114', 
                background: 'rgba(233, 177, 20, 0.08)', 
                padding: '8px', 
                borderRadius: '8px',
                flexShrink: 0 
              }}>
                <Mail size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600' }}>Email Address</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B6B6B' }}>Used to send notifications when your capsules are ready to be unlocked.</p>
              </div>
            </div>

            {/* Scope 2 */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ 
                color: '#E9B114', 
                background: 'rgba(233, 177, 20, 0.08)', 
                padding: '8px', 
                borderRadius: '8px',
                flexShrink: 0 
              }}>
                <User size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600' }}>Basic Profile Info</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B6B6B' }}>Includes your display name and profile picture to personalize your dashboard interface.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Usage & Policy Compliance */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: '#1A1A1A' }}>
            How do we use your data?
          </h2>
          <p style={{ color: '#6B6B6B', marginBottom: '16px' }}>
            We adhere strictly to the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements. Here is how your data is handled:
          </p>

          <ul style={{ listStyleType: 'none', padding: 0, margin: '0 0 24px 0' }}>
            {[
              'We only use your profile and email to authorize your identity and maintain your account login session.',
              'We NEVER sell, trade, lease, or share your personal profile data with third-party advertising companies or data brokers.',
              'No human at NimCapsule reads or accesses your data unless required for security audits, legal obligations, or with your explicit consent for customer support.',
              'Your uploaded capsule contents (messages, letters, photos) are private to you and are not associated with any Google data profiling.'
            ].map((text, idx) => (
              <li key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px', color: '#6B6B6B' }}>
                <CheckCircle size={16} style={{ color: '#34A853', marginTop: '4px', flexShrink: 0 }} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Google API Compliance Box */}
        <div style={{ 
          background: '#FAF8F5', 
          borderLeft: '4px solid #E9B114', 
          padding: '20px', 
          borderRadius: '0 8px 8px 0',
          marginBottom: '40px' 
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', fontWeight: '700', color: '#1A1A1A' }}>
            <Info size={18} style={{ color: '#E9B114' }} />
            Google API Limited Use Disclosure
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B6B6B', lineHeight: '1.5' }}>
            NimCapsule's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
            <a 
              href="https://developers.google.com/terms/api-services-user-data-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#E9B114', textDecoration: 'underline', fontWeight: '600' }}
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </div>

        {/* Links & Navigation */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          borderTop: '1px solid #F3F0EB', 
          paddingTop: '32px',
          textAlign: 'center' 
        }}>
          <p style={{ color: '#9E9E9E', fontSize: '0.875rem', margin: 0 }}>
            Need more information? Review our standard documents:
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/privacy" style={{ color: '#6B6B6B', textDecoration: 'underline', fontWeight: '500' }}>
              Privacy Policy
            </Link>
            <Link href="/terms" style={{ color: '#6B6B6B', textDecoration: 'underline', fontWeight: '500' }}>
              Terms of Service
            </Link>
            <a href="mailto:support@nimcapsule.xyz" style={{ color: '#6B6B6B', textDecoration: 'underline', fontWeight: '500' }}>
              Contact Support
            </a>
          </div>

          <Link href="/login" style={{ 
            marginTop: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #E9B114, #C49710)',
            color: '#FFFFFF',
            fontWeight: '600',
            padding: '12px 24px',
            borderRadius: '12px',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(233, 177, 20, 0.15)',
            transition: 'transform 0.2s ease'
          }}>
            Continue to Login <ArrowRight size={16} />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
