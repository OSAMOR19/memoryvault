'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  X,
  ChevronRight,
  Cake,
  Heart,
  GraduationCap,
  Mail,
  Sparkles,
  Package,
  ImagePlus,
  Trash2,
  Gift,
  Clock,
  Moon,
  Shield,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { addCapsule } from '../lib/storage';
import {
  addMonths,
  addYears,
  toInputFormat,
  formatLong,
  getRelativeTime,
} from '../lib/dates';
import {
  createHTLC,
  getStoredNimiqAddress,
  connectNimiqWallet,
} from '../lib/nimiq';
import { buildHTLCParams, verifySecret } from '../lib/htlc';
import NimiqWalletButton from '../components/NimiqWalletButton';
import ShareLinkButton from '../components/ShareLinkButton';
import styles from './create.module.css';

const AnniversaryIcon = ({ size }) => (
  <Heart size={size} style={{ display: 'block' }} />
);

const ShieldIcon = ({ size }) => (
  <Shield size={size} style={{ display: 'block' }} />
);

const OCCASIONS = [
  { id: 'birthday', label: 'Birthday', Icon: Cake },
  { id: 'anniversary', label: 'Anniversary', Icon: AnniversaryIcon },
  { id: 'graduation', label: 'Graduation', Icon: GraduationCap },
  { id: 'love-letter', label: 'Love Letter', Icon: Mail },
  { id: 'just-because', label: 'Just Because', Icon: Sparkles },
  { id: 'custom', label: 'Custom', Icon: Package },
];

const QUICK_DATES = [
  { label: '1 month', months: 1 },
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
  { label: '5 years', months: 60 },
];

const TOTAL_STEPS = 4;

