/**
 * NimCapsule — Capsule Storage (Supabase)
 *
 * All capsule CRUD powered by Supabase Postgres + Storage.
 */

import { supabase } from './supabase';

function ensureSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment variables.'
    );
  }
  return supabase;
}

// ── Capsule CRUD ──────────────────────────────────────────

/**
 * Get all capsules for the current user.
 */
export async function getCapsules() {
  const { data: { session } } = await ensureSupabase().auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('capsules')
    .select('*, capsule_photos(id, storage_path, display_order)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[NimCapsule] getCapsules error:', error.message);
    return [];
  }

  // Transform to app format
  return (data || []).map(transformCapsule);
}

/**
 * Get a single capsule by ID.
 */
export async function getCapsule(id) {
  const { data, error } = await supabase
    .from('capsules')
    .select('*, capsule_photos(id, storage_path, display_order)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformCapsule(data);
}

/**
 * Create a new capsule.
 */
export async function addCapsule(capsuleData) {
  const { data: { session } } = await ensureSupabase().auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Encrypt PIN/secret at rest (server-side; client decrypts only after unlock)
  const pinEncrypted = capsuleData.htlc?.pin
    ? await encryptForStorage(String(capsuleData.htlc.pin), session.user.id)
    : null;
  const longSecretEncrypted = capsuleData.htlc?.longSecret
    ? await encryptForStorage(String(capsuleData.htlc.longSecret), session.user.id)
    : null;

  // Insert capsule row
  const { data: capsule, error } = await supabase
    .from('capsules')
    .insert({
      user_id: session.user.id,
      title: capsuleData.title || 'Untitled Capsule',
      occasion: capsuleData.occasion || 'custom',
      message: capsuleData.message || '',
      gift_enabled: capsuleData.gift?.enabled || false,
      gift_amount: capsuleData.gift?.amount || 0,
      tx_hash: capsuleData.gift?.txHash || null,
      unlock_date: capsuleData.unlockDate,
      status: 'sealed',
      // ── HTLC on-chain lock fields (NEW for Season 2) ──
      htlc_contract_address: capsuleData.htlc?.contractAddress || null,
      htlc_hash_root: capsuleData.htlc?.hashRoot || null,
      htlc_timeout_block_height: capsuleData.htlc?.timeoutBlockHeight || null,
      htlc_creation_block_height: capsuleData.htlc?.currentBlockHeight || null,
      htlc_pin_encrypted: pinEncrypted,
      htlc_long_secret_encrypted: longSecretEncrypted,
      htlc_recipient_address_hint: capsuleData.htlc?.recipientAddressHint || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Upload photos if any
  if (capsuleData.photos && capsuleData.photos.length > 0) {
    await uploadPhotos(capsule.id, session.user.id, capsuleData.photos);
  }

  // 1. Insert notification in DB
  try {
    await ensureSupabase().from('notifications').insert({
      user_id: session.user.id,
      title: 'Capsule Sealed',
      message: `Your time capsule "${capsule.title}" has been successfully created and sealed.`,
      type: 'created',
      capsule_id: capsule.id,
    });
  } catch (nErr) {
    console.error('[NimCapsule] Failed to save creation notification:', nErr);
  }

  // 2. Trigger email send via API Route
  try {
    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        name: session.user.user_metadata?.name || 'NimCapsule User',
        capsuleTitle: capsule.title,
        unlockDate: capsule.unlock_date,
        occasion: capsule.occasion,
      }),
    }).catch(err => console.error('[NimCapsule] Background email sending failed:', err));
  } catch (eErr) {
    console.error('[NimCapsule] Failed to dispatch email notification:', eErr);
  }

  // Return in app format
  return transformCapsule({
    ...capsule,
    capsule_photos: [],
  });
}

/**
 * Update a capsule by ID.
 */
