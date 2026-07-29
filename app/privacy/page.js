'use client';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '120px auto 60px', padding: '0 24px', fontFamily: 'var(--font-geist), -apple-system, BlinkMacSystemFont, sans-serif', color: '#1A1A1A', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.02em', color: '#1A1A1A' }}>Privacy Policy</h1>
        <p style={{ color: '#9E9E9E', fontSize: '0.875rem', marginBottom: '32px' }}>Last updated: July 29, 2026</p>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>1. Introduction</h2>
          <p style={{ color: '#6B6B6B', marginBottom: '16px' }}>Welcome to NimCapsule. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our digital time capsule service.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>2. Data We Collect</h2>
          <p style={{ color: '#6B6B6B', marginBottom: '12px' }}>When you register or use NimCapsule, we may collect:</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '24px', marginBottom: '16px', color: '#6B6B6B' }}>
            <li style={{ marginBottom: '8px' }}>Personal identifiers (name, email address).</li>
            <li style={{ marginBottom: '8px' }}>Authenticating credentials from third-party login providers (Google).</li>
            <li style={{ marginBottom: '8px' }}>Content you upload to capsules (messages, photos).</li>
            <li style={{ marginBottom: '8px' }}>Web3 wallet addresses if you connect Nimiq Wallet.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>3. How We Use Your Data</h2>
          <p style={{ color: '#6B6B6B', marginBottom: '16px' }}>We use your information to operate and maintain your time capsules, deliver automated notification emails when your capsules unlock, manage your account session, and ensure application security.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>4. Security</h2>
          <p style={{ color: '#6B6B6B', marginBottom: '16px' }}>All capsule content, including messages and uploaded photos, is stored securely using cloud database configurations. We implement standard encryption and access controls to prevent unauthorized data access.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>5. Contact Us</h2>
          <p style={{ color: '#6B6B6B', marginBottom: '16px' }}>If you have any questions about this Privacy Policy, please contact us at: support@nimcapsule.xyz.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
