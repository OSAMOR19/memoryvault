'use client';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '120px auto 60px', padding: '0 24px', fontFamily: 'var(--font-geist), -apple-system, BlinkMacSystemFont, sans-serif', color: '#1A1A1A', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.02em', color: '#1A1A1A' }}>Terms of Service</h1>
        <p style={{ color: '#9E9E9E', fontSize: '0.875rem', marginBottom: '32px' }}>Last updated: July 29, 2026</p>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>1. Agreement to Terms</h2>
          <p style={{ color: '#6B6B6B', marginBottom: '16px' }}>By accessing or using NimCapsule, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>2. Use of Service</h2>
          <p style={{ color: '#6B6B6B', marginBottom: '16px' }}>NimCapsule provides a digital time capsule system allowing users to store messages, photos, and gifts that unlock at a designated future date. You are responsible for ensuring that all content you upload complies with local laws and regulations.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>3. Prohibited Content</h2>
          <p style={{ color: '#6B6B6B', marginBottom: '16px' }}>You agree not to upload, store, or transmit any content that is illegal, abusive, defamatory, infringing on intellectual property, or containing malicious code. We reserve the right to remove any content that violates these guidelines or terminate associated accounts.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>4. Disclaimer of Warranties</h2>
          <p style={{ color: '#6B6B6B', marginBottom: '16px' }}>The service is provided on an "as is" and "as available" basis. While we strive to ensure high availability and securely preserve your capsule data, NimCapsule cannot guarantee that data will never be lost or that the service will be entirely uninterrupted.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>5. Limitation of Liability</h2>
          <p style={{ color: '#6B6B6B', marginBottom: '16px' }}>To the maximum extent permitted by law, NimCapsule and its developers shall not be liable for any indirect, incidental, or consequential damages resulting from data loss, account suspension, or the inability to use the service.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