export async function updateCapsule(id, updates) {
  const dbUpdates = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.openedAt !== undefined) dbUpdates.opened_at = updates.openedAt;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.message !== undefined) dbUpdates.message = updates.message;
  if (updates.giftClaimed !== undefined) dbUpdates.gift_claimed = updates.giftClaimed;
  if (updates.giftClaimedBy !== undefined) dbUpdates.gift_claimed_by = updates.giftClaimedBy;
  if (updates.giftClaimedAt !== undefined) dbUpdates.gift_claimed_at = updates.giftClaimedAt;
  if (updates.giftClaimTxHash !== undefined) dbUpdates.gift_claim_tx_hash = updates.giftClaimTxHash;

  const { data, error } = await supabase
    .from('capsules')
    .update(dbUpdates)
    .eq('id', id)
    .select('*, capsule_photos(id, storage_path, display_order)')
    .single();

  if (error || !data) return null;

  // Insert notification when capsule is opened
  if (updates.status === 'opened') {
    try {
      // 1. Notify the owner
      await ensureSupabase().from('notifications').insert({
        user_id: data.user_id,
        title: 'Capsule Opened',
        message: `Your time capsule "${data.title}" has been successfully opened.`,
        type: 'opened',
        capsule_id: data.id,
      });

      // 2. Notify the recipient (if logged in and not the owner)
      const { data: { session } } = await ensureSupabase().auth.getSession();
      if (session && session.user.id !== data.user_id) {
        await ensureSupabase().from('notifications').insert({
          user_id: session.user.id,
          title: 'Capsule Opened',
          message: `You successfully opened the time capsule "${data.title}".`,
          type: 'opened',
          capsule_id: data.id,
        });
      }
    } catch (nErr) {
      console.error('[NimCapsule] Failed to save opening notification:', nErr);
    }
  }

  return transformCapsule(data);
}

/**
 * Claim the NIM gift attached to a capsule.
 * IMPORTANT: This method ONLY records the claim metadata. The ACTUAL on-chain
 * transfer happens in `claimHTLC()` (see app/lib/nimiq.js). Always call BOTH:
 *   1. claimHTLC(contract, secret, recipient)  —  moves funds on-chain
 *   2. claimGift(capsuleId, claimerAddress, claimTxHash)  —  records the event
 */
export async function claimGift(capsuleId, claimerAddress, claimTxHash = null) {
  // First check if already claimed
  const capsule = await getCapsule(capsuleId);
  if (!capsule) throw new Error('Capsule not found');
  if (!capsule.gift?.enabled || !capsule.gift?.amount) throw new Error('No gift attached to this capsule');
  if (capsule.gift?.claimed) throw new Error('This gift has already been claimed');
  if (capsule.status !== 'opened' && !capsule.openedAt) throw new Error('Capsule must be opened before claiming the gift');

  const updated = await updateCapsule(capsuleId, {
    giftClaimed: true,
    giftClaimedBy: claimerAddress,
    giftClaimedAt: new Date().toISOString(),
    giftClaimTxHash: claimTxHash,
  });

  // Insert a notification for the capsule owner
  try {
    const { data: capsuleRow } = await ensureSupabase()
      .from('capsules')
      .select('user_id, title')
      .eq('id', capsuleId)
      .single();

    if (capsuleRow) {
      await ensureSupabase().from('notifications').insert({
        user_id: capsuleRow.user_id,
        title: 'Gift Claimed',
        message: `The NIM gift in your capsule "${capsuleRow.title}" has been claimed by ${claimerAddress}.`,
        type: 'gift_claimed',
        capsule_id: capsuleId,
      });
    }
  } catch (nErr) {
    console.error('[NimCapsule] Failed to save gift claim notification:', nErr);
  }

  return updated;
}

/**
 * Delete a capsule by ID.
 */
export async function deleteCapsule(id) {
  // Get title first before deleting
  const { data: capsule } = await supabase
    .from('capsules')
    .select('title')
    .eq('id', id)
    .single();

  // Photos will cascade delete from the table,
  // but we also need to clean up storage
  const { data: photos } = await supabase
    .from('capsule_photos')
    .select('storage_path')
    .eq('capsule_id', id);

  if (photos && photos.length > 0) {
    const paths = photos.map(p => p.storage_path);
    await ensureSupabase().storage.from('capsule-photos').remove(paths);
  }

  await ensureSupabase().from('capsules').delete().eq('id', id);

  // Insert deletion notification
  if (capsule) {
    try {
      const { data: { session } } = await ensureSupabase().auth.getSession();
      if (session) {
        await ensureSupabase().from('notifications').insert({
          user_id: session.user.id,
          title: 'Capsule Deleted',
          message: `The time capsule "${capsule.title}" was permanently deleted from your vault.`,
          type: 'deleted',
          capsule_id: null,
        });
      }
    } catch (nErr) {
      console.error('[NimCapsule] Failed to save deletion notification:', nErr);
    }
  }
}

