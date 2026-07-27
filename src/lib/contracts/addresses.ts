// Fallback addresses used until `contracts/scripts/deploy.ts` overwrites this file.
// After deploying, this file is auto-generated with real Monad Testnet addresses.
export const CONTRACT_ADDRESSES = {
  chainId: Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ?? 10143),
  factory:
    (process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`) ??
    "0x0000000000000000000000000000000000000000",
  escrow:
    (process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`) ??
    "0x0000000000000000000000000000000000000000",
  platformWallet:
    (process.env.NEXT_PUBLIC_PLATFORM_WALLET as `0x${string}`) ??
    "0x0000000000000000000000000000000000000000",
} as const;

export function contractsConfigured(): boolean {
  const zero = "0x0000000000000000000000000000000000000000";
  return (
    CONTRACT_ADDRESSES.factory !== zero &&
    CONTRACT_ADDRESSES.escrow !== zero
  );
}
