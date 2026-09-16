-- ══════════════════════════════════════════════════════════════════
-- NimCapsule · Season 2 schema additions
-- Run this in the Supabase SQL editor AFTER migration.sql.
-- Safe to re-run: every statement is IF NOT EXISTS.
-- ══════════════════════════════════════════════════════════════════

-- Nimiq HTLC on-chain lock fields (written by app/lib/storage.js → addCapsule)
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS htlc_contract_address       TEXT;
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS htlc_hash_root              TEXT;
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS htlc_timeout_block_height   BIGINT;
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS htlc_creation_block_height  BIGINT;
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS htlc_pin_encrypted          TEXT;
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS htlc_long_secret_encrypted  TEXT;
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS htlc_recipient_address_hint TEXT;

-- On-chain claim payout tx (written by claimGift → updateCapsule)
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS gift_claim_tx_hash TEXT;

-- Recipient email: who the capsule is for. Used to email them the capsule
-- link (and claim code for NIM gifts) when the capsule is sealed.
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS recipient_email TEXT;

CREATE INDEX IF NOT EXISTS idx_capsules_recipient_email
  ON public.capsules (lower(recipient_email));
