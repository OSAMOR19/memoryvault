<div align="center">
  <img src="./public/logo.png" alt="NimCapsule" width="96" height="96" style="border-radius: 20px;" />
  <h1>🧡 NimCapsule</h1>
  <p><strong>Your memories, sealed in time. On Nimiq.</strong></p>
  <p>
    Create digital time capsules filled with messages, photos &amp; NIM crypto gifts.<br/>
    Locked with a real on-chain <a href="#how-the-htlc-time-lock-works">Nimiq HTLC</a> — nobody can open them early. Not even us.
  </p>
  <p>
    <a href="https://nimcapsule.app"><strong>🌐 Live App</strong></a>
    &nbsp;·&nbsp;
    <a href="#how-it-works">How It Works</a>
    &nbsp;·&nbsp;
    <a href="#nimiq-sdk-usage">Nimiq SDK</a>
    &nbsp;·&nbsp;
    <a href="#local-development">Run Locally</a>
  </p>
  <br/>
  <img src="./public/screenshots/hero-preview.png" alt="NimCapsule — Sealed capsule with countdown timer" style="border-radius: 16px; max-width: 720px; box-shadow: 0 8px 40px rgba(0,0,0,0.12);" />
</div>

---

## ✨ What NimCapsule Does

NimCapsule lets you seal **messages, photos, and NIM cryptocurrency gifts** inside a digital time capsule that unlocks at a future date.

- **For birthdays** — Send a letter + NIM to your 18-year-old self today.
- **For anniversaries** — Hide a love note and a gift inside for next year.
- **For graduations, weddings, or "just because"** — Surprise someone in 5 months or 5 years.

**The difference between NimCapsule and every other "time capsule" web app:**
The lock is **mathematical**, not a database flag. We use Nimiq Hash Time-Locked Contracts
on the Albatross blockchain. The date is enforced by 1,000+ validators. If you seal a
capsule until **January 1, 2030**, **no one** — not the NimCapsule team, not Supabase, not
the recipient — can open it before that block height arrives on the Nimiq chain.

---

## 🖼️ Screenshots

| 🔒 Sealed Capsule | 🎁 Unlock + Claim | 🔐 Claim Code Gate |
|---|---|---|
| ![Sealed](./public/screenshots/sealed.png) | ![Claim](./public/screenshots/claim.png) | ![PIN Gate](./public/screenshots/pin-gate.png) |

| 🗓️ Create Flow · Occasion | 💸 Create Flow · Attach NIM | 📊 Dashboard |
|---|---|---|
| ![Occasions](./public/screenshots/create-occasion.png) | ![Gift](./public/screenshots/create-gift.png) | ![Dashboard](./public/screenshots/dashboard.png) |

---

## 🏗️ How It Works

### The Two Locks (Season 2)

Every NimCapsule gift uses a **Nimiq HTLC (Hash Time-Locked Contract)** with two
independent locks that both must be satisfied to release the NIM:
      ┌───────────────────────────────────────────────┐
      │            NIMIQU HTLC ON-CHAIN               │
      │                                               │
      │   ┌─────────HASHLOCK──────────┐              │
      │   │  SHA-256(claim-code)      │  ◀── Creator  │
      │   │  = stored hashRoot        │      shares   │
      │   └───────────────────────────┘      PIN to   │
      │                                      recipient│
      │   ┌────────TIMELOCK───────────┐              │
      │   │  blockHeight >= target    │  ◀── Set at  │
      │   │  (not a wall clock!)      │      creation │
      │   └───────────────────────────┘              │
      │                                               │
      │   BOTH must be true → funds sent to claimant │
      └───────────────────────────────────────────────┘


#### 1. Timelock → "You can't open it before the date"

When you create a capsule, the unlock date is projected to a **Nimiq block height**
(1 block ≈ 1 minute). This block number is burned into the HTLC contract itself — it's
not a column in Supabase that we (or a hacker) can `UPDATE`. The Nimiq validators enforce
it: any `claimHTLC` transaction mined before the target block is **rejected as invalid**.

See `app/lib/htlc.js::isHTLCTimelockMature()` for the authoritative chain check, and
`app/lib/nimiq.js::getCurrentBlockHeight()` for the live chain height query.

#### 2. Hashlock → "Only the person with the PIN can claim"

At creation the app generates a **6–8 digit cryptographically random PIN** and displays
it to the creator ONCE (like a seed phrase — "store it safely, you won't see it again").
The creator then shares this PIN with the recipient out-of-band (WhatsApp, letter, etc.).

We store **only the SHA-256 hash** of the PIN on-chain and in Supabase. To claim:
Without the PIN, the NIM is stuck forever (or until the 2× buffer timeout after which the
creator can `refundHTLC`).

### How the HTLC Time-Lock Works (Deep Dive)

