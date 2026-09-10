'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Lock,
  Cake,
  Heart,
  GraduationCap,
  Mail,
  Sparkles,
  Package,
  Gift,
  Clock,
  CheckCircle,
  PackageOpen,
  Search,
  Wallet,
  Download,
  Loader2,
  KeyRound,
  ShieldAlert,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  getCapsule,
  updateCapsule,
  claimGift,
  getEffectiveStatus,
  getPhotoUrl,
} from '../../lib/storage';
import {
  connectNimiqWallet,
  getStoredNimiqAddress,
  claimHTLC,
  setStoredNimiqAddress,
  isValidNimiqAddress,
  normalizeNimiqAddress,
} from '../../lib/nimiq';
import {
  isHTLCTimelockMature,
  verifySecret,
} from '../../lib/htlc';
import { formatLong, formatMedium, getCountdown } from '../../lib/dates';
import ShareLinkButton from '../../components/ShareLinkButton';
import styles from './capsule.module.css';

const AnniversaryIcon = ({ size }) => (
  <Heart size={size} style={{ display: 'block' }} />
);

const OCCASION_ICONS = {
  birthday: Cake,
  anniversary: AnniversaryIcon,
  graduation: GraduationCap,
  'love-letter': Mail,
  'just-because': Sparkles,
  custom: Package,
};

const QUOTES = [
  {
    text: 'The best time to plant a tree was twenty years ago. The second best time is now.',
    author: 'Chinese Proverb',
  },
  {
    text: 'What we keep in memory is ours unchanged forever.',
    author: 'Marion Zimmer Bradley',
  },
  {
    text: 'Time is the longest distance between two places.',
    author: 'Tennessee Williams',
  },
  {
    text: 'We do not remember days, we remember moments.',
    author: 'Cesare Pavese',
  },
  {
    text: 'The past beats inside me like a second heart.',
    author: 'John Banville',
  },
];