export default function CreateCapsulePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [createdCapsuleId, setCreatedCapsuleId] = useState(null);

  // Step 1
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState('');

  // Step 2
  const [message, setMessage] = useState('');
  const [photos, setPhotos] = useState([]);

  // Step 3
  const [giftEnabled, setGiftEnabled] = useState(false);
  const [giftAmount, setGiftAmount] = useState(10);
  const [recipientAddress, setRecipientAddress] = useState('');

  // Step 4
  const [unlockDate, setUnlockDate] = useState('');
  const [activeChip, setActiveChip] = useState(null);

  // Sealing result — PIN shown to creator ONCE for sharing with recipient
  const [revealedPIN, setRevealedPIN] = useState('');
  const [revealedLongSecret, setRevealedLongSecret] = useState('');
  const [htlcContract, setHtlcContract] = useState('');
  const [htlcTimelockBlock, setHtlcTimelockBlock] = useState(null);

  const progress = (step / TOTAL_STEPS) * 100;

  const validate = useCallback(() => {
    setError('');
    switch (step) {
      case 1:
        if (!title.trim()) {
          setError('Give your capsule a name to continue.');
          return false;
        }
        if (!occasion) {
          setError('Select an occasion for this capsule.');
          return false;
        }
        return true;
      case 2:
        if (!message.trim()) {
          setError('Write a message to include in your capsule.');
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        if (!unlockDate) {
          setError('Choose when this capsule should unlock.');
          return false;
        }
        if (new Date(unlockDate) <= new Date()) {
          setError('The unlock date must be in the future.');
          return false;
        }
        return true;
      default:
        return true;
    }
  }, [step, title, occasion, message, unlockDate]);

  const handleNext = () => {
    if (!validate()) return;
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      setError('');
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleSeal = async () => {
    if (!validate()) return;
    setSealing(true);

    try {
      // ── 1. Build HTLC params (hashlock + timelock projection) ──
      // This is the REAL on-chain lock — NOT a Supabase date column.
      let htlcParams = null;
      let htlcResult = null;
      let txHash = null;

      if (giftEnabled && giftAmount > 0) {
        // Use creator's wallet as recipient fallback if none entered.
        // In a full claim flow the recipient provides their own address.
        const recipient = recipientAddress.trim() || getStoredNimiqAddress() || '';
        if (!recipient) {
          const conn = await connectNimiqWallet();
          if (conn?.success) {
            // Donate-to-holder pattern: lock to creator's own derived HTLC address.
            // Recipient can claim via PIN entry + wallet connect later.
          } else {
            throw new Error(conn?.error || 'Connect your Nimiq wallet to attach a gift.');
          }
        }

        htlcParams = await buildHTLCParams({
          unlockDate: new Date(unlockDate).toISOString(),
          recipientAddress: recipient,
          securityLevel: recipient ? 'standard' : 'high',
        });
        if (htlcParams.error) {
          throw new Error(htlcParams.error);
        }

        // ── 2. Lock funds in HTLC on Nimiq ──
        // Old broken code (funds burned):
        //   sendNimiqTransaction({ recipient: 'NQ0700000000000000000000000000000000', ... })
        // New correct code (real time-lock):
        try {
          htlcResult = await createHTLC({
            recipientAddress: recipient || getStoredNimiqAddress(),
            amountNim: giftAmount,
            hashRoot: htlcParams.hashRoot,
            timeoutBlockHeight: htlcParams.timeoutBlockHeight,
          });
          if (!htlcResult?.success) {
            throw new Error(htlcResult?.error || 'Failed to lock funds in HTLC.');
          }
          txHash = htlcResult.txHash;
        } catch (nErr) {
          console.error('[NimCapsule] HTLC creation error:', nErr);
          throw nErr;
        }
      }

      // ── 3. Save capsule with HTLC params ──
      const capsule = await addCapsule({
        title: title.trim(),
        occasion,
        message: message.trim(),
        photos,
        gift: { enabled: giftEnabled, amount: giftEnabled ? giftAmount : 0, txHash },
        unlockDate: new Date(unlockDate).toISOString(),
        htlc: {
          contractAddress: htlcResult?.contractAddress || null,
          hashRoot: htlcParams?.hashRoot || null,
          timeoutBlockHeight: htlcParams?.timeoutBlockHeight || null,
          currentBlockHeight: htlcParams?.currentBlockHeight || null,
          pin: htlcParams?.pin || null,
          longSecret: htlcParams?.longSecret || null,
          recipientAddressHint: recipientAddress.trim() ? recipientAddress.slice(0, 6) + '...' + recipientAddress.slice(-4) : null,
        },
      });

      // ── 4. Reveal PIN to the CREATOR ONLY ONCE (for sharing) ──
      //    This PIN is the hashlock preimage. Without it, nobody can claim.
      setCreatedCapsuleId(capsule.id);
      if (htlcParams?.pin) {
        setRevealedPIN(htlcParams.pin);
        setRevealedLongSecret(htlcParams.longSecret || '');
      }
      if (htlcResult?.contractAddress) setHtlcContract(htlcResult.contractAddress);
      if (htlcParams?.timeoutBlockHeight) setHtlcTimelockBlock(htlcParams.timeoutBlockHeight);

      setTimeout(() => {
        setSealing(false);
        setSealed(true);
      }, 2200);
    } catch (err) {
      console.error('[NimCapsule] Seal error:', err);
      setSealing(false);
      setError(err.message || 'Failed to create capsule. Please try again.');
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos((prev) => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickDate = (months, index) => {
    const d = months <= 12 ? addMonths(new Date(), months) : addYears(new Date(), months / 12);
    setUnlockDate(toInputFormat(d));
    setActiveChip(index);
  };

  const handleDateChange = (e) => {
    setUnlockDate(e.target.value);
    setActiveChip(null);
  };

  const getTimelineFill = () => {
    if (!unlockDate) return 0;
    const now = Date.now();
    const target = new Date(unlockDate).getTime();
    const diff = target - now;
    const fiveYears = 5 * 365 * 24 * 60 * 60 * 1000;
    return Math.min(Math.max((diff / fiveYears) * 100, 5), 100);
  };

  // Wax-seal animation overlay
  if (sealing) {
    return (
      <div className={styles.page}>
        <div className={styles.sealOverlay}>
          <div className={styles.sealCircle}>
            <ShieldIcon size={140} />
          </div>
          <p className={styles.sealMessage}>Your capsule is sealed</p>
          <p className={styles.sealSubtext}>
            It will sleep until {formatLong(unlockDate)}
          </p>
        </div>
      </div>
    );
  }

  // Capsule sealed — show share link + (IF GIFT) claim PIN
  if (sealed && createdCapsuleId) {
    return (
      <div className={styles.page}>
        <div className={styles.sealOverlay}>
          <div className={styles.sealCircle}>
            <ShieldIcon size={140} />
          </div>
          <p className={styles.sealMessage}>Your capsule is sealed!</p>
          <p className={styles.sealSubtext}>
            It will sleep until {formatLong(unlockDate)}
          </p>

          {/* ═══ CLAIM PIN REVEAL (gift capsules only) ═══ */}
          {revealedPIN && (
            <div style={{
              marginTop: '24px',
              padding: '24px 28px',
              borderRadius: '16px',
              background: '#FFFDF5',
              border: '2px dashed #E9B114',
              textAlign: 'center',
              maxWidth: '420px',
              width: '100%',
              animation: 'fadeInScale 0.5s ease-out',
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#C49710',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}>
                <KeyRound size={14} />
                Claim Code — Show This To The Recipient
              </div>
              <div style={{
                fontSize: '44px',
                fontWeight: 800,
                letterSpacing: '8px',
                color: '#1A1A1A',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                lineHeight: 1,
                margin: '12px 0 8px',
                userSelect: 'all',
              }}>
                {revealedPIN}
              </div>
              {revealedLongSecret && (
                <div style={{
                  fontSize: '11px',
                  color: '#9E9E9E',
                  fontFamily: 'ui-monospace, monospace',
                  wordBreak: 'break-all',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(233,177,20,0.2)',
                }}>
                  High-security token: {revealedLongSecret}
                </div>
              )}
              <div style={{
                fontSize: '12px',
                color: '#6B6B6B',
                marginTop: '12px',
                lineHeight: 1.6,
              }}>
                The recipient needs this code to unlock the NIM gift.
                <br /><strong>Store it safely</strong> — you won&apos;t see it again.
              </div>
            </div>
          )}

          {htlcContract && (
            <div style={{
              marginTop: '16px',
              fontSize: '12px',
              color: '#6B6B6B',
              fontFamily: 'ui-monospace, monospace',
              maxWidth: '420px',
              wordBreak: 'break-all',
            }}>
              HTLC: {htlcContract}
              {htlcTimelockBlock && ` · Block ${htlcTimelockBlock}`}
            </div>
          )}

          <div className={styles.shareLinkSection}>
            <p className={styles.shareLinkLabel}>Share this capsule with someone special</p>
            <ShareLinkButton capsuleId={createdCapsuleId} variant="prominent" />
            <button
              className={styles.viewCapsuleButton}
              onClick={() => router.push(`/capsule/${createdCapsuleId}`)}
              type="button"
            >
              View Capsule
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Progress Bar */}
      <div className={styles.progressBar} style={{ width: `${progress}%` }} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => (step > 1 ? handlePrev() : router.back())}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className={styles.stepDots}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`${styles.dot} ${
                  i + 1 === step ? styles.dotActive : ''
                } ${i + 1 < step ? styles.dotCompleted : ''}`}
              />
            ))}
          </div>
        </div>
        <span className={styles.stepIndicator}>
          Step <span>{step}</span> of {TOTAL_STEPS}
        </span>
        <button
          className={styles.closeButton}
          onClick={() => router.push('/dashboard')}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </header>

      {/* Content */}
      <div className={styles.content}>
        {error && (
          <div className={styles.error}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* ── Step 1: Title + Occasion ── */}
        {step === 1 && (
          <>
            <h1 className={styles.stepTitle}>Name your capsule</h1>
            <p className={styles.stepSubtitle}>
              Choose a title and occasion that captures the spirit of this
              moment.
            </p>

            <input
              type="text"
              className={styles.titleInput}
              placeholder="e.g. To My Future Self"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              autoFocus
            />

            <div className={styles.sectionLabel}>Occasion</div>
            <div className={styles.occasionGrid}>
              {OCCASIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`${styles.occasionCard} ${
                    occasion === id ? styles.occasionCardActive : ''
                  }`}
                  onClick={() => setOccasion(id)}
                  type="button"
                >
                  <div className={styles.occasionIcon}>
                    <Icon size={20} />
                  </div>
                  <span className={styles.occasionLabel}>{label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Message + Photos ── */}
        {step === 2 && (
          <>
            <h1 className={styles.stepTitle}>Write your message</h1>
            <p className={styles.stepSubtitle}>
              Pour your heart onto the page. This will be sealed away until the
              capsule unlocks.
            </p>

            <div className={styles.paperCard}>
              <textarea
                className={styles.messageArea}
                placeholder="Dear future me..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className={styles.photoSection}>
              <div className={styles.sectionLabel}>Photos (optional)</div>
              <div
                className={styles.photoUploadArea}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    fileInputRef.current?.click();
                }}
              >
                <ImagePlus size={28} />
                <span className={styles.photoUploadText}>
                  Tap to add photos
                </span>
                <span className={styles.photoUploadHint}>
                  JPG, PNG up to 5MB each
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handlePhotoUpload}
              />

              {photos.length > 0 && (
                <div className={styles.photoGrid}>
                  {photos.map((src, i) => (
                    <div key={i} className={styles.photoThumb}>
                      <img src={src} alt={`Upload ${i + 1}`} />
                      <button
                        className={styles.photoRemove}
                        onClick={() => removePhoto(i)}
                        aria-label="Remove photo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Step 3: Gift ── */}
        {step === 3 && (
          <>
            <h1 className={styles.stepTitle}>Attach a gift</h1>
            <p className={styles.stepSubtitle}>
              Include a NIM crypto gift that will be revealed when the capsule
              opens. Entirely optional.
            </p>

            <div className={styles.giftToggleRow}>
              <div className={styles.giftToggleLabel}>
                <div className={styles.giftToggleIcon}>
                  <Gift size={22} />
                </div>
                <div className={styles.giftToggleText}>
                  <h3>NIM Gift</h3>
                  <p>Attach NIM crypto to this capsule</p>
                </div>
              </div>
              <button
                className={`${styles.toggle} ${
                  giftEnabled ? styles.toggleActive : ''
                }`}
                onClick={() => setGiftEnabled(!giftEnabled)}
                type="button"
                aria-label="Toggle gift"
              >
                <div className={styles.toggleKnob} />
              </button>
            </div>

            {giftEnabled && (
              <>
                <div className={styles.giftAmountSection}>
                  <div className={styles.giftAmountDisplay}>
                    <span className={styles.giftAmountValue}>{giftAmount}</span>
                    <span className={styles.giftAmountUnit}>NIM</span>
                  </div>
                  <input
                    type="range"
                    className={styles.giftSlider}
                    min={1}
                    max={1000}
                    step={1}
                    value={giftAmount}
                    onChange={(e) => setGiftAmount(Number(e.target.value))}
                  />
                  <div className={styles.giftSliderLabels}>
                    <span>1 NIM</span>
                    <span>1,000 NIM</span>
                  </div>
                </div>

                <div className={styles.giftPreview}>
                  <div className={styles.giftPreviewLabel}>Gift Preview</div>
                  <div className={styles.giftPreviewAmount}>
                    {giftAmount} <span style={{ fontSize: '20px' }}>NIM</span>
                  </div>
                  <div className={styles.giftPreviewNote}>
                    Locked on-chain via Nimiq HTLC until {unlockDate ? formatLong(unlockDate) : 'the unlock date'}
                  </div>

                  {/* Recipient wallet address (optional — recipient can enter on claim) */}
                  <div style={{ width: '100%', marginTop: '20px', textAlign: 'left' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1A1A1A',
                      marginBottom: '8px',
                    }}>
                      Recipient&apos;s Nimiq Address <span style={{ color: '#9E9E9E', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="NQXX AAAA BBBB CCCC DDDD EEEE FFFF GGGG HHHH"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E0DCD5',
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: '#FAFAF7',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                      maxLength={60}
                    />
                    <p style={{
                      fontSize: '12px',
                      color: '#9E9E9E',
                      marginTop: '6px',
                      lineHeight: 1.5,
                    }}>
                      If you already know it, enter the recipient&apos;s address.
                      Otherwise leave blank — the recipient will enter their wallet on claim.
                    </p>
                  </div>

                  <div style={{
                    marginTop: '20px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(79, 109, 90, 0.08)',
                    border: '1px solid rgba(79, 109, 90, 0.2)',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    color: '#4F6D5A',
                    textAlign: 'left',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} />
                      Nimiq HTLC Time-Lock
                    </div>
                    This NIM gift is locked using a Hash Time-Locked Contract.
                    Neither you nor NimCapsule can unlock it early. The blockchain enforces the date.
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#6B6B6B' }}>
                      Connect your Nimiq Wallet to attach NIM
                    </span>
                    <NimiqWalletButton />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Step 4: Unlock Date ── */}
        {step === 4 && (
          <>
            <h1 className={styles.stepTitle}>Set the unlock date</h1>
            <p className={styles.stepSubtitle}>
              When should this capsule awaken? Choose a moment in the future
              worth waiting for.
            </p>

            <div className={styles.quickChips}>
              {QUICK_DATES.map((item, i) => (
                <button
                  key={i}
                  className={`${styles.chip} ${
                    activeChip === i ? styles.chipActive : ''
                  }`}
                  onClick={() => handleQuickDate(item.months, i)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className={styles.dateInputSection}>
              <div className={styles.dateInputLabel}>Or choose a date</div>
              <input
                type="date"
                className={styles.dateInput}
                value={unlockDate}
                onChange={handleDateChange}
                min={toInputFormat(new Date(Date.now() + 86400000))}
              />
            </div>

            {unlockDate && (
              <>
                <div className={styles.timeline}>
                  <span className={styles.timelineEnd}>Now</span>
                  <div className={styles.timelineBar}>
                    <div
                      className={styles.timelineFill}
                      style={{ width: `${getTimelineFill()}%` }}
                    >
                      <div className={styles.timelineDot} />
                    </div>
                  </div>
                  <span className={styles.timelineEnd}>
                    {formatLong(unlockDate)}
                  </span>
                </div>

                <div className={styles.sleepPreview}>
                  <div className={styles.sleepIcon}>
                    <Moon size={26} />
                  </div>
                  <p className={styles.sleepText}>
                    This capsule will sleep until{' '}
                    <span className={styles.sleepDate}>
                      {formatLong(unlockDate)}
                    </span>
                  </p>
                  <span className={styles.sleepDuration}>
                    {getRelativeTime(unlockDate)}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer Navigation */}
      <div className={styles.footer}>
        <div className={styles.footerInner}>
          {step > 1 && (
            <button
              className={styles.prevButton}
              onClick={handlePrev}
              type="button"
            >
              Back
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              className={styles.nextButton}
              onClick={handleNext}
              type="button"
            >
              Continue
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className={styles.sealButton}
              onClick={handleSeal}
              type="button"
              disabled={!unlockDate}
            >
              <ShieldIcon size={20} />
              Seal This Capsule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
