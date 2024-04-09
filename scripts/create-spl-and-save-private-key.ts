import { Keypair } from "@solana/web3.js";
import {
  KEYPAIR_PATH,
  PRIVATE_FOLDER_PATH,
  getConnection,
  getWallet,
} from "../config";
import { createSplToken, savePrivateKey } from "../utils";

async function createCollectorAccount() {
  const keypair = Keypair.generate();

  const path = `${PRIVATE_FOLDER_PATH}/mint1.json`;
  await savePrivateKey(keypair, path);
  await createSplToken(getWallet().payer, keypair, 6, getConnection());
}

createCollectorAccount().then();