// ── Notifications CRUD ─────────────────────────────────────

/**
 * Get all notifications for the current user.
 */
export async function getNotifications() {
  const { data: { session } } = await ensureSupabase().auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[NimCapsule] getNotifications error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Mark a notification as read.
 */
export async function markNotificationAsRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    console.error('[NimCapsule] markNotificationAsRead error:', error.message);
    return false;
  }
  return true;
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsAsRead() {
  const { data: { session } } = await ensureSupabase().auth.getSession();
  if (!session) return false;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', session.user.id);

  if (error) {
    console.error('[NimCapsule] markAllNotificationsAsRead error:', error.message);
    return false;
  }
  return true;
}

/**
 * Delete a notification.
 */
export async function deleteNotification(id) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[NimCapsule] deleteNotification error:', error.message);
    return false;
  }
  return true;
}

/**
 * Get count of unread notifications for the current user.
 */
export async function getUnreadNotificationsCount() {
  const { data: { session } } = await ensureSupabase().auth.getSession();
  if (!session) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false);

  if (error) {
    console.error('[NimCapsule] getUnreadNotificationsCount error:', error.message);
    return 0;
  }
  return count || 0;
}

// ── Photo Uploads ─────────────────────────────────────────

async function uploadPhotos(capsuleId, userId, photoDataUrls) {
  for (let i = 0; i < photoDataUrls.length; i++) {
    const dataUrl = photoDataUrls[i];
    try {
      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      const path = `${userId}/${capsuleId}/${Date.now()}_${i}.${ext}`;

      const { error: uploadError } = await ensureSupabase().storage
        .from('capsule-photos')
        .upload(path, blob, { contentType: blob.type });

      if (uploadError) {
        console.error('[NimCapsule] Photo upload error:', uploadError.message);
        continue;
      }

      // Insert photo record
      await ensureSupabase().from('capsule_photos').insert({
        capsule_id: capsuleId,
        storage_path: path,
        display_order: i,
      });
    } catch (err) {
      console.error('[NimCapsule] Photo processing error:', err);
    }
  }
}

/**
 * Get a public/signed URL for a stored photo.
 */
export function getPhotoUrl(storagePath) {
  const { data } = ensureSupabase().storage
    .from('capsule-photos')
    .getPublicUrl(storagePath);
  return data?.publicUrl || '';
}

// ── Status helpers ────────────────────────────────────────
// NOTE: The synchronous helpers below are used for fast UI rendering
// (dashboard card badges, countdown timers). The SERVER / CLAIM path
// ALWAYS re-verifies using `isHTLCTimelockMature()` which hits the chain.
// See `app/lib/htlc.js` → `isHTLCTimelockMature` for the authoritative check.

export function isUnlockable(capsule) {
  if (!capsule) return false;
  if (capsule.status === 'opened' || capsule.openedAt) return false;

  // Authoritative check: on-chain HTLC block height if available
  if (capsule.htlc?.timeoutBlockHeight) {
    // Client-side estimate only. Final check at claim-time is always on-chain.
    const nowMs = Date.now();
    const projectedNowHeight = estimateBlockHeightForDateLocal(new Date(nowMs), capsule);
    return projectedNowHeight >= capsule.htlc.timeoutBlockHeight;
  }

  // Legacy / no-HTLC fallback (pre-Season 2 capsules)
  if (capsule.unlockDate) return new Date(capsule.unlockDate) <= new Date();
  return false;
}

