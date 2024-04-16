import { Keypair } from "@solana/web3.js";
import {
  PRIVATE_FOLDER_PATH,
  getConnection,
  getWallet,
  tokens,
} from "../../config";
import { createSplToken, savePrivateKey } from "../../utils";

async function createCollectorAccount() {
  const decimals = tokens["mainnet-beta"].USDT.decimals;
  const keypair = Keypair.generate();
  const payer = getWallet().payer;
  const connection = getConnection();

  console.log(keypair.publicKey);

  const path = `${PRIVATE_FOLDER_PATH}/dev-usdt.json`;
  await savePrivateKey(keypair, path);
  await createSplToken(payer, keypair, decimals, connection);
}

createCollectorAccount().then();
