# zaay.fun 🚀

A **pump.fun-style bonding-curve token launchpad for the [prmpted.com](https://prmpted.com) community.**
Launch a token on any prmpted.com post — and **4% of every trade flows to the original poster**.
If that poster hasn't linked a wallet yet, their fees are locked on-chain in a `FeeEscrow`
keyed to their username, and released the moment they claim.

> ⚠️ **Testnet only.** Everything runs on **Monad Testnet**. Tokens have no real value.
> The contracts are unaudited demo contracts — do not use them with real funds.

---

## Features

- **Launch on a post** — paste a prmpted.com URL; we scrape the author, title, content & media and deploy a bonding-curve ERC-20.
- **Bonding-curve trading** — buy/sell against a linear curve; price rises with supply. Live price, market cap, chart, holders and trades.
- **Creator fees + escrow** — 4% creator fee + 1% platform fee per trade. Unclaimed creator fees are held in `FeeEscrow`, tied to the username hash.
- **Claim a username** — code-verification flow; on success the backend releases escrowed fees on-chain and links the wallet, so future fees pay out directly.
- Clear **Testnet** badges, toasts, skeletons, error/empty states, mobile-first responsive UI.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn-style UI |
| Wallet / chain | RainbowKit + wagmi v2 + viem — Monad Testnet |
| Database | Supabase (Postgres + RLS) |
| Contracts | Solidity 0.8.24 + OpenZeppelin, Hardhat |
| Charts / toasts | Recharts, sonner |

---

## Project structure

```
zaay-fun/
├─ contracts/                 # Hardhat project
│  ├─ contracts/              # BondingCurveToken, FeeEscrow, TokenFactory
│  ├─ scripts/deploy.ts       # deploys + writes addresses to the frontend
│  └─ test/zaay.test.ts       # unit tests (10 passing)
├─ supabase/schema.sql        # database schema + RLS
├─ src/
│  ├─ app/                    # routes: /, /launch, /token/[address], /claim, /profile/[username], /explore
│  │  └─ api/                 # prmpted scrape, tokens, trades, claim
│  ├─ components/             # UI + TokenCard, BuySellPanel, BondingChart, PromptedEmbed, …
│  └─ lib/                    # wagmi/chains, supabase, prmpted adapter, bonding-curve math, contract ABIs
├─ .env.example
└─ README.md
```

---

## Getting started

### 0. Prerequisites
- Node 18+ (tested on Node 24)
- A Supabase project
- A WalletConnect Cloud project id
- A funded Monad Testnet account for deploying (get MON from a Monad faucet)

### 1. Install

```bash
npm install
cd contracts && npm install && cd ..
```

### 2. Configure the database

In the Supabase SQL editor, run the contents of [`supabase/schema.sql`](supabase/schema.sql).
It creates the `tokens`, `prmpted_posts`, `username_claims`, `trades`, and `holders`
tables with public-read RLS (writes go through server routes using the service-role key).

### 3. Deploy the contracts

```bash
cd contracts
# create contracts/.env with DEPLOYER_PRIVATE_KEY (+ optional PLATFORM_FEE_WALLET, ESCROW_CLAIMER_ADDRESS)
npm run compile
npm test            # 10 passing — verifies fee split, escrow, claim, curve
npm run deploy      # deploys to Monad Testnet
```

`deploy.ts` prints the addresses **and writes them to `src/lib/contracts/addresses.ts`**.
Copy the printed `NEXT_PUBLIC_*` values into your `.env.local` too.

> To try locally without a testnet: `npx hardhat node` in one terminal, then
> `npm run deploy:local` — though the frontend expects the Monad chain, so a real
> testnet deploy is recommended for the full flow.

### 4. Configure the frontend

```bash
cp .env.example .env.local
# fill in Supabase, WalletConnect, Monad, contract addresses, and the escrow claimer key
```

The **`ESCROW_CLAIMER_PRIVATE_KEY`** must correspond to an address authorized as a
claimer on the `FeeEscrow` (the deployer is authorized by default; add others via
`ESCROW_CLAIMER_ADDRESS` at deploy time). This key is used server-side by `/api/claim`
to release escrowed fees.

### 5. Run

```bash
npm run dev          # http://localhost:3000
```

---

## How it works

### Bonding curve
Price is linear in supply: `price(s) = basePrice + slope · s`. The MON cost to mint
tokens is the integral of price over the minted range (a trapezoid), so buys and sells
are symmetric and price rises monotonically. The same integer math is mirrored in
[`src/lib/bondingCurve.ts`](src/lib/bondingCurve.ts) for instant client-side quotes;
the contract is always the source of truth (the UI reads `quoteBuy`/`quoteSell` on-chain).

### Fees & escrow
Every trade takes **4% creator + 1% platform** from the MON leg.

- **Platform fee** → platform wallet.
- **Creator fee** → if the poster's username is already claimed (`FeeEscrow.walletFor`
  returns a wallet), it's paid **directly**. Otherwise it's sent to `FeeEscrow.deposit`
  and accrues under `keccak256(lowercased username)`.

### Claiming
1. Creator enters their prmpted username → backend issues a `ZAAY-XXXXXX` code.
2. They post the code from their prmpted account, then confirm.
3. Backend (an authorized claimer) calls `FeeEscrow.claimFor(usernameHash, wallet)`,
   which links the wallet and releases all accrued fees. Future fees pay out directly.

The username hash is computed identically on-chain (`FeeEscrow.hashUsername`) and
off-chain (`usernameHash` in `src/lib/bondingCurve.ts`): `keccak256` of the lowercased,
`@`-stripped username — so escrow keys always line up.

### prmpted.com extraction
prmpted.com has no public API, so [`OgScraperAdapter`](src/lib/prmpted/og-scraper.ts)
fetches the post server-side and parses Open Graph / Twitter / JSON-LD meta tags,
falling back to the username in the URL path. It's behind the `PromptedAdapter`
interface — swap in a real API later by changing one file (`getPrmptedAdapter`).
Results are cached in `prmpted_posts`.

---

## Scripts

Frontend (root):
- `npm run dev` / `build` / `start`
- `npm run typecheck`

Contracts (`contracts/`):
- `npm run compile` · `npm test` · `npm run deploy` · `npm run deploy:local` · `npm run node`

---

## Security notes

- Contracts are **unaudited testnet demos**. Do not deploy to mainnet or hold real value.
- The service-role key and escrow claimer key are **server-only** — never import them into client code.
- `FeeEscrow.claimFor` is gated to authorized claimers; the current claim flow trusts the
  backend's code check. For production you'd want a stronger username-ownership proof.
```
