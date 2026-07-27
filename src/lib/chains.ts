import { defineChain } from "viem";

/**
 * Monad Testnet.
 *
 * NOTE: verify these values against the current Monad docs before deploying
 * (https://docs.monad.xyz). Defaults below reflect the public testnet.
 */
export const monadTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ?? 10143),
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url:
        process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ??
        "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ??
  "https://testnet.monadexplorer.com";

export function explorerTx(hash: string) {
  return `${EXPLORER_URL}/tx/${hash}`;
}
export function explorerAddress(addr: string) {
  return `${EXPLORER_URL}/address/${addr}`;
}