| Season 1 (Fake) | Season 2 (Real — Nimiq HTLC) |
|---|---|
| Unlock date stored in Supabase `unlock_date` column | Unlock date = block height **burned into Nimiq HTLC contract** |
| Anyone with Supabase RLS can `UPDATE` the date and open any capsule | Only Nimiq consensus moves the `blockNumber` forward |
| `isUnlockable()` compares `new Date()` vs DB field on user's laptop | `isHTLCTimelockMature()` calls Nimiq RPC → live `blockNumber` on chain |
| NIM gift was sent to a **burn address** at creation 😬<br/>(claim just flipped a `gift_claimed` DB flag — **no tokens moved**) | NIM is **locked inside the HTLC** at creation; `claimHTLC()` pays recipient on-chain; `refundHTLC()` returns to creator if never claimed |
| Creator controls everything | Creator cannot unlock early; recipient needs the PIN |

### Content Security (Season 2)

Capsule **messages and photo metadata** are encrypted at rest using the
`/api/encrypt-capsule` server route with a per-user symmetric key derived from
`NIMCAPSULE_ENCRYPTION_SECRET + user_id`.

The decryption endpoint **refuses to serve content** (`423 Locked`) until the HTLC's
`timeoutBlockHeight` has been reached on-chain (verified via the same
`getCurrentBlockHeight` RPC). The database alone is not enough to decrypt a sealed
capsule's content. You need the chain.

---

## 📦 Nimiq SDK Usage

Every transaction in NimCapsule S2 uses **only the Nimiq Mini App SDK**
(`@nimiq/mini-app-sdk`) + the public Hub RPC. No RainbowKit, no Wagmi, no Viem, no EVM
libraries at all. (See S1 judge feedback → the EVM stack was completely removed.)

### SDK Integration Points

