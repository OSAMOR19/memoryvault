'use client';

import { useState, useCallback } from 'react';
import { Link2, Check, Share2 } from 'lucide-react';
import styles from './ShareLinkButton.module.css';

/**
 * ShareLinkButton — Generates a shareable capsule URL and copies it to clipboard.
 *
 * @param {string} capsuleId - The capsule ID to generate the link for.
 * @param {string} [variant='default'] - 'default' | 'compact' | 'prominent'
 * @param {string} [className] - Optional extra class name.
 */
export default function ShareLinkButton({ capsuleId, variant = 'default', className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!capsuleId) return;

    const url = `${window.location.origin}/capsule/${capsuleId}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        console.warn('[NimCapsule] Failed to copy link');
      }
      document.body.removeChild(textarea);
    }
  }, [capsuleId]);

  const variantClass =
    variant === 'prominent'
      ? styles.prominent
      : variant === 'compact'
      ? styles.compact
      : styles.default;

  return (
    <button
      className={`${styles.shareButton} ${variantClass} ${copied ? styles.copied : ''} ${className}`}
      onClick={handleCopy}
      type="button"
      aria-label={copied ? 'Link copied' : 'Copy share link'}
    >
      <span className={styles.iconWrap}>
        {copied ? <Check size={16} /> : variant === 'compact' ? <Link2 size={16} /> : <Share2 size={16} />}
      </span>
      <span className={styles.label}>
        {copied ? 'Link Copied!' : variant === 'compact' ? 'Copy Link' : 'Copy Share Link'}
      </span>
    </button>
  );
}
