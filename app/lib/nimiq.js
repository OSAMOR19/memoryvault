import { init, requestDeviceIdentifier, getHostLanguage } from '@nimiq/mini-app-sdk';

let nimiqProviderPromise = null;
let hubScriptPromise = null;

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
 * Send NIM Transaction using Nimiq Wallet (Host or Hub API)
 */
export async function sendNimiqTransaction({ recipient = 'NQ0700000000000000000000000000000000', amountNim = 1 }) {
  if (typeof window === 'undefined') return { success: false, error: 'Open this app inside Nimiq Pay to connect your wallet.' };

  const lunas = Math.round(amountNim * 1e5); // 1 NIM = 100,000 Lunas

  // 1. Try Nimiq Host SDK
  if (window.nimiq && typeof window.nimiq.sendBasicTransaction === 'function') {
    try {
      const res = await window.nimiq.sendBasicTransaction({
        recipient,
        value: lunas,
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
        recipient,
        value: lunas,
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

export { getHostLanguage };
