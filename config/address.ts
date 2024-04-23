import { PublicKey } from "@solana/web3.js";
import {
  ChainlinkFeed,
  SplToken,
  SupportedNetwork,
  SupportedToken,
  SupportedTokens,
} from "../types";
import { mockUsdtKeypair } from "../tests/mocks";

const chainlink_devnet_feed: ChainlinkFeed = {
  BTC_USD: new PublicKey("6PxBx93S8x3tno1TsFZwT5VqP8drrRCbCXygEXYNkFJe"),
  ETH_USD: new PublicKey("669U43LNHx7LsVj95uYksnhXUfWKDsdzVqev3V4Jpw3P"),
  SOL_USD: new PublicKey("99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR"),
  USDC_USD: new PublicKey("2EmfL3MqL3YHABudGNmajjCpR13NNEn9Y4LWxbDm6SwR"),
  USDT_USD: new PublicKey("8QQSUPtdRTboa4bKyMftVNRfGFsB4Vp9d7r39hGKi53e"),
};

const chainlink_mainnet_feed: ChainlinkFeed = {
  BTC_USD: new PublicKey("Cv4T27XbjVoKUYwP72NQQanvZeA7W4YF9L4EnYT9kx5o"),
  ETH_USD: new PublicKey("716hFAECqotxcXcj8Hs8nr7AG6q9dBw2oX3k3M8V7uGq"),
  SOL_USD: new PublicKey("CH31Xns5z3M1cTAbKW34jcxPPciazARpijcHj9rxtemt"),
  USDC_USD: new PublicKey("GzGuoKXE8Unn7Vcg1DtomwD27tL4bVUpSK2M1yk6Xfz5"),
  USDT_USD: new PublicKey("8vAuuqC5wVZ9Z9oQUGGDSjYgudTfjmyqGU5VucQxTk5U"),
};

export const chainlink_price_feed: Record<SupportedNetwork, ChainlinkFeed> = {
  "mainnet-beta": chainlink_mainnet_feed,
  devnet: chainlink_devnet_feed,
  testnet: chainlink_mainnet_feed,
};

export const PRE_SALE_PROGRAM = new PublicKey(
  "AUAfQQmCDmzKn3hLBPPPUq5E2Z1FwY6eETkAg1qmQfEm"
);

export const CHAINLINK_PROGRAM = new PublicKey(
  "HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"
);
export const CHAINLINK_OFFCHAIN_PROGRAM = new PublicKey(
  "cjg3oHmg9uuPsP8D6g29NWvhySJkdYdAo9D25PRbKXJ"
);

const devnet_tokens: Record<SupportedToken, SplToken> = {
  SOL: {
    pubkey: new PublicKey("So11111111111111111111111111111111111111112"),
    decimals: 9,
  },
  BTC: {
    pubkey: new PublicKey("CuSb9ZG6jNeaazooumpG5qKVJP66JshVh7hkCByhS2yh"),
    decimals: 8,
  },
  ETH: {
    pubkey: new PublicKey("Aia2XxNLCcn4ACCMV5UQsRA4a5DvB3bdR7TD9zYEDXi"),
    decimals: 8,
  },
  USDC: {
    pubkey: new PublicKey("7o3cpYj6EYKGUuHugpJUU15Jj9jcnwvpBgRFTKkQdD38"),
    decimals: 6,
  },
  USDT: {
    pubkey: new PublicKey("6BgzDTkhAWTKzF83Y8gRotLGjDbjfrU1TLWL2J7QTCBG"),
    decimals: 6,
  },
};

const mainnet_tokens: SupportedTokens = {
  SOL: {
    pubkey: new PublicKey("So11111111111111111111111111111111111111112"),
    decimals: 9,
  },
  BTC: {
    pubkey: new PublicKey("3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"),
    decimals: 8,
  },
  ETH: {
    pubkey: new PublicKey("7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"),
    decimals: 8,
  },
  USDC: {
    pubkey: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    decimals: 6,
  },
  USDT: {
    pubkey: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
    decimals: 6,
  },
};

export const tokens: Record<SupportedNetwork, SupportedTokens> = {
  ["mainnet-beta"]: mainnet_tokens,
  devnet: devnet_tokens,
  testnet: {
    ...mainnet_tokens,
    USDT: {
      pubkey: mockUsdtKeypair.publicKey,
      decimals: 6,
    },
  },
};
