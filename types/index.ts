import { PublicKey } from "@solana/web3.js";

export type SupportedNetwork = "mainnet-beta" | "devnet";
export type SupportedToken = "SOL" | "BTC" | "ETH" | "USDC" | "USDT";
export type SupportedPair = `${SupportedToken}_USD`;

export type SplToken = {
  pubkey: PublicKey;
  decimals: number;
};

export type ChainlinkFeed = Record<SupportedPair, PublicKey>;
export type SupportedTokens = Record<SupportedToken, SplToken>;

export type PriceFeed<T extends SupportedToken> = {
  asset: SupportedTokens[T]["pubkey"];
  dataFeed: ChainlinkFeed[`${T}_USD`];
};

export type PriceFeeds = {
  [K in SupportedToken]: PriceFeed<K>;
};