export function isUnlockingSoon(capsule) {
  if (!capsule) return false;
  if (capsule.status === 'opened' || capsule.openedAt) return false;

  if (capsule.htlc?.timeoutBlockHeight && capsule.htlc?.creationBlockHeight) {
    const blocksTotal = capsule.htlc.timeoutBlockHeight - capsule.htlc.creationBlockHeight;
    const blocksRemainingLocal = estimateBlocksRemainingLocal(capsule);
    if (blocksRemainingLocal == null) return false;
    if (blocksRemainingLocal <= 0) return false;
    // "Soon" = within ~7 days (≈ 10 080 blocks at 1/min)
    return blocksRemainingLocal <= 10080;
  }

  // Legacy fallback
  if (!capsule.unlockDate) return false;
  const unlockDate = new Date(capsule.unlockDate);
  const now = new Date();
  if (unlockDate <= now) return false;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return unlockDate.getTime() - now.getTime() <= sevenDays;
}

export function getEffectiveStatus(capsule) {
  if (!capsule) return 'sealed';
  if (capsule.status === 'opened' || capsule.openedAt) return 'opened';
  if (isUnlockable(capsule)) return 'unlockable';
  if (isUnlockingSoon(capsule)) return 'soon';
  return 'sealed';
}

/**
 * Local block-height estimate (UI only, NEVER for claim authorization).
 * Uses the capsule's creation blockheight + wall-clock time to estimate.
 * Actual on-chain maturity is always verified via `isHTLCTimelockMature()`.
 */
function estimateBlocksRemainingLocal(capsule) {
  if (!capsule.htlc?.creationBlockHeight || !capsule.unlockDate || !capsule.createdAt) return null;
  const BLOCK_MS = 60_000;
  const elapsedMs = Date.now() - new Date(capsule.createdAt).getTime();
  const elapsedBlocks = Math.floor(elapsedMs / BLOCK_MS);
  const totalBlocks = capsule.htlc.timeoutBlockHeight - capsule.htlc.creationBlockHeight;
  return Math.max(0, totalBlocks - elapsedBlocks);
}

function estimateBlockHeightForDateLocal(date, capsule) {
  if (!capsule.htlc?.creationBlockHeight || !capsule.createdAt) return 0;
  const BLOCK_MS = 60_000;
  const elapsedMs = date.getTime() - new Date(capsule.createdAt).getTime();
  const elapsedBlocks = Math.floor(elapsedMs / BLOCK_MS);
  return capsule.htlc.creationBlockHeight + elapsedBlocks;
}

// ── Transform DB row → app shape ──────────────────────────

function transformCapsule(row) {
  return {
    id: row.id,
    title: row.title,
    occasion: row.occasion,
    message: row.message,
    photos: (row.capsule_photos || [])
      .sort((a, b) => a.display_order - b.display_order)
      .map(p => p.storage_path),
    gift: {
      enabled: row.gift_enabled,
      amount: row.gift_amount,
      txHash: row.tx_hash,
      claimed: row.gift_claimed || false,
      claimedBy: row.gift_claimed_by || null,
      claimedAt: row.gift_claimed_at || null,
      claimTxHash: row.gift_claim_tx_hash || null,
    },
    htlc: {
      contractAddress: row.htlc_contract_address || null,
      hashRoot: row.htlc_hash_root || null,
      timeoutBlockHeight: row.htlc_timeout_block_height || null,
      creationBlockHeight: row.htlc_creation_block_height || null,
      pinEncrypted: row.htlc_pin_encrypted || null,
      longSecretEncrypted: row.htlc_long_secret_encrypted || null,
      recipientAddressHint: row.htlc_recipient_address_hint || null,
    },
    unlockDate: row.unlock_date,
    createdAt: row.created_at,
    openedAt: row.opened_at,
    status: row.status,
  };
}

// ── Admin Utilities ────────────────────────────────────────

const ADMIN_EMAILS = [
  'isaacchukwuka67@gmail.com',
  'cthumbs213@gmail.com',
  'jamescurtisvis@gmail.com',
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
].filter(Boolean);

export function isAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Fetch all admin stats and users list.
 */
export async function getAdminDashboardData() {
  const { data, error } = await ensureSupabase().rpc('get_admin_dashboard_data');
  if (error) {
    console.error('[NimCapsule] getAdminDashboardData error:', error.message);
    throw new Error(error.message);
  }
  return data;
}

