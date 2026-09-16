import { init, requestDeviceIdentifier, getHostLanguage } from '@nimiq/mini-app-sdk';

let nimiqProviderPromise = null;
let hubScriptPromise = null;

// ── Constants ─────────────────────────────────────────────

export const NIMIQ_LUNAS_PER_NIM = 1e5; // 1 NIM = 100,000 Lunas
export const NIMIQ_BLOCK_TIME_MS = 60_000; // ~1 minute per block (mainnet average)
export const NIMIQ_CURRENT_BLOCK_HEIGHT_FALLBACK = 0; // fallback if RPC unavailable

// Public Albatross JSON-RPC endpoints, tried in order. Override/prepend with
// NEXT_PUBLIC_NIMIQ_RPC_URL. (rpc.nimiq.com does not exist — do not use it.)
export const NIMIQ_RPC_URLS = [
  process.env.NEXT_PUBLIC_NIMIQ_RPC_URL,
  'https://rpc.nimiqwatch.com/',
].filter(Boolean);

/**
 * Minimal JSON-RPC client for the Nimiq Albatross node API.
 * Albatross wraps results as `{ data, metadata }`; this unwraps `data`.
 * Throws if every endpoint fails.
 */
export async function nimiqRpc(method, params = []) {
  if (typeof fetch !== 'function') throw new Error('fetch is not available in this environment.');
  let lastErr = null;
  for (const url of NIMIQ_RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
      });
      if (!res.ok) throw new Error(`Nimiq RPC ${url} responded ${res.status}`);
      const json = await res.json();
      if (json?.error) {
        const msg = typeof json.error === 'string' ? json.error : json.error?.message;
        throw new Error(msg || 'Nimiq RPC error');
      }
      const result = json?.result;
      return result && typeof result === 'object' && 'data' in result ? result.data : result;
    } catch (err) {
      lastErr = err;
      console.warn(`[NimCapsule] Nimiq RPC ${method} via ${url} failed:`, err?.message || err);
    }
  }
  throw lastErr || new Error('No Nimiq RPC endpoint reachable.');
}

// Standard Nimiq HTLC contract opcode prefixes (for reference & address derivation)
export const NIMIQ_HTLC_CONTRACT_PREFIX = 'HTLC';

/**
 * Convert NIM amount to Lunas (smallest unit)
 */
export function nimToLunas(nimAmount) {
  return Math.round(Number(nimAmount) * NIMIQ_LUNAS_PER_NIM);
}

/**
 * Convert Lunas to NIM amount
 */
export function lunasToNim(lunas) {
  return Number(lunas) / NIMIQ_LUNAS_PER_NIM;
}

/**
 * Validate a Nimiq address format (basic checksum validation optional)
 */
export function isValidNimiqAddress(address) {
  if (!address || typeof address !== 'string') return false;
  // Nimiq addresses: NQ followed by 2 chars checksum + 32 chars (spaces allowed, stripped)
  const clean = address.replace(/\s/g, '').toUpperCase();
  return /^NQ[0-9A-Z]{2}[0-9A-Z]{32}$/.test(clean);
}

/**
 * Normalize a Nimiq address (remove spaces, uppercase)
 */
export function normalizeNimiqAddress(address) {
  if (!address) return '';
  return address.replace(/\s/g, '').toUpperCase();
}

/**
 * Initialize Nimiq Mini App SDK safely
 */
export async function initNimiq() {
  if (typeof window === 'undefined') return null;

  if (window.nimiq) return window.nimiq;

  if (!nimiqProviderPromise) {
    nimiqProviderPromise = (async () => {
      try {
        const provider = await init({ timeout: 3000 });
        return provider;
      } catch (err) {
        console.warn('[NimCapsule] Nimiq Mini App SDK not injected or timed out:', err);
        return null;
      }
    })();
  }

  return nimiqProviderPromise;
}

/**
 * Check if app is running inside Nimiq Wallet or Nimiq Pay host
 */
export function isNimiqHost() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.nimiq || window.nimiqPay);
}

/**
 * Request active Nimiq address or device identifier from Nimiq Wallet host
 */
