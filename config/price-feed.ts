import {
  PriceFeed,
  PriceFeeds,
  SupportedNetwork,
  SupportedToken,
} from "../types";
import { chainlink_price_feed, tokens } from "./address";

export function getPriceFeeds(chain: SupportedNetwork): PriceFeeds {
  return {
    BTC: getPriceFeed("BTC", chain),
    ETH: getPriceFeed("ETH", chain),
    SOL: getPriceFeed("SOL", chain),
    USDC: getPriceFeed("USDC", chain),
    USDT: getPriceFeed("USDT", chain),
  };
}

export function getPriceFeed(
  token: SupportedToken,
  chain: SupportedNetwork
): PriceFeed<typeof token> {
  return {
    asset: tokens[chain][token].pubkey,
    dataFeed: chainlink_price_feed[chain][`${token}_USD`],
  };
}
