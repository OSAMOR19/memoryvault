// ── NimCapsule HTLC layer ─────────────────────────────────
// Sits on top of app/lib/nimiq.js. Produces the two locks that make a
// capsule a real time-lock instead of a database flag:
//
//   HASHLOCK  hashRoot = SHA-256(claim PIN)   → only the PIN holder can claim
//   TIMELOCK  timeoutBlockHeight              → chain height, not a wall clock
//
// Nothing here talks to a wallet. Funding and claiming live in nimiq.js
// (createHTLC / claimHTLC / refundHTLC); this file only derives parameters
// and verifies them.

import {
  getCurrentBlockHeight,
  NIMIQ_BLOCK_TIME_MS,
  NIMIQ_CURRENT_BLOCK_HEIGHT_FALLBACK,
} from './nimiq';

export const NIMIQ_BLOCKS_PER_DAY = Math.round((24 * 60 * 60 * 1000) / NIMIQ_BLOCK_TIME_MS);

/** Minimum distance (in blocks) between "now" and the unlock height. */
export const MIN_TIMELOCK_BLOCKS = 1;

/** Creator may refund once this multiple of the lock duration has passed. */
export const REFUND_BUFFER_MULTIPLIER = 2;

/** PIN lengths per security level (README: 6–8 digit random PIN). */
export const PIN_LENGTH = {
  standard: 6,
  high: 8,
};

// ── Crypto primitives ─────────────────────────────────────

function getCrypto() {
  const c = globalThis.crypto;
  if (!c || !c.subtle || typeof c.getRandomValues !== 'function') {
    throw new Error('Web Crypto is not available in this environment.');
  }
  return c;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 of a UTF-8 string, as lowercase hex (64 chars).
 */
export async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input));
  const digest = await getCrypto().subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Cryptographically random numeric PIN of the given length.
 * Uses rejection sampling so every digit is uniformly distributed.
 */
export function generatePin(length = PIN_LENGTH.standard) {
  const crypto = getCrypto();
  const len = Math.max(4, Math.min(12, Number(length) || PIN_LENGTH.standard));
  let pin = '';
  const buf = new Uint8Array(len * 2);
  while (pin.length < len) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && pin.length < len; i++) {
      // 250 = largest multiple of 10 below 256 → unbiased digits
      if (buf[i] < 250) pin += String(buf[i] % 10);
    }
  }
  return pin;
}

/**
 * 32 random bytes as hex. Used as an off-chain recovery code for
 * high-security capsules (stored encrypted for the creator only).
 */
export function generateLongSecret(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  getCrypto().getRandomValues(bytes);
  return bytesToHex(bytes);
}

// ── Timelock math ─────────────────────────────────────────

/**
 * Project a wall-clock unlock date onto a Nimiq block height.
 *
 * @param {string|Date|number} unlockDate
 * @param {number} currentBlockHeight - live chain height
 * @param {number} [now=Date.now()]
 * @returns {number} target block height (always >= current + MIN_TIMELOCK_BLOCKS)
 */
export function dateToTimeoutBlockHeight(unlockDate, currentBlockHeight, now = Date.now()) {
  const unlockMs = new Date(unlockDate).getTime();
  if (Number.isNaN(unlockMs)) {
    throw new Error('Invalid unlock date.');
  }
  const deltaMs = Math.max(0, unlockMs - now);
  const blocksAhead = Math.max(MIN_TIMELOCK_BLOCKS, Math.ceil(deltaMs / NIMIQ_BLOCK_TIME_MS));
  return Math.floor(Number(currentBlockHeight)) + blocksAhead;
}

/**
 * Rough wall-clock estimate for when a block height will be reached.
 */
export function estimateBlockDate(targetBlockHeight, currentBlockHeight, now = Date.now()) {
  const blocks = Number(targetBlockHeight) - Number(currentBlockHeight);
  return new Date(now + blocks * NIMIQ_BLOCK_TIME_MS);
}

async function readLiveBlockHeight() {
  const height = Number(await getCurrentBlockHeight());
  if (!Number.isFinite(height) || height <= NIMIQ_CURRENT_BLOCK_HEIGHT_FALLBACK) {
    return null;
  }
  return height;
}

