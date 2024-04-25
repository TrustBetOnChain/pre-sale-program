import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getConnection, getProgram, getWallet } from "../config";
import { updateProgramConfigInstruction } from "./instructions";
import { getKeypair } from "../utils";
import { BN } from "bn.js";
import { getPriceFeeds } from "../config/price-feed";

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
        // collectedFundsAccount: null,
        collectedFundsAccount: new PublicKey(
          "9StLPqawgBnTXVUkJ5eDCVj2Nnsdjuz2is9cAkKGQJqM"
        ),
        usdPrice: 10,
        usdDecimals: 2,
        // feeds: null,
        feeds: Object.values(getPriceFeeds("devnet")),
      },
      program,
    });
  const tx = new Transaction();

  tx.add(initializeProgramConfigInstruction);

  await sendAndConfirmTransaction(connection, tx, [singer]);
}

updateProgramConfig();
