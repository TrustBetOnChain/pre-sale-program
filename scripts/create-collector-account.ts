import { Keypair } from "@solana/web3.js";
import {
  KEYPAIR_PATH,
  PRIVATE_FOLDER_PATH,
  getConnection,
  getWallet,
} from "../config";
import { createSplToken, savePrivateKey } from "../utils";

async function createSplAndSavePrivateKey() {
  const keypair = Keypair.generate();

  const path = `${PRIVATE_FOLDER_PATH}/collector1.json`;
  await savePrivateKey(keypair, path);
}

createSplAndSavePrivateKey().then();