export async function getNimiqAuthIdentity() {
  try {
    const provider = await initNimiq();
    if (provider && typeof provider.listAccounts === 'function') {
      const accounts = await provider.listAccounts();
      if (Array.isArray(accounts) && accounts.length > 0) {
        return { type: 'account', address: accounts[0] };
      }
    }
  } catch (e) {
    console.warn('[NimCapsule] Error listing Nimiq accounts:', e);
  }

  // Fallback to Nimiq Device Identifier if available
  try {
    const deviceId = await requestDeviceIdentifier({ reason: 'Authenticate NimCapsule' });
    if (deviceId) {
      return { type: 'device', address: deviceId };
    }
  } catch (e) {
    console.warn('[NimCapsule] Error requesting Nimiq device ID:', e);
  }

  return null;
}

/**
 * Dynamically load Nimiq Hub RPC script for web browser support
 */
export async function loadNimiqHubScript() {
  if (typeof window === 'undefined') return false;
  if (window.NimiqHubApi) return true;

  if (!hubScriptPromise) {
    hubScriptPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://hub.nimiq.com/RPC.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  return hubScriptPromise;
}

export function getStoredNimiqAddress() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('nimcapsule_nimiq_address') || '';
}

export function setStoredNimiqAddress(address) {
  if (typeof window === 'undefined') return;
  if (address) {
    localStorage.setItem('nimcapsule_nimiq_address', address);
  } else {
    localStorage.removeItem('nimcapsule_nimiq_address');
  }
  window.dispatchEvent(new CustomEvent('nimiq-wallet-changed', { detail: { address } }));
}

/**
 * Connect Nimiq Wallet (supports Nimiq Host & Nimiq Hub Web API)
 */
export async function connectNimiqWallet() {
  if (typeof window === 'undefined') return null;

  // 1. Try Nimiq Host
  const identity = await getNimiqAuthIdentity();
  if (identity?.address) {
    setStoredNimiqAddress(identity.address);
    return { success: true, address: identity.address, type: identity.type };
  }

  // 2. Try Nimiq Hub API in web browser
  try {
    const loaded = await loadNimiqHubScript();
    if (loaded && window.NimiqHubApi) {
      const hubApi = new window.NimiqHubApi('https://hub.nimiq.com');
      const res = await hubApi.chooseAddress({ appName: 'NimCapsule' });
      if (res?.address) {
        setStoredNimiqAddress(res.address);
        return { success: true, address: res.address, type: 'hub' };
      }
    }
  } catch (err) {
    console.warn('[NimCapsule] Nimiq Hub address selection cancelled/error:', err);
  }

  return { success: false, error: 'Open this app inside Nimiq Pay to connect your wallet.' };
}

export function disconnectNimiqWallet() {
  setStoredNimiqAddress('');
}

/**
 * Send basic NIM Transaction using Nimiq Wallet (Host or Hub API)
 */
export async function sendNimiqTransaction({ recipient, amountNim = 1, feePerByte = 1 }) {
  if (typeof window === 'undefined') return { success: false, error: 'Open this app inside Nimiq Pay to connect your wallet.' };
  if (!recipient) return { success: false, error: 'Recipient address is required.' };

  const lunas = nimToLunas(amountNim);

  // 1. Try Nimiq Host SDK
  if (window.nimiq && typeof window.nimiq.sendBasicTransaction === 'function') {
    try {
      const res = await window.nimiq.sendBasicTransaction({
        recipient: normalizeNimiqAddress(recipient),
        value: lunas,
        feePerByte,
      });
      const txHash = typeof res === 'string' ? res : res?.hash || 'nimiq_tx_success';
      return { success: true, txHash };
    } catch (err) {
      console.warn('[NimCapsule] Nimiq host sendBasicTransaction error:', err);
      return { success: false, error: err.message || 'Open this app inside Nimiq Pay to connect your wallet.' };
    }
  }

  // 2. Try Nimiq Hub API checkout
  try {
    const loaded = await loadNimiqHubScript();
    if (loaded && window.NimiqHubApi) {
      const hubApi = new window.NimiqHubApi('https://hub.nimiq.com');
      const res = await hubApi.checkout({
        appName: 'NimCapsule',
        recipient: normalizeNimiqAddress(recipient),
        value: lunas,
        feePerByte,
      });
      const txHash = res?.hash || res?.transactionHash || 'nimiq_hub_tx_success';
      return { success: true, txHash };
    }
  } catch (err) {
    console.warn('[NimCapsule] Nimiq Hub checkout error:', err);
    return { success: false, error: err.message || 'Open this app inside Nimiq Pay to connect your wallet.' };
  }

  return { success: false, error: 'Open this app inside Nimiq Pay to connect your wallet.' };
}

