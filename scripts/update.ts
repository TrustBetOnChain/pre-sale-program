import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  SOL_USD_FEED_DEV,
  USDC_DEV,
  USDC_USD_FEED_DEV,
  WSOL_DEV,
  getConnection,
  getProgram,
  getWallet,
} from "../config";
import { updateProgramConfigInstruction } from "./instructions";
import { getKeypair } from "../utils";
import { BN } from "bn.js";

async function updateProgramConfig() {
  const connection = await getConnection();
  const program = getProgram();
  const singer = getWallet().payer;
  const mint = getKeypair(".private/mint1.json");
  const collector = getKeypair(".private/collector1.json");

  const [programConfigAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const initializeProgramConfigInstruction =
    await updateProgramConfigInstruction({
      accounts: {
        programConfig: programConfigAddress,
        admin: singer.publicKey,
      },
      args: {
        hasPresaleEnded: null,
        admin: null,
        chainlinkProgram: null,
        collectedFundsAccount: null,
        usdPrice: new BN(10),
        usdDecimals: 2,
        feeds: [
          { dataFeed: SOL_USD_FEED_DEV, asset: WSOL_DEV },
          { dataFeed: USDC_USD_FEED_DEV, asset: USDC_DEV },
        ],
      },
      program,
    });
  const tx = new Transaction();

  tx.add(initializeProgramConfigInstruction);

  await sendAndConfirmTransaction(connection, tx, [singer]);
}

updateProgramConfig();
