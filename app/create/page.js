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
} from 'lucide-react';
import { addCapsule } from '../lib/storage';
import {
  addMonths,
  addYears,
  toInputFormat,
  formatLong,
  getRelativeTime,
} from '../lib/dates';
import { sendNimiqTransaction } from '../lib/nimiq';
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

  // Step 4
  const [unlockDate, setUnlockDate] = useState('');
  const [activeChip, setActiveChip] = useState(null);

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
      let txHash = null;
      if (giftEnabled && giftAmount > 0) {
        try {
          const res = await sendNimiqTransaction({
            recipient: 'NQ0700000000000000000000000000000000',
            amountNim: giftAmount,
          });
          if (res?.success) {
            txHash = res.txHash;
          } else if (res?.error) {
            console.warn('[NimCapsule] Nimiq transaction notice:', res.error);
          }
        } catch (nErr) {
          console.warn('[NimCapsule] Nimiq transaction error:', nErr);
        }
      }

      const capsule = await addCapsule({
        title: title.trim(),
        occasion,
        message: message.trim(),
        photos,
        gift: { enabled: giftEnabled, amount: giftEnabled ? giftAmount : 0, txHash },
        unlockDate: new Date(unlockDate).toISOString(),
      });

      setCreatedCapsuleId(capsule.id);
      setTimeout(() => {
        setSealing(false);
        setSealed(true);
      }, 2200);
    } catch (err) {
      console.error('[NimCapsule] Seal error:', err);
      setSealing(false);
      setError('Failed to create capsule. Please try again.');
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

  // Capsule sealed — show share link
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
                    Will be securely locked until {unlockDate ? formatLong(unlockDate) : 'the unlock date'}
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