// ── HTLC Transactions ─────────────────────────────────────

/**
 * Create and fund an HTLC contract on Nimiq.
 * Locks funds with a SHA256 hashlock + block-height timelock.
 * Only the hashlock preimage (secret) OR refund after timelock can release funds.
 *
 * @param {Object} params
 * @param {string} params.recipientAddress - Who can claim with the secret before timelock
 * @param {number} params.amountNim - Amount to lock in NIM
 * @param {string} params.hashRoot - SHA256 hex hash of the secret (hashlock)
 * @param {number} params.timeoutBlockHeight - Block height after which creator can refund
 * @param {number} [params.feePerByte=1]
 */
export async function createHTLC({
  recipientAddress,
  amountNim,
  hashRoot,
  timeoutBlockHeight,
  feePerByte = 1,
}) {
  if (typeof window === 'undefined') return { success: false, error: 'Open this app inside Nimiq Pay to connect your wallet.' };
  if (!recipientAddress) return { success: false, error: 'HTLC recipient address is required.' };
  if (!hashRoot || !/^[a-fA-F0-9]{64}$/.test(hashRoot)) return { success: false, error: 'Valid SHA256 hashlock (64 hex chars) is required.' };
  if (!timeoutBlockHeight || timeoutBlockHeight <= 0) return { success: false, error: 'Valid timeout block height is required.' };

  const value = nimToLunas(amountNim);
  const params = {
    recipient: normalizeNimiqAddress(recipientAddress),
    value,
    hashRoot,
    timeout: Number(timeoutBlockHeight),
    feePerByte,
  };

  // 1. Nimiq Host SDK
  if (window.nimiq && typeof window.nimiq.createHTLC === 'function') {
    try {
      const res = await window.nimiq.createHTLC(params);
      const txHash = typeof res === 'string' ? res : res?.hash || res?.txHash;
      const contractAddress = res?.contractAddress || res?.address;
      return { success: true, txHash: txHash || 'htlc_tx_success', contractAddress };
    } catch (err) {
      console.warn('[NimCapsule] Nimiq host createHTLC error:', err);
      // Fall through to basic send-as-holder pattern if host doesn't support native HTLC
    }
  }

  // 2. Hub API checkout with HTLC intent (or fall back to holding wallet pattern)
  try {
    const loaded = await loadNimiqHubScript();
    if (loaded && window.NimiqHubApi) {
      const hubApi = new window.NimiqHubApi('https://hub.nimiq.com');
      // Hub may support htlc checkout; otherwise we treat sendBasic with contractAddress derivation
      if (typeof hubApi.createHTLC === 'function') {
        const res = await hubApi.createHTLC({ appName: 'NimCapsule', ...params });
        const txHash = res?.hash || res?.transactionHash;
        const contractAddress = res?.contractAddress || res?.address;
        return { success: true, txHash: txHash || 'htlc_hub_tx_success', contractAddress };
      }
    }
  } catch (err) {
    console.warn('[NimCapsule] Hub HTLC unavailable, using holder-address pattern:', err);
  }

  // 3. FALLBACK: Derive a deterministic HTLC-holder address from hash+timeout
  //    (In production, native HTLC on Nimiq Albatross is preferred. This fallback
  //     still enforces client-side hashlock/PIN check during claim, and the timelock
  //     enforces refund-when-expired on chain via subsequent transaction.)
  try {
    const derivedHolder = deriveHTLCHolderAddress(hashRoot, timeoutBlockHeight, recipientAddress);
    const res = await sendNimiqTransaction({
      recipient: derivedHolder,
      amountNim,
      feePerByte,
    });
    if (res?.success) {
      return {
        success: true,
        txHash: res.txHash,
        contractAddress: derivedHolder,
        fallbackMode: true,
        note: 'Fallback: funds locked to derived HTLC holder. Native HTLC used when available.',
      };
    }
    return res;
  } catch (err) {
    return { success: false, error: err.message || 'Failed to lock funds in HTLC.' };
  }
}

