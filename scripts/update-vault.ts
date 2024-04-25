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
import { updateVaultInstruction } from "./instructions/update-vault";

async function updateVault() {
  const connection = await getConnection();
  const program = getProgram();
  const singer = getWallet().payer;
  const mint = getKeypair(".private/mint1.json");
  const collector = getKeypair(".private/collector1.json");

  const [programConfigAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const [vaultAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_info")],
    program.programId
  );

  const initializeProgramConfigInstruction = await updateVaultInstruction({
    accounts: {
      programConfig: programConfigAddress,
      vaultAccount: vaultAddress,
      admin: singer.publicKey,
    },
    args: {
      stake: new BN(5_000_000 * 10 ** 6),
      decimals: 6,
    },
    program,
  });
  const tx = new Transaction();

  tx.add(initializeProgramConfigInstruction);

  await sendAndConfirmTransaction(connection, tx, [singer]);
}

updateVault();