// ── Public API used by the pages ──────────────────────────

/**
 * Build everything needed to fund an HTLC for a capsule.
 *
 * @param {object} params
 * @param {string} params.unlockDate - ISO date the capsule becomes claimable
 * @param {string} [params.recipientAddress] - intended claimant (hint only)
 * @param {'standard'|'high'} [params.securityLevel='standard']
 * @returns {Promise<object>} `{ pin, longSecret, hashRoot, timeoutBlockHeight,
 *   currentBlockHeight, refundBlockHeight, estimatedUnlockAt, securityLevel,
 *   recipientAddress }` or `{ error }` on failure.
 */
export async function buildHTLCParams({
  unlockDate,
  recipientAddress = '',
  securityLevel = 'standard',
} = {}) {
  try {
    if (!unlockDate || Number.isNaN(new Date(unlockDate).getTime())) {
      return { error: 'A valid unlock date is required to build the time-lock.' };
    }

    const currentBlockHeight = await readLiveBlockHeight();
    if (currentBlockHeight === null) {
      return {
        error:
          'Could not read the current Nimiq block height. Check your connection and try again — the time-lock must be anchored to the live chain.',
      };
    }

    const level = securityLevel === 'high' ? 'high' : 'standard';
    const pin = generatePin(PIN_LENGTH[level]);
    const longSecret = level === 'high' ? generateLongSecret() : null;
    const hashRoot = await sha256Hex(pin);

    const timeoutBlockHeight = dateToTimeoutBlockHeight(unlockDate, currentBlockHeight);
    const lockBlocks = timeoutBlockHeight - currentBlockHeight;
    const refundBlockHeight = currentBlockHeight + lockBlocks * REFUND_BUFFER_MULTIPLIER;

    return {
      pin,
      longSecret,
      hashRoot,
      timeoutBlockHeight,
      currentBlockHeight,
      refundBlockHeight,
      estimatedUnlockAt: estimateBlockDate(timeoutBlockHeight, currentBlockHeight).toISOString(),
      securityLevel: level,
      recipientAddress: recipientAddress || null,
    };
  } catch (err) {
    console.error('[NimCapsule] buildHTLCParams failed:', err);
    return { error: err?.message || 'Failed to build HTLC parameters.' };
  }
}

/**
 * Authoritative timelock check against the live chain (never the client clock).
 *
 * Throws if the chain height cannot be read, so callers can distinguish
 * "still locked" from "could not verify".
 *
 * @param {number} timeoutBlockHeight
 * @returns {Promise<{isMature:boolean,currentBlockHeight:number,timeoutBlockHeight:number,blocksUntilMature:number,estimatedUnlockAt:string|null,verifiedAt:string}>}
 */
export async function isHTLCTimelockMature(timeoutBlockHeight) {
  const target = Number(timeoutBlockHeight);
  if (!Number.isFinite(target) || target <= 0) {
    throw new Error('Invalid HTLC timeout block height.');
  }

  const currentBlockHeight = await readLiveBlockHeight();
  if (currentBlockHeight === null) {
    throw new Error('Nimiq block height unavailable — cannot verify time-lock on-chain.');
  }

  const blocksUntilMature = Math.max(0, target - currentBlockHeight);
  const isMature = currentBlockHeight >= target;

  return {
    isMature,
    currentBlockHeight,
    timeoutBlockHeight: target,
    blocksUntilMature,
    estimatedUnlockAt: isMature ? null : estimateBlockDate(target, currentBlockHeight).toISOString(),
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Check a claim code against the stored hashlock.
 *
 * @param {string} secret - PIN (or any preimage) entered by the claimant
 * @param {string} hashRoot - SHA-256 hex stored at creation
 * @returns {Promise<boolean>}
 */
export async function verifySecret(secret, hashRoot) {
  if (!secret || !hashRoot) return false;
  const expected = String(hashRoot).trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expected)) return false;

  const actual = await sha256Hex(String(secret).trim());

  // Constant-time compare (both strings are 64 chars here).
  let diff = 0;
  for (let i = 0; i < 64; i++) {
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
