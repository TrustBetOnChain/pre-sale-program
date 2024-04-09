import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  CHAINLINK_PROGRAM_ID,
  SOL_USD_FEED_DEV,
  USDC_DEV,
  USDC_USD_FEED_DEV,
  WSOL_DEV,
  getConnection,
  getProgram,
  getWallet,
  getProvider,
  CHAINLINK_OFFCHAIN_PROGRAM_ID,
  USDC_USD_FEED,
  SOL_USD_FEED,
} from "../config";
import { initializeProgramConfigInstuction } from "./instructions";
import { getKeypair } from "../utils";
import { BN } from "@coral-xyz/anchor";
import * as chainlink from "@chainlink/solana-sdk";

export async function getDataFeed() {
  const connection = await getConnection();
  const program = getProgram();
  const singer = getWallet().payer;
  const mint = getKeypair(".private/mint1.json");
  const collector = getKeypair(".private/collector1.json");

  let [programConfigAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const data_feed = await program.methods
    .getDataFeed()
    .accounts({
      chainlinkProgram: CHAINLINK_PROGRAM_ID,
      chainlinkFeed: SOL_USD_FEED_DEV,
    })
    .view();

  // console.log(data_feed.value.toNumber());
  // console.log(data_feed.decimals);
  // console.log(data_feed.value.toNumber() / Math.pow(10, data_feed.decimals));
  // console.log(data_feed.value.toNumber() / 10e8);
  // console.log(1e8);
  // console.log(Math.pow(10, data_feed.decimals));
}

getDataFeed().then();