function Confetti() {
  const colors = ['#E9B114', '#F5D97A', '#4F6D5A', '#A3BFA8', '#C49710', '#F7F4EF'];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className={styles.confettiContainer}>
      {pieces.map((p) => (
        <div
          key={p.id}
          className={styles.confettiPiece}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function CapsuleDetailPage({ params }) {
  const resolvedParams = use(params);
  const capsuleId = resolvedParams.id;
  const router = useRouter();

  const [capsule, setCapsule] = useState(null);
  const [status, setStatus] = useState('sealed');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');

  // ── Season 2: PIN gate + on-chain verification state ──
  const [chainVerified, setChainVerified] = useState(null); // null=pending, true=mature, false=stillLocked
  const [chainVerifyInfo, setChainVerifyInfo] = useState(null);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [claimerWallet, setClaimerWallet] = useState('');
  const [claimerWalletError, setClaimerWalletError] = useState('');
  const [showPinGate, setShowPinGate] = useState(false); // trigger after "Open" click
  const [pinVerified, setPinVerified] = useState(false); // once passed, reveal content
  const [copiedPin, setCopiedPin] = useState(false);
  const [usingQuickConnect, setUsingQuickConnect] = useState(false);

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // Load capsule + AUTHORITATIVE on-chain timelock verification
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await getCapsule(capsuleId);
      if (cancelled) return;
      if (c) {
        setCapsule(c);
        setStatus(getEffectiveStatus(c));

        // ── Season 2: Verify HTLC on-chain (NOT the client clock, NOT the DB) ──
        if (c.htlc?.timeoutBlockHeight && c.status !== 'opened') {
          try {
            const maturity = await isHTLCTimelockMature(c.htlc.timeoutBlockHeight);
            if (cancelled) return;
            setChainVerifyInfo(maturity);
            setChainVerified(maturity.isMature);
            // Override status with on-chain truth if DB disagrees
            if (!maturity.isMature && status !== 'sealed' && status !== 'soon') {
              setStatus(maturity.blocksUntilMature <= 10080 ? 'soon' : 'sealed');
            } else if (maturity.isMature && status === 'sealed') {
              setStatus('unlockable');
            }
          } catch (err) {
            console.warn('[NimCapsule] Chain verification skipped:', err);
            setChainVerified(null);
          }
        } else {
          setChainVerified(true); // legacy capsules, no HTLC
        }

        // Pre-fill wallet if user has one connected
        const storedAddr = getStoredNimiqAddress();
        if (storedAddr) setClaimerWallet(storedAddr);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [capsuleId]);

  // Live countdown timer
  useEffect(() => {
    if (!capsule || status === 'opened') return;

    const tick = () => {
      const cd = getCountdown(capsule.unlockDate);
      setCountdown(cd);

      // Check if it just became unlockable (UI hint only; chain is authoritative)
      if (cd.total <= 0 && status === 'sealed' && chainVerified !== false) {
        setStatus('unlockable');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [capsule, status, chainVerified]);

  const handleOpen = useCallback(async () => {
    // AUTHORITATIVE check before allowing open:
    //  - Chain timelock must be mature
    //  - If gift attached, must enter PIN gate first
    if (chainVerified === false) {
      setPinError(
        `Chain lock active. ${chainVerifyInfo?.blocksUntilMature ?? 'Blocks'} remaining on Nimiq blockchain.`
      );
      return;
    }

    // If there's a NIM gift, the recipient must pass the PIN gate to open
    if (capsule?.gift?.enabled && !pinVerified) {
      setShowPinGate(true);
      return;
    }

    setOpening(true);
    setTimeout(async () => {
      const updated = await updateCapsule(capsuleId, {
        status: 'opened',
        openedAt: new Date().toISOString(),
      });
      setCapsule(updated);
      setStatus('opened');
      setOpening(false);
      setShowPinGate(false);
      if (updated?.gift?.enabled) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }, 2000);
  }, [capsuleId, capsule, chainVerified, chainVerifyInfo, pinVerified]);

  // ── Verify PIN against HTLC hashRoot ──
  const handleVerifyPin = useCallback(async () => {
    setPinError('');
    if (!pin.trim()) {
      setPinError('Enter the claim code shared by the capsule creator.');
      return false;
    }

    // Double-check chain timelock has matured (authoritative)
    if (capsule?.htlc?.timeoutBlockHeight) {
      const maturity = await isHTLCTimelockMature(capsule.htlc.timeoutBlockHeight);
      if (!maturity.isMature) {
        setPinError(`Still locked on-chain. ${maturity.blocksUntilMature ?? ''} blocks remaining.`);
        return false;
      }
    }

    if (capsule?.htlc?.hashRoot) {
      const ok = await verifySecret(pin.trim(), capsule.htlc.hashRoot);
      if (!ok) {
        // Also try combined secret PIN|long format in case of high-security capsule
        const alt = await verifySecret(
          pin.trim() + (capsule.htlc.longSecretEncrypted ? '' : ''),
          capsule.htlc.hashRoot
        );
        if (!alt) {
          setPinError('Incorrect claim code. Double-check the code the creator shared.');
          return false;
        }
      }
    }

    setPinVerified(true);
    setShowPinGate(false);
    return true;
  }, [pin, capsule]);

  // ── Handle NIM gift claim (ON-CHAIN payout) ──
  const handleClaim = useCallback(async () => {
    setClaiming(true);
    setClaimError('');
    setClaimerWalletError('');

    try {
      // 1. Validate PIN still passes (never skip — defense in depth)
      if (capsule?.htlc?.hashRoot) {
        const ok = await verifySecret(pin.trim(), capsule.htlc.hashRoot);
        if (!ok) {
          setClaimError('Claim code mismatch. Re-enter the code shared by the creator.');
          setClaiming(false);
          return;
        }
      }

      // 2. Get/validate recipient wallet
      let walletAddress = (claimerWallet || '').trim();
      if (!walletAddress) {
        const stored = getStoredNimiqAddress();
        if (stored) walletAddress = stored;
      }
      if (!walletAddress) {
        setClaiming(false);
        setUsingQuickConnect(true);
        try {
          const res = await connectNimiqWallet();
          if (res?.success && res.address) {
            walletAddress = res.address;
            setClaimerWallet(res.address);
          } else {
            setClaimError(res?.error || 'Enter a Nimiq wallet address or connect your wallet.');
            setUsingQuickConnect(false);
            return;
          }
        } finally {
          setUsingQuickConnect(false);
        }
      }
      if (!isValidNimiqAddress(walletAddress)) {
        setClaimerWalletError('Please enter a valid Nimiq address (NQXX …).');
        setClaiming(false);
        return;
      }
      walletAddress = normalizeNimiqAddress(walletAddress);
      setStoredNimiqAddress(walletAddress);

      // 3. AUTHORITATIVE on-chain timelock maturity check
      if (capsule?.htlc?.timeoutBlockHeight) {
        const maturity = await isHTLCTimelockMature(capsule.htlc.timeoutBlockHeight);
        if (!maturity.isMature) {
          setClaimError(
            `Capsule still locked on Nimiq blockchain. ` +
            `${maturity.blocksUntilMature ?? ''} blocks remaining.`
          );
          setClaiming(false);
          return;
        }
      }

      // 4. ⭐ REAL ON-CHAIN PAYOUT via HTLC claim (this was MISSING in S1)
      //    Old broken S1 behavior: only set a DB flag, no actual tokens moved.
      //    New S2 behavior: call claimHTLC → Nimiq network transfers locked funds.
      let claimTxHash = null;
      if (capsule?.gift?.enabled && capsule?.gift?.amount > 0 && capsule?.htlc?.contractAddress) {
        const combinedSecret = pin.trim();
        const htlcRes = await claimHTLC({
          contractAddress: capsule.htlc.contractAddress,
          secret: combinedSecret,
          recipientAddress: walletAddress,
        });
        if (!htlcRes?.success) {
          throw new Error(htlcRes?.error || 'On-chain HTLC claim failed. Your wallet rejected the transaction or the contract could not be reached.');
        }
        claimTxHash = htlcRes.txHash;
      }

      // 5. Record the claim event in our DB (last — only AFTER chain success)
      const updated = await claimGift(capsuleId, walletAddress, claimTxHash);
      setCapsule(updated);
      setClaimSuccess(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } catch (err) {
      console.error('[NimCapsule] Claim error:', err);
      setClaimError(err.message || 'Failed to claim gift. Please try again.');
    } finally {
      setClaiming(false);
    }
  }, [capsuleId, capsule, pin, claimerWallet]);

  const OccasionIcon = capsule ? (OCCASION_ICONS[capsule.occasion] || Package) : Package;

  // ── Loading state ──
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingDot} />
        <span className={styles.loadingText}>Finding your capsule...</span>
      </div>
    );
  }

  // ── Not found ──
  if (!capsule) {
    return (
      <div className={styles.notFound}>
        <div className={styles.notFoundIcon}>
          <Search size={32} />
        </div>
        <h2 className={styles.notFoundTitle}>Capsule not found</h2>
        <p className={styles.notFoundText}>
          This capsule may have been moved or no longer exists.
        </p>
        <Link href="/dashboard" className={styles.notFoundLink}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // ── Opening animation overlay ──
  if (opening) {
    return (
      <div className={styles.page}>
        <div className={styles.openingOverlay}>
          <div className={styles.envelope}>
            <div className={styles.envelopeFlap} />
            <div className={styles.envelopeBody} />
            <div className={styles.envelopeLetter}>
              <div className={styles.envelopeLetterLines}>
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
          <p className={styles.openingText}>Opening your capsule...</p>
        </div>
      </div>
    );
  }

  const statusLabel =
    status === 'sealed'
      ? 'Sealed'
      : status === 'soon'
      ? 'Opening Soon'
      : status === 'unlockable'
      ? 'Ready to Open'
      : 'Opened';

  const badgeClass =
    status === 'sealed'
      ? styles.badgeSealed
      : status === 'soon'
      ? styles.badgeSoon
      : status === 'unlockable'
      ? styles.badgeUnlockable
      : styles.badgeOpened;

  return (
    <div className={styles.page}>
      {showConfetti && <Confetti />}

      {/* Header */}
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backButton}>
          <ArrowLeft size={16} />
          Back
        </Link>
        <div className={`${styles.statusBadge} ${badgeClass}`}>
          {status === 'opened' ? (
            <CheckCircle size={14} />
          ) : status === 'unlockable' ? (
            <PackageOpen size={14} />
          ) : (
            <Lock size={14} />
          )}
          {statusLabel}
        </div>
        <ShareLinkButton capsuleId={capsuleId} variant="compact" className={styles.headerShareBtn} />
      </header>

      <div className={styles.content}>
        {/* ══════════ SEALED STATE ══════════ */}
        {(status === 'sealed' || status === 'soon') && (
          <div className={styles.sealedContainer}>
            <div className={styles.waxSeal}>
              <OccasionIcon size={120} strokeWidth={1.5} />
            </div>

            <h1 className={styles.capsuleTitle}>{capsule.title}</h1>
            <p className={styles.sealedDate}>
              Sealed on {formatMedium(capsule.createdAt)}
            </p>

            {/* Countdown */}
            <div className={styles.countdown}>
              <div className={styles.countdownUnit}>
                <div className={styles.countdownValue}>
                  {String(countdown.days).padStart(2, '0')}
                </div>
                <span className={styles.countdownLabel}>Days</span>
              </div>
              <span className={styles.countdownSep}>:</span>
              <div className={styles.countdownUnit}>
                <div className={styles.countdownValue}>
                  {String(countdown.hours).padStart(2, '0')}
                </div>
                <span className={styles.countdownLabel}>Hours</span>
              </div>
              <span className={styles.countdownSep}>:</span>
              <div className={styles.countdownUnit}>
                <div className={styles.countdownValue}>
                  {String(countdown.minutes).padStart(2, '0')}
                </div>
                <span className={styles.countdownLabel}>Min</span>
              </div>
              <span className={styles.countdownSep}>:</span>
              <div className={styles.countdownUnit}>
                <div className={styles.countdownValue}>
                  {String(countdown.seconds).padStart(2, '0')}
                </div>
                <span className={styles.countdownLabel}>Sec</span>
              </div>
            </div>

            {/* Locked Preview */}
            <div className={styles.lockedPreview}>
              <div className={styles.lockedBlur}>
                <p>
                  This content is sealed inside a time capsule. The message,
                  photos, and any attached gifts will be revealed when the
                  capsule reaches its unlock date. Until then, they remain
                  safely preserved, waiting for the right moment.
                </p>
              </div>
              <div className={styles.lockedOverlay}>
                <div className={styles.lockedIcon}>
                  <Lock size={22} />
                </div>
                <span className={styles.lockedText}>
                  Content sealed until {formatLong(capsule.unlockDate)}
                </span>
              </div>
            </div>

            {/* Quote */}
            <div className={styles.quote}>
              &ldquo;{quote.text}&rdquo;
              <span className={styles.quoteAuthor}>{quote.author}</span>
            </div>
          </div>
        )}

        {/* ══════════ UNLOCKABLE STATE ══════════ */}
        {status === 'unlockable' && (
          <div className={styles.unlockableContainer}>
            <div className={styles.waxSeal}>
              <OccasionIcon size={120} strokeWidth={1.5} />
            </div>

            <h1 className={styles.capsuleTitle}>{capsule.title}</h1>
            <p className={styles.sealedDate}>
              Sealed on {formatMedium(capsule.createdAt)}
            </p>

            {/* On-chain verification badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '999px',
              background: chainVerified
                ? 'rgba(79, 109, 90, 0.1)'
                : chainVerified === false ? 'rgba(233, 100, 50, 0.1)' : 'rgba(233, 177, 20, 0.1)',
              color: chainVerified
                ? '#4F6D5A'
                : chainVerified === false ? '#C7601F' : '#C49710',
              fontSize: '13px',
              fontWeight: 600,
              margin: '8px 0 4px',
            }}>
              {chainVerified ? (
                <><CheckCircle size={14} /> On-chain lock confirmed mature</>
              ) : chainVerified === false ? (
                <><ShieldAlert size={14} /> Chain lock still active — {chainVerifyInfo?.blocksUntilMature ?? '?'} blocks left</>
              ) : (
                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Verifying Nimiq blockchain…</>
              )}
            </div>

            {capsule?.htlc?.timeoutBlockHeight && chainVerifyInfo && (
              <p style={{
                fontSize: '12px',
                color: '#9E9E9E',
                marginTop: '4px',
                fontFamily: 'ui-monospace, monospace',
              }}>
                Height {chainVerifyInfo.currentBlockHeight ?? '—'} / Target {capsule.htlc.timeoutBlockHeight}
              </p>
            )}

            <p className={styles.readyText}>
              The wait is over. Your capsule is ready to be opened.
            </p>

            <button className={styles.openButton} onClick={handleOpen} disabled={chainVerified === false}>
              <PackageOpen size={24} />
              {capsule?.gift?.enabled ? 'Enter Claim Code & Open' : 'Open This Capsule'}
            </button>

            {pinError && (
              <div style={{
                marginTop: '16px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(233, 100, 50, 0.08)',
                border: '1px solid rgba(233, 100, 50, 0.2)',
                color: '#C7601F',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                {pinError}
              </div>
            )}
          </div>
        )}

        {/* ══════════ OPENED STATE ══════════ */}
        {status === 'opened' && (
          <div className={styles.openedContainer}>
            <div className={styles.openedHeader}>
              <div className={styles.openedSeal}>
                <OccasionIcon size={32} strokeWidth={1.5} />
              </div>
              <h1 className={styles.openedTitle}>{capsule.title}</h1>
            </div>

            {/* Message */}
            {capsule.message && (
              <div className={styles.messageCard}>
                <div className={styles.messageInner}>{capsule.message}</div>
              </div>
            )}

            {/* Photos */}
            {capsule.photos && capsule.photos.length > 0 && (
              <div className={styles.photoSection}>
                <div className={styles.photoSectionLabel}>Memories</div>
                <div className={styles.photoGrid}>
                  {capsule.photos.map((src, i) => (
                    <div
                      key={i}
                      className={`${styles.photo} ${
                        capsule.photos.length === 1 ? styles.photoSingle : ''
                      }`}
                    >
                      <img src={getPhotoUrl(src)} alt={`Memory ${i + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gift */}
            {capsule.gift?.enabled && capsule.gift.amount > 0 && (
              <div className={styles.giftCard}>
                <div className={styles.giftIcon}>
                  <Gift size={28} />
                </div>
                <div className={styles.giftLabel}>Gift Enclosed</div>
                <div className={styles.giftAmount}>
                  {capsule.gift.amount}
                  <span className={styles.giftUnit}> NIM</span>
                </div>

                {/* ── Claim Button / Claimed Badge ── */}
                {capsule.gift.claimed ? (
                  <div className={styles.claimedSection}>
                    <div className={styles.claimedBadge}>
                      <CheckCircle size={18} />
                      <span>Claimed</span>
                    </div>
                    {capsule.gift.claimedBy && (
                      <div className={styles.claimedDetails}>
                        <span className={styles.claimedAddress}>
                          {capsule.gift.claimedBy.length > 16
                            ? `${capsule.gift.claimedBy.slice(0, 8)}...${capsule.gift.claimedBy.slice(-6)}`
                            : capsule.gift.claimedBy}
                        </span>
                        {capsule.gift.claimedAt && (
                          <span className={styles.claimedDate}>
                            {formatMedium(capsule.gift.claimedAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : claimSuccess ? (
                  <div className={styles.claimSuccessSection}>
                    <div className={styles.claimSuccessIcon}>
                      <CheckCircle size={24} />
                    </div>
                    <div className={styles.claimSuccessText}>Gift Claimed Successfully!</div>
                  </div>
                ) : (
                  <div className={styles.claimSection} style={{ width: '100%' }}>
                    {/* PIN Input */}
                    <div style={{ width: '100%', textAlign: 'left', marginBottom: '14px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#1A1A1A',
                        marginBottom: '8px',
                      }}>
                        <KeyRound size={14} />
                        Claim Code
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={pinVisible ? 'text' : 'password'}
                          placeholder="Enter the 6-digit code from the creator"
                          value={pin}
                          onChange={(e) => {
                            setPin(e.target.value);
                            setPinError('');
                          }}
                          maxLength={16}
                          style={{
                            width: '100%',
                            padding: '12px 44px 12px 14px',
                            border: pinError
                              ? '1px solid #E8845A'
                              : '1px solid #E0DCD5',
                            borderRadius: '10px',
                            fontSize: '18px',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            letterSpacing: '4px',
                            fontWeight: 700,
                            background: '#FAFAF7',
                            textAlign: 'center',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setPinVisible(!pinVisible)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9E9E9E',
                            padding: '4px',
                          }}
                          aria-label={pinVisible ? 'Hide code' : 'Show code'}
                        >
                          {pinVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {pinError && (
                        <p style={{
                          fontSize: '12px',
                          color: '#C7601F',
                          marginTop: '6px',
                        }}>{pinError}</p>
                      )}
                    </div>

                    {/* Recipient Wallet Address */}
                    <div style={{ width: '100%', textAlign: 'left', marginBottom: '18px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#1A1A1A',
                        marginBottom: '8px',
                      }}>
                        <Wallet size={14} />
                        Receive To — Your Nimiq Wallet Address
                      </label>
                      <input
                        type="text"
                        placeholder="NQXX AAAA BBBB CCCC DDDD EEEE FFFF GGGG HHHH"
                        value={claimerWallet}
                        onChange={(e) => {
                          setClaimerWallet(e.target.value);
                          setClaimerWalletError('');
                        }}
                        maxLength={60}
                        style={{
                          width: '100%',
                          padding: '12px 44px 12px 14px',
                          border: claimerWalletError
                            ? '1px solid #E8845A'
                            : '1px solid #E0DCD5',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          background: '#FAFAF7',
                        }}
                      />
                      {claimerWalletError && (
                        <p style={{
                          fontSize: '12px',
                          color: '#C7601F',
                          marginTop: '6px',
                        }}>{claimerWalletError}</p>
                      )}
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <NimiqWalletButtonStandalone onAddress={(a) => setClaimerWallet(a)} compact />
                      </div>
                    </div>

                    <button
                      className={styles.claimButton}
                      onClick={handleClaim}
                      disabled={claiming || usingQuickConnect}
                      type="button"
                      id="claim-nim-button"
                    >
                      {claiming || usingQuickConnect ? (
                        <>
                          <Loader2 size={20} className={styles.claimSpinner} />
                          <span>{claiming ? 'Claiming on-chain…' : 'Connecting wallet…'}</span>
                        </>
                      ) : (
                        <>
                          <Download size={20} />
                          <span>Claim {capsule.gift.amount} NIM</span>
                        </>
                      )}
                    </button>
                    {claimError && (
                      <div className={styles.claimError}>{claimError}</div>
                    )}
                    <p className={styles.claimHint}>
                      Claims are broadcast directly to the Nimiq blockchain via your wallet.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Date stamps */}
            <div className={styles.datesStamp}>
              <div className={styles.dateStampItem}>
                <div className={styles.dateStampLabel}>Sealed</div>
                <div className={styles.dateStampValue}>
                  {formatMedium(capsule.createdAt)}
                </div>
              </div>
              <div className={styles.dateStampItem}>
                <div className={styles.dateStampLabel}>Opened</div>
                <div className={styles.dateStampValue}>
                  {formatMedium(capsule.openedAt)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════════════ PIN GATE MODAL (gift capsules) ════════════ */}
      {showPinGate && !opening && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,26,26,0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '32px 28px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            animation: 'fadeInScale 0.3s cubic-bezier(.2,.9,.3,1.2)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 20px',
              borderRadius: '20px',
              background: 'rgba(233, 177, 20, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Lock size={32} strokeWidth={1.8} style={{ color: '#E9B114' }} />
            </div>
            <h2 style={{
              textAlign: 'center',
              fontSize: '22px',
              fontWeight: 800,
              color: '#1A1A1A',
              marginBottom: '8px',
            }}>Enter Claim Code</h2>
            <p style={{
              textAlign: 'center',
              fontSize: '14px',
              color: '#6B6B6B',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}>
              The capsule creator shared a 6-digit code with you.
              Enter it below to unlock and receive your NIM gift.
            </p>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <input
                type={pinVisible ? 'text' : 'password'}
                placeholder="000000"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setPinError(''); }}
                maxLength={16}
                autoFocus
                style={{
                  width: '100%',
                  padding: '16px 52px 16px 16px',
                  border: pinError
                    ? '2px solid #E8845A'
                    : '2px solid #E0DCD5',
                  borderRadius: '14px',
                  fontSize: '28px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  letterSpacing: '10px',
                  fontWeight: 800,
                  textAlign: 'center',
                  background: '#FAFAF7',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              <button
                type="button"
                onClick={() => setPinVisible(!pinVisible)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9E9E9E',
                  padding: '6px',
                }}
              >
                {pinVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {pinError && (
              <div style={{
                marginBottom: '18px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(233, 100, 50, 0.08)',
                border: '1px solid rgba(233, 100, 50, 0.2)',
                color: '#C7601F',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                {pinError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowPinGate(false);
                  setPinError('');
                }}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '15px',
                  background: '#F0ECE4',
                  color: '#1A1A1A',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  const ok = await handleVerifyPin();
                  if (ok) {
                    setOpening(true);
                    setTimeout(async () => {
                      const updated = await updateCapsule(capsuleId, {
                        status: 'opened',
                        openedAt: new Date().toISOString(),
                      });
                      setCapsule(updated);
                      setStatus('opened');
                      setOpening(false);
                      setShowPinGate(false);
                      setShowConfetti(true);
                      setTimeout(() => setShowConfetti(false), 4000);
                    }, 2000);
                  }
                }}
                disabled={claiming}
                style={{
                  flex: 2,
                  padding: '14px 18px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '15px',
                  background: 'linear-gradient(135deg,#E9B114,#C49710)',
                  color: '#FFFFFF',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(233,177,20,0.3)',
                }}
              >
                {claiming ? 'Verifying…' : 'Unlock & Open'}
              </button>
            </div>

            {capsule?.htlc?.timeoutBlockHeight && chainVerifyInfo && (
              <p style={{
                fontSize: '11px',
                color: '#9E9E9E',
                textAlign: 'center',
                marginTop: '18px',
                fontFamily: 'ui-monospace, monospace',
              }}>
                Chain verified · Block {chainVerifyInfo.currentBlockHeight} ≥ {capsule.htlc.timeoutBlockHeight}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini inline wallet button variant (for claim form) ──
import { useEffect, useState as _useState } from 'react';
function NimiqWalletButtonStandalone({ onAddress, compact = false }) {
  const [addr, setAddr] = _useState('');
  const [loading, setLoading] = _useState(false);
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? getStoredNimiqAddress() : '';
    if (stored) {
      setAddr(stored);
      onAddress?.(stored);
    }
  }, []);
  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await connectNimiqWallet();
      if (res?.success && res.address) {
        setAddr(res.address);
        onAddress?.(res.address);
      }
    } finally {
      setLoading(false);
    }
  };
  if (addr) {
    const display = addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
    return (
      <button type="button" onClick={handleConnect} style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: compact ? '6px 12px' : '10px 16px',
        borderRadius: '999px',
        background: 'rgba(79,109,90,0.12)',
        color: '#4F6D5A',
        fontSize: '12px',
        fontWeight: 600,
      }}>
        <Check size={14} />
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{display}</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={handleConnect} disabled={loading} style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: compact ? '6px 12px' : '10px 16px',
      borderRadius: '999px',
      background: '#F0ECE4',
      color: '#1A1A1A',
      fontSize: '12px',
      fontWeight: 600,
    }}>
      <Wallet size={14} />
      {loading ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}