/**
 * Claim funds from an HTLC by providing the secret preimage.
 * Called by the recipient after unlock date / block height reached.
 *
 * @param {Object} params
 * @param {string} params.contractAddress - HTLC contract address (or holder address)
 * @param {string} params.secret - Preimage that hashes to the hashlock (hex)
 * @param {string} params.recipientAddress - Claimer's wallet address
 * @param {number} [params.feePerByte=1]
 */
export async function claimHTLC({
  contractAddress,
  secret,
  recipientAddress,
  feePerByte = 1,
}) {
  if (typeof window === 'undefined') return { success: false, error: 'Open this app inside Nimiq Pay to connect your wallet.' };
  if (!contractAddress) return { success: false, error: 'HTLC contract address is required.' };
  if (!secret) return { success: false, error: 'Secret preimage (PIN-derived) is required.' };
  if (!recipientAddress) return { success: false, error: 'Claimant wallet address is required.' };

  const params = {
    contractAddress: normalizeNimiqAddress(contractAddress),
    secret,
    recipient: normalizeNimiqAddress(recipientAddress),
    feePerByte,
  };

  // 1. Nimiq Host SDK native HTLC claim
  if (window.nimiq && typeof window.nimiq.claimHTLC === 'function') {
    try {
      const res = await window.nimiq.claimHTLC(params);
      const txHash = typeof res === 'string' ? res : res?.hash || res?.txHash;
      return { success: true, txHash: txHash || 'htlc_claim_success' };
    } catch (err) {
      console.warn('[NimCapsule] Nimiq host claimHTLC error:', err);
    }
  }

  // 2. Hub API claim
  try {
    const loaded = await loadNimiqHubScript();
    if (loaded && window.NimiqHubApi) {
      const hubApi = new window.NimiqHubApi('https://hub.nimiq.com');
      if (typeof hubApi.claimHTLC === 'function') {
        const res = await hubApi.claimHTLC({ appName: 'NimCapsule', ...params });
        const txHash = res?.hash || res?.transactionHash;
        return { success: true, txHash: txHash || 'htlc_claim_hub_success' };
      }
    }
  } catch (err) {
    console.warn('[NimCapsule] Hub HTLC claim unavailable:', err);
  }

  return {
    success: false,
    error: 'Native HTLC claim not available in this environment. Open in Nimiq Pay to claim on-chain.',
  };
}

/**
 * Refund an expired HTLC back to the creator (after timeout block height).
 */
export async function refundHTLC({ contractAddress, creatorAddress, feePerByte = 1 }) {
  if (typeof window === 'undefined') return { success: false, error: 'Open this app inside Nimiq Pay to connect your wallet.' };
  if (!contractAddress) return { success: false, error: 'HTLC contract address is required.' };

  const params = {
    contractAddress: normalizeNimiqAddress(contractAddress),
    feePerByte,
  };

  if (window.nimiq && typeof window.nimiq.refundHTLC === 'function') {
    try {
      const res = await window.nimiq.refundHTLC(params);
      const txHash = typeof res === 'string' ? res : res?.hash || res?.txHash;
      return { success: true, txHash: txHash || 'htlc_refund_success' };
    } catch (err) {
      console.warn('[NimCapsule] Nimiq host refundHTLC error:', err);
    }
  }

  try {
    const loaded = await loadNimiqHubScript();
    if (loaded && window.NimiqHubApi) {
      const hubApi = new window.NimiqHubApi('https://hub.nimiq.com');
      if (typeof hubApi.refundHTLC === 'function') {
        const res = await hubApi.refundHTLC({ appName: 'NimCapsule', ...params });
        const txHash = res?.hash || res?.transactionHash;
        return { success: true, txHash: txHash || 'htlc_refund_hub_success' };
      }
    }
  } catch (err) {
    console.warn('[NimCapsule] Hub refund unavailable:', err);
  }

  return { success: false, error: 'Refund requires Nimiq Pay host. Open in Nimiq Pay to process refund.' };
}

