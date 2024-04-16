import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  CHAINLINK_PROGRAM,
  getConnection,
  getProgram,
  getWallet,
  tokens,
} from "../config";
import { getKeypair } from "../utils";
import { BN } from "@coral-xyz/anchor";
import * as chainlink from "@chainlink/solana-sdk";
import { getDataFeed } from "./get-data-feed";
import { getPriceFeed } from "../config/price-feed";
import { viewTokenAmount } from "./views";

async function getTokenAmount() {
  const connection = await getConnection();
  const program = getProgram();
  const singer = getWallet().payer;
  const mint = getKeypair(".private/mint1.json");
  const collector = getKeypair(".private/collector1.json");

  const feed = getPriceFeed("SOL", "devnet");

  let [programConfigAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const amount = await viewTokenAmount({
    accounts: {
      programConfig: programConfigAddress,
      vaultMint: mint.publicKey,
      chainlinkProgram: CHAINLINK_PROGRAM,
      payerMint: feed.asset,
      chainlinkFeed: feed.dataFeed,
    },
    args: { amount: new BN(`${1000 * Math.pow(10, 6)}`) },
    program,
  });

  console.log(amount.toNumber() / Math.pow(10, tokens.devnet.SOL.decimals));
}

getTokenAmount().then();