| File | What |
|---|---|
| [`app/lib/nimiq.js`](./app/lib/nimiq.js#L1-L475) | Full SDK wrapper: wallet connect, block height, balance, **`createHTLC` / `claimHTLC` / `refundHTLC`**, fallback holder-address derivation |
| [`app/lib/htlc.js`](./app/lib/htlc.js#L1-L258) | HTLC layer on top of SDK: `buildHTLCParams`, `sha256Hex`, `dateToTimeoutBlockHeight`, `isHTLCTimelockMature`, `verifySecret` |
| [`app/create/page.js`](./app/create/page.js#L142-L220) | Seal flow → `buildHTLCParams` → `createHTLC` (replaces the old burn-address `sendNimiqTransaction`) |
| [`app/capsule/[id]/page.js`](./app/capsule/[id]/page.js#L87-L200) | Open flow → on-chain `isHTLCTimelockMature` → PIN `verifySecret` → **`claimHTLC`** pays recipient on-chain |
| [`app/login/page.js`](./app/login/page.js#L120-L141) | 1-click Nimiq Pay host login via `getNimiqAuthIdentity` |
| [`app/components/NimiqWalletButton.js`](./app/components/NimiqWalletButton.js#L1-L116) | Universal connect button (Nimiq Host / Hub fallback) |

### Methods Used

```js
// Connection & identity import { init, listAccounts, requestDeviceIdentifier } from '@nimiq/mini-app-sdk'; await init(); // Initialize the injected host provider await provider.listAccounts(); // Get active wallet address await requestDeviceIdentifier(); // Or: anonymous device-ID fallback

// Transactions — all Nimiq-native, nothing else await window.nimiq.sendBasicTransaction({ recipient, value }); // Direct NIM send await window.nimiq.createHTLC({ recipient, value, hashRoot, timeout }); // ✨ LOCK await window.nimiq.claimHTLC({ contractAddress, secret, recipient }); // ✨ UNLOCK await window.nimiq.refundHTLC({ contractAddress }); // ✨ REFUND (after timeout) await window.nimiq.getBlockHeight(); // ✨ CHAIN STATE await window.nimiq.getBalance(address);

When the app runs in a **regular browser** instead of inside Nimiq Pay, the wrapper
automatically falls back to:
1. **Nimiq Hub `RPC.js`** (`https://hub.nimiq.com/RPC.js`) → `chooseAddress` + `checkout`
2. **Public JSON-RPC** (`https://rpc.nimiq.com`) → `blockNumber` / `getBalance` queries

---

## 🏁 Quick Start · Local Development

### Requirements

- Node.js ≥ 20
- NPM / Yarn / PNPM
- A Supabase project (Postgres + Storage) — see SQL schema below
- A Nimiq wallet (Nimiq Pay / Nimiq Hub) for testing real HTLCs on Testnet or Mainnet

### 1. Install

```bash


### 2. Environment Variables

Copy `.env.example` → `.env.local`:

```bash


── Supabase ──────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.....

⚠️ Service role — SERVER ONLY. NEVER expose to client / commit to git.
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.....

── NimCapsule Encryption ─────────────────────────────────
Used to encrypt PINs + content at rest. Generate with:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NIMCAPSULE_ENCRYPTION_SECRET=your_32_byte_random_secret_here

── Email (Resend) — optional for unlock reminders ────────
RESEND_API_KEY=re_................. RESEND_FROM_EMAIL="NimCapsule hello@nimcapsule.app"

── Admin emails (comma separated) ────────────────────────
NEXT_PUBLIC_ADMIN_EMAILS=you@example.com





### 3. Supabase Schema

Run this in your Supabase SQL editor:

```sql
-- Core capsules table create table if not exists public.capsules ( id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, title text not null default 'Untitled Capsule', occasion text not null default 'custom', message text not null default '', gift_enabled boolean not null default false, gift_amount numeric(12,2) not null default 0, tx_hash text, unlock_date timestamptz not null, status text not null default 'sealed', created_at timestamptz not null default now(), opened_at timestamptz, -- ── Season 2 HTLC fields (the real lock) ──────────────── htlc_contract_address text, htlc_hash_root text, htlc_timeout_block_height bigint, htlc_creation_block_height bigint, htlc_pin_encrypted text, htlc_long_secret_encrypted text, htlc_recipient_address_hint text, gift_claimed boolean not null default false, gift_claimed_by text, gift_claimed_at timestamptz, gift_claim_tx_hash text );

create index if not exists idx_capsules_user_id on public.capsules(user_id); alter table public.capsules enable row level security;

-- Photos table + storage bucket create table if not exists public.capsule_photos ( id uuid primary key default gen_random_uuid(), capsule_id uuid references public.capsules(id) on delete cascade not null, storage_path text not null, display_order int not null default 0 ); alter table public.capsule_photos enable row level security;

create table if not exists public.notifications ( id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, title text not null, message text not null, type text not null, capsule_id uuid references public.capsules(id) on delete set null, is_read boolean not null default false, created_at timestamptz not null default now() ); alter table public.notifications enable row level security;





Then create a **Storage bucket** named `capsule-photos` (public, max 5 MB per file).

### 4. Run

```bash
npm run dev

→ http://localhost:3000




Open inside [Nimiq Pay](https://nimiq.com/wallets/) for full in-wallet HTLC flows, or use
[Nimiq Hub](https://hub.nimiq.com/) in any browser for address selection + checkout.

### 5. Build & Test

```bash
npm run build && npm start npm run lint





---

## 🏆 Season 2 Judge Checklist

| P1 Critical | Status |
|---|---|
| ✅ Supabase unlock date → **on-chain Nimiq HTLC** | `app/lib/htlc.js` · `isHTLCTimelockMature()` queries RPC |
| ✅ Removed **RainbowKit / Wagmi / Viem** completely | Gone from `package.json` · no EVM deps |
| ✅ Wallet connection with **Nimiq SDK only** | `app/lib/nimiq.js::connectNimiqWallet` (Host + Hub) |
| ✅ Payment & payout with **Nimiq SDK only** | `createHTLC` (lock) · `claimHTLC` (pay recipient) · `refundHTLC` |
| ✅ **Full README rewrite** — screenshots · live link · product pitch · SDK docs | You're reading it ☝️ |

| P2 Season 2 Additions | Status |
|---|---|
| ✅ Claim flow — **PIN entry + wallet address** (no login required) | `app/capsule/[id]/page.js` · PIN gate modal + claim form |
| 🔧 Email notification system (send-email route exists; unlock-reminder cron next) | `app/api/send-email/route.js` |
| ✅ Server-side content encryption (PINs + message at rest) | `encryptForStorage` + `/api/encrypt-capsule` |
| ✅ Client-side decrypt-only-after-unlock | Decrypt endpoint checks `timeoutBlockHeight` on chain → `423` if locked |
| ✅ UI polish (wax seal · countdown · envelope reveal keyframes) | `app/globals.css` · `@keyframes waxStamp`, `envelopeOpen`, `confettiFall` |
| ✅ Occasion categories (Birthday · Anniversary · Graduation · Love · Just Because · Custom) | `app/create/page.js` · `OCCASIONS` |
| 🚧 Shareable OG preview card for social media | (Planned via `app/api/og/route.js`) |

---

## 🧭 Links

- 🌐 **Live App** → https://nimcapsule.app
- 💰 **Nimiq** → https://nimiq.com · 0-fee NIM transactions · human-readable addresses
- 📱 **Nimiq Pay** (mobile wallet that hosts Mini Apps) → https://nimiq.com/wallets/
- 🧩 **Nimiq Mini App SDK** → `@nimiq/mini-app-sdk` on NPM
- 📄 **License** → [MIT](./LICENSE)

---

<div align="center">
  <img src="https://img.shields.io/badge/Built_on-Nimiq-%23E9B114?style=for-the-badge&logo=nimiq&logoColor=white" alt="Built on Nimiq"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16"/>
  &nbsp;
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License"/>
  <br/><br/>
  <strong>Seal a memory today. Surprise them tomorrow.</strong><br/>
  Made with 🧡 for the Nimiq Mini Apps Competition — Season 2.
</div>
