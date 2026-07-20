import { init, requestDeviceIdentifier, getHostLanguage } from '@nimiq/mini-app-sdk';

let nimiqProviderPromise = null;

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
        console.warn('[MemoryVault] Nimiq Mini App SDK not injected or timed out:', err);
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
 * Request active Nimiq address or device identifier from Nimiq Wallet
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
    console.warn('[MemoryVault] Error listing Nimiq accounts:', e);
  }

  // Fallback to Nimiq Device Identifier if available
  try {
    const deviceId = await requestDeviceIdentifier({ reason: 'Authenticate MemoryVault' });
    if (deviceId) {
      return { type: 'device', address: deviceId };
    }
  } catch (e) {
    console.warn('[MemoryVault] Error requesting Nimiq device ID:', e);
  }

  return null;
}

export { getHostLanguage };
