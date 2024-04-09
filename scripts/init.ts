import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  CHAINLINK_PROGRAM_ID,
  getConnection,
  getProgram,
  getWallet,
} from "../config";
import { initializeProgramConfigInstuction } from "./instructions";
import { getKeypair } from "../utils";

async function init() {
  const connection = await getConnection();
  const program = getProgram();
  const singer = getWallet().payer;
  const mint = getKeypair(".private/mint1.json");
  const collector = getKeypair(".private/collector1.json");

  const [programConfigAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const [tokenVaultAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  );

  const initializeProgramConfigInstruction =
    await initializeProgramConfigInstuction({
      accounts: {
        signer: singer.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        mint: mint.publicKey,
        collectedFundsAccount: collector.publicKey,
        chainlinkProgram: CHAINLINK_PROGRAM_ID,
      },
      program,
    });
  const tx = new Transaction();

  tx.add(initializeProgramConfigInstruction);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  await sendAndConfirmTransaction(connection, tx, [singer]);
}

init();