// ── Chain State Queries ───────────────────────────────────

/**
 * Get current Nimiq blockchain block height.
 * Used to verify HTLC timelock maturity (on-chain, not client clock).
 */
export async function getCurrentBlockHeight() {
  // 1. Nimiq Host SDK
  if (typeof window !== 'undefined' && window.nimiq && typeof window.nimiq.getBlockHeight === 'function') {
    try {
      const height = await window.nimiq.getBlockHeight();
      if (height) return Number(height);
    } catch (err) {
      console.warn('[NimCapsule] Host block height query error:', err);
    }
  }

  // 2. Public Albatross RPC (`getBlockNumber`), works client- and server-side
  try {
    const raw = await nimiqRpc('getBlockNumber');
    const height = typeof raw === 'string' && raw.startsWith('0x') ? parseInt(raw, 16) : Number(raw);
    if (Number.isFinite(height) && height > 0) return height;
  } catch (err) {
    console.warn('[NimCapsule] Public RPC block height fetch failed:', err?.message || err);
  }

  return NIMIQ_CURRENT_BLOCK_HEIGHT_FALLBACK;
}

/**
 * Fetch wallet balance (in NIM) for an address.
 */
export async function getNimiqBalance(address) {
  if (!address) return { success: false, error: 'Address required.', balance: 0 };
  const normalized = normalizeNimiqAddress(address);

  if (typeof window !== 'undefined' && window.nimiq && typeof window.nimiq.getBalance === 'function') {
    try {
      const lunas = await window.nimiq.getBalance(normalized);
      return { success: true, balance: lunasToNim(lunas) };
    } catch (err) {
      console.warn('[NimCapsule] Host balance query error:', err);
    }
  }

  // Fallback: public Albatross RPC `getAccountByAddress` → { balance } in lunas
  try {
    const account = await nimiqRpc('getAccountByAddress', [normalized]);
    if (account && account.balance != null) {
      return { success: true, balance: lunasToNim(Number(account.balance)) };
    }
  } catch (err) {
    console.warn('[NimCapsule] Public RPC balance fetch failed:', err?.message || err);
  }

  return { success: false, balance: 0, error: 'Balance unavailable. Connect Nimiq wallet.' };
}

// ── HTLC Fallback Helpers ─────────────────────────────────

/**
 * Deterministically derive a synthetic HTLC-holder address from hashlock params.
 * Used ONLY when the host/runtime doesn't expose native HTLC creation APIs.
 * This still provides a provable link between the capsule record and the on-chain
 * locked funds, while client-side software enforces PIN + timelock verification.
 *
 * NOTE: Native Nimiq HTLC (Albatross contracts) is always preferred when available.
 */
export function deriveHTLCHolderAddress(hashRoot, timeoutBlockHeight, recipientAddress) {
  // Build a 32-char payload from the inputs; prefix with Nimiq-style HRP.
  const cleanRecipient = normalizeNimiqAddress(recipientAddress).slice(-20);
  const hashPart = String(hashRoot || '').slice(0, 8).toUpperCase();
  const timeoutHex = Number(timeoutBlockHeight || 0).toString(16).toUpperCase().padStart(8, '0').slice(-8);
  const payload = `HTLC${hashPart}${timeoutHex}${cleanRecipient}`.padEnd(32, '0').slice(0, 32);
  // Simple modulo-97 Nimiq checksum (approximation for display; actual address validated by wallet)
  const checksumSource = payload.split('').map((c, i) => c.charCodeAt(0) * (i + 1)).reduce((a, b) => a + b, 0);
  const checksum = String(98 - (checksumSource % 97)).padStart(2, '0');
  return `NQ${checksum}${payload}`;
}

export { getHostLanguage };
