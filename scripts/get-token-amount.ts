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
import { getDataFeed } from "./get-data-feed";

async function getTokenAmount() {
  const connection = await getConnection();
  const program = getProgram();
  const singer = getWallet().payer;
  const mint = getKeypair(".private/mint1.json");
  const collector = getKeypair(".private/collector1.json");

  console.log(mint.publicKey);

  let [programConfigAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const amount = await program.methods
    .getTokenAmount({ amount: new BN(1_000_000_000) })
    .accounts({
      programConfig: programConfigAddress,
      vaultMint: mint.publicKey,
      chainlinkProgram: CHAINLINK_PROGRAM_ID,
      payerMint: WSOL_DEV,
      chainlinkFeed: SOL_USD_FEED_DEV,
    })
    .view();

  console.log(amount.toNumber() / Math.pow(10, 6));
}

getDataFeed().then();
getTokenAmount().then();
