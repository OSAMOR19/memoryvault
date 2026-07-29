'use client';

import { useState, useEffect } from 'react';
import { connectNimiqWallet, disconnectNimiqWallet, getStoredNimiqAddress, isNimiqHost } from '../lib/nimiq';
import { Wallet, Check, LogOut, ChevronDown } from 'lucide-react';
import styles from './NimiqWalletButton.module.css';

export default function NimiqWalletButton({ className = '' }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Initial check
    const stored = getStoredNimiqAddress();
    if (stored) {
      setAddress(stored);
    } else if (isNimiqHost()) {
      // Auto-connect if in Nimiq host
      connectNimiqWallet().then((res) => {
        if (res?.success) setAddress(res.address);
      });
    }

    const handleWalletChanged = (e) => {
      setAddress(e.detail?.address || '');
    };

    window.addEventListener('nimiq-wallet-changed', handleWalletChanged);
    return () => {
      window.removeEventListener('nimiq-wallet-changed', handleWalletChanged);
    };
  }, []);

  const [errorMsg, setErrorMsg] = useState('');

  const handleConnect = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await connectNimiqWallet();
      if (res?.success) {
        setAddress(res.address);
      } else {
        const msg = res?.error || 'Open this app inside Nimiq Pay to connect your wallet.';
        setErrorMsg(msg);
        alert(msg);
      }
    } catch (err) {
      console.error('[NimCapsule] Nimiq connection error:', err);
      const msg = 'Open this app inside Nimiq Pay to connect your wallet.';
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnectNimiqWallet();
    setAddress('');
    setDropdownOpen(false);
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (address) {
    return (
      <div className={`${styles.container} ${className}`}>
        <button
          className={styles.connectedBtn}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.nimiqLogo} style={{ width: '18px', height: '18px', display: 'inline-block' }}>
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
          </svg>
          <span className={styles.addressText}>{formatAddress(address)}</span>
          <ChevronDown size={14} className={styles.chevron} />
        </button>

        {dropdownOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownTitle}>Nimiq Wallet</span>
              <span className={styles.dropdownAddress}>{address}</span>
            </div>
            <div className={styles.dropdownDivider} />
            <button className={styles.disconnectItem} onClick={handleDisconnect}>
              <LogOut size={14} />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className={`${styles.connectBtn} ${className}`}
      onClick={handleConnect}
      disabled={loading}
      type="button"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.nimiqLogo} style={{ width: '18px', height: '18px', display: 'inline-block' }}>
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
      </svg>
      <span>{loading ? 'Connecting...' : 'Connect Nimiq Wallet'}</span>
    </button>
  );
}
