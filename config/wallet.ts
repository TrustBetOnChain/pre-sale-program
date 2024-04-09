import { Wallet } from "@coral-xyz/anchor";
import { getKeypair } from "../utils";
import { KEYPAIR_PATH } from "./vars";

export const getWallet = () => {
  return new Wallet(getKeypair(KEYPAIR_PATH));
};
