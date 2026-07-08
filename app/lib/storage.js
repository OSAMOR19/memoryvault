/**
 * MemoryVault — Capsule Storage (Supabase)
 *
 * All capsule CRUD powered by Supabase Postgres + Storage.
 */

import { supabase } from './supabase';

// ── Capsule CRUD ──────────────────────────────────────────

/**
 * Get all capsules for the current user.
 */
export async function getCapsules() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('capsules')
    .select('*, capsule_photos(id, storage_path, display_order)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MemoryVault] getCapsules error:', error.message);
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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

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
      unlock_date: capsuleData.unlockDate,
      status: 'sealed',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Upload photos if any
  if (capsuleData.photos && capsuleData.photos.length > 0) {
    await uploadPhotos(capsule.id, session.user.id, capsuleData.photos);
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

  const { data, error } = await supabase
    .from('capsules')
    .update(dbUpdates)
    .eq('id', id)
    .select('*, capsule_photos(id, storage_path, display_order)')
    .single();

  if (error || !data) return null;
  return transformCapsule(data);
}

/**
 * Delete a capsule by ID.
 */
export async function deleteCapsule(id) {
  // Photos will cascade delete from the table,
  // but we also need to clean up storage
  const { data: photos } = await supabase
    .from('capsule_photos')
    .select('storage_path')
    .eq('capsule_id', id);

  if (photos && photos.length > 0) {
    const paths = photos.map(p => p.storage_path);
    await supabase.storage.from('capsule-photos').remove(paths);
  }

  await supabase.from('capsules').delete().eq('id', id);
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

      const { error: uploadError } = await supabase.storage
        .from('capsule-photos')
        .upload(path, blob, { contentType: blob.type });

      if (uploadError) {
        console.error('[MemoryVault] Photo upload error:', uploadError.message);
        continue;
      }

      // Insert photo record
      await supabase.from('capsule_photos').insert({
        capsule_id: capsuleId,
        storage_path: path,
        display_order: i,
      });
    } catch (err) {
      console.error('[MemoryVault] Photo processing error:', err);
    }
  }
}

/**
 * Get a public/signed URL for a stored photo.
 */
export function getPhotoUrl(storagePath) {
  const { data } = supabase.storage
    .from('capsule-photos')
    .getPublicUrl(storagePath);
  return data?.publicUrl || '';
}

// ── Status helpers ────────────────────────────────────────

export function isUnlockable(capsule) {
  if (!capsule || !capsule.unlockDate) return false;
  if (capsule.status === 'opened' || capsule.openedAt) return false;
  return new Date(capsule.unlockDate) <= new Date();
}

export function isUnlockingSoon(capsule) {
  if (!capsule || !capsule.unlockDate) return false;
  if (capsule.status === 'opened' || capsule.openedAt) return false;
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
    gift: { enabled: row.gift_enabled, amount: row.gift_amount },
    unlockDate: row.unlock_date,
    createdAt: row.created_at,
    openedAt: row.opened_at,
    status: row.status,
  };
}