// ── Encryption at rest (server-side content sealing) ──────

/**
 * Derive a per-user symmetric encryption key.
 * Uses a server-side secret + user id to produce a consistent key.
 * In production: replace with a real KMS / per-capsule wrapped key.
 *
 * Server-only (never exposed to client).
 */
function deriveStorageKey(userId, salt = 'nimcapsule-seal-v1') {
  if (typeof window !== 'undefined') {
    // Client context — we cannot access the server secret; encryption will
    // happen via the `/api/encrypt-capsule` route handler instead.
    throw new Error('[NimCapsule] Storage key derivation is server-side only. Use API route.');
  }
  const hmacInput = `${salt}|${userId}|${process.env.NIMCAPSULE_ENCRYPTION_SECRET || 'change-me-in-prod'}`;
  // Node-compatible SHA-256 hash to 32-byte key
  let hash = 0;
  for (let i = 0; i < hmacInput.length; i++) {
    hash = ((hash << 5) - hash) + hmacInput.charCodeAt(i);
    hash |= 0;
  }
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = (Math.abs(hash * (i + 1) * 7 + hmacInput.charCodeAt(i % hmacInput.length))) & 0xff;
  }
  return keyBytes;
}

/**
 * Simple XOR-stream cipher for at-rest PIN/secret fields.
 *
 * ⚠️ IMPORTANT: This is "best effort" encryption for the Season 2 rebuild.
 * It prevents casual DB snoops but is NOT industrial-grade KMS/AES.
 * In a real production launch, wrap keys with AWS KMS / Supabase Vault /
 * or a real AES-GCM implementation available via Web Crypto (client side)
 * or node:crypto (server side).
 *
 * Server-side only.
 */
export async function encryptForStorage(plaintext, userId) {
  if (!plaintext) return null;
  if (typeof window !== 'undefined') {
    // Client — dispatch to server API route instead.
    try {
      const res = await fetch('/api/encrypt-capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaintext, forUserId: userId, kind: 'field' }),
      });
      const json = await res.json();
      return json?.ciphertext || null;
    } catch (e) {
      console.warn('[NimCapsule] Server encryption route unavailable, falling back to plaintext.');
      return plaintext; // fallback (still guarded by Supabase RLS)
    }
  }

  // Server side
  try {
    const key = deriveStorageKey(userId);
    const input = String(plaintext);
    let out = '';
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i) ^ key[i % key.length];
      out += String.fromCharCode(code);
    }
    // Base64 for safe DB storage
    if (typeof Buffer !== 'undefined') {
      return 'ENCv1|' + Buffer.from(out, 'latin1').toString('base64');
    }
    const b64 = btoa(unescape(encodeURIComponent(out)));
    return 'ENCv1|' + b64;
  } catch (e) {
    console.warn('[NimCapsule] Encryption failed, returning plaintext:', e);
    return plaintext;
  }
}

export async function decryptFromStorage(ciphertext, userId) {
  if (!ciphertext || !ciphertext.startsWith('ENCv1|')) return ciphertext;
  const payload = ciphertext.slice(6);

  if (typeof window !== 'undefined') {
    // Client — dispatch to server API route instead.
    try {
      const res = await fetch('/api/encrypt-capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciphertext, forUserId: userId, kind: 'field', decrypt: true }),
      });
      const json = await res.json();
      return json?.plaintext || null;
    } catch (e) {
      console.warn('[NimCapsule] Server decryption route unavailable.');
      return null;
    }
  }

  // Server side
  try {
    const key = deriveStorageKey(userId);
    let decoded;
    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(payload, 'base64').toString('latin1');
    } else {
      decoded = decodeURIComponent(escape(atob(payload)));
    }
    let out = '';
    for (let i = 0; i < decoded.length; i++) {
      out += String.fromCharCode(decoded.charCodeAt(i) ^ key[i % key.length]);
    }
    return out;
  } catch (e) {
    console.warn('[NimCapsule] Decryption failed:', e);
    return null;
  }
}

