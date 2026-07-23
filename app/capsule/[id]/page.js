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
} from 'lucide-react';
import {
  getCapsule,
  updateCapsule,
  getEffectiveStatus,
  getPhotoUrl,
} from '../../lib/storage';
import { formatLong, formatMedium, getCountdown } from '../../lib/dates';
import ShareLinkButton from '../../components/ShareLinkButton';
import styles from './capsule.module.css';

const AnniversaryIcon = ({ size }) => (
  <img src="/Sheba.svg" alt="Anniversary" width={size} height={size} style={{ display: 'block' }} />
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

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // Load capsule
  useEffect(() => {
    (async () => {
      const c = await getCapsule(capsuleId);
      if (c) {
        setCapsule(c);
        setStatus(getEffectiveStatus(c));
      }
      setLoading(false);
    })();
  }, [capsuleId]);

  // Live countdown timer
  useEffect(() => {
    if (!capsule || status === 'opened') return;

    const tick = () => {
      const cd = getCountdown(capsule.unlockDate);
      setCountdown(cd);

      // Check if it just became unlockable
      if (cd.total <= 0 && status === 'sealed') {
        setStatus('unlockable');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [capsule, status]);

  const handleOpen = useCallback(async () => {
    setOpening(true);
    setTimeout(async () => {
      const updated = await updateCapsule(capsuleId, {
        status: 'opened',
        openedAt: new Date().toISOString(),
      });
      setCapsule(updated);
      setStatus('opened');
      setOpening(false);
      if (updated?.gift?.enabled) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }, 2000);
  }, [capsuleId]);

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

            <p className={styles.readyText}>
              The wait is over. Your capsule is ready to be opened.
            </p>

            <button className={styles.openButton} onClick={handleOpen}>
              <PackageOpen size={24} />
              Open This Capsule
            </button>
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
    </div>
  );
}
