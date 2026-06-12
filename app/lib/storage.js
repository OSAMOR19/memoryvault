/**
 * MemoryVault — LocalStorage capsule CRUD utilities
 *
 * Capsule shape:
 * {
 *   id: string,
 *   title: string,
 *   occasion: string,
 *   message: string,
 *   photos: string[],       // base64 data URIs
 *   gift: { enabled: boolean, amount: number },
 *   unlockDate: string,     // ISO date string
 *   createdAt: string,      // ISO date string
 *   openedAt: string|null,  // ISO date string or null
 *   status: string,         // 'sealed' | 'opened'
 * }
 */

const STORAGE_KEY = 'memoryvault_capsules';

/**
 * Generate a unique capsule ID (URL-safe, 12-char hex).
 */
export function generateId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Read all capsules from localStorage.
 */
export function getCapsules() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Get a single capsule by ID.
 */
export function getCapsule(id) {
  const capsules = getCapsules();
  return capsules.find((c) => c.id === id) || null;
}

/**
 * Save a new capsule. Returns the saved capsule object.
 */
export function addCapsule(data) {
  const capsules = getCapsules();
  const capsule = {
    id: generateId(),
    title: data.title || 'Untitled Capsule',
    occasion: data.occasion || 'custom',
    message: data.message || '',
    photos: data.photos || [],
    gift: data.gift || { enabled: false, amount: 0 },
    unlockDate: data.unlockDate || null,
    createdAt: new Date().toISOString(),
    openedAt: null,
    status: 'sealed',
  };
  capsules.push(capsule);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
  return capsule;
}

/**
 * Update a capsule by ID with partial updates.
 */
export function updateCapsule(id, updates) {
  const capsules = getCapsules();
  const index = capsules.findIndex((c) => c.id === id);
  if (index === -1) return null;
  capsules[index] = { ...capsules[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
  return capsules[index];
}

/**
 * Delete a capsule by ID.
 */
export function deleteCapsule(id) {
  const capsules = getCapsules();
  const filtered = capsules.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

/**
 * Check if a capsule's unlock date has passed.
 */
export function isUnlockable(capsule) {
  if (!capsule || !capsule.unlockDate) return false;
  if (capsule.status === 'opened' || capsule.openedAt) return false;
  return new Date(capsule.unlockDate) <= new Date();
}

/**
 * Check if a capsule is within 7 days of unlocking.
 */
export function isUnlockingSoon(capsule) {
  if (!capsule || !capsule.unlockDate) return false;
  if (capsule.status === 'opened' || capsule.openedAt) return false;
  const unlockDate = new Date(capsule.unlockDate);
  const now = new Date();
  if (unlockDate <= now) return false;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return unlockDate.getTime() - now.getTime() <= sevenDays;
}

/**
 * Derive the effective visual status of a capsule.
 * Returns: 'opened' | 'unlockable' | 'soon' | 'sealed'
 */
export function getEffectiveStatus(capsule) {
  if (!capsule) return 'sealed';
  if (capsule.status === 'opened' || capsule.openedAt) return 'opened';
  if (isUnlockable(capsule)) return 'unlockable';
  if (isUnlockingSoon(capsule)) return 'soon';
  return 'sealed';
}
