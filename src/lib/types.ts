export type MediaItem = { type: "image" | "video" | "link"; url: string };

export interface TokenRow {
  address: string;
  name: string;
  symbol: string;
  image_url: string | null;
  creator_username: string;
  creator_wallet: string | null;
  prmpted_url: string;
  post_author: string | null;
  post_title: string | null;
  post_content: string | null;
  post_media: MediaItem[];
  launcher_wallet: string | null;
  tx_hash: string | null;
  created_at: string;
}

export interface PrmptedPost {
  url: string;
  username: string | null;
  author: string | null;
  title: string | null;
  content: string | null;
  media: MediaItem[];
  source: "og" | "api" | "manual";
  fetched_at?: string;
}

export interface TradeRow {
  id: number;
  token_address: string;
  trader: string;
  side: "buy" | "sell";
  mon_amount: number;
  token_amount: number;
  price: number | null;
  creator_fee: number | null;
  platform_fee: number | null;
  tx_hash: string | null;
  created_at: string;
}

export interface HolderRow {
  token_address: string;
  wallet: string;
  balance: number;
  updated_at: string;
}

export interface UsernameClaimRow {
  username: string;
  wallet: string | null;
  verification_code: string | null;
  code_sent_to: string | null;
  status: "pending" | "verified";
  release_tx_hash: string | null;
  created_at: string;
  verified_at: string | null;
}
