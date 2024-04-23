import { Keypair, PublicKey } from "@solana/web3.js";
import {
  PRE_SALE_PROGRAM,
  PRIVATE_FOLDER_PATH,
  getConnection,
  getWallet,
} from "../../config";
import { getKeypair, mint } from "../../utils";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const fake_coins = {
  SOL: {
    pubkey: new PublicKey("So11111111111111111111111111111111111111112"),
    decimals: 9,
  },
  BTC: {
    pubkey: new PublicKey("CuSb9ZG6jNeaazooumpG5qKVJP66JshVh7hkCByhS2yh"),
    decimals: 8,
    url: "https://solscan.io/token/CuSb9ZG6jNeaazooumpG5qKVJP66JshVh7hkCByhS2yh?cluster=devnet",
  },
  ETH: {
    pubkey: new PublicKey("Aia2XxNLCcn4ACCMV5UQsRA4a5DvB3bdR7TD9zYEDXi"),
    decimals: 8,
    url: "https://solscan.io/token/Aia2XxNLCcn4ACCMV5UQsRA4a5DvB3bdR7TD9zYEDXi?cluster=devnet",
  },
  USDC: {
    pubkey: new PublicKey("7o3cpYj6EYKGUuHugpJUU15Jj9jcnwvpBgRFTKkQdD38"),
    url: "https://solscan.io/token/7o3cpYj6EYKGUuHugpJUU15Jj9jcnwvpBgRFTKkQdD38?cluster=devnet",
    decimals: 6,
  },
  USDT: {
    pubkey: new PublicKey("6BgzDTkhAWTKzF83Y8gRotLGjDbjfrU1TLWL2J7QTCBG"),
    url: "https://solscan.io/token/6BgzDTkhAWTKzF83Y8gRotLGjDbjfrU1TLWL2J7QTCBG?cluster=devnet",
    decimals: 6,
  },
};

async function mintSpl() {
  const payer = getWallet().payer;
  const connection = getConnection();
  const mintKeypair = getKeypair(`${PRIVATE_FOLDER_PATH}/mint1.json`);
  const fakeCoinsAuthority = getKeypair(
    `${PRIVATE_FOLDER_PATH}/fake-coins-authority.json`
  );

  const amount = 100_000;
  const decimals = 6;
  const amountLamports = amount * 10 ** decimals;

  const payerTokenAcc = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintKeypair.publicKey,
    payer.publicKey
  );

  let [tokenVaultAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    PRE_SALE_PROGRAM
  );

  console.log(tokenVaultAddress);

  await mint(
    tokenVaultAddress,
    amountLamports,
    payer,
    mintKeypair.publicKey,
    connection
  );
}

mintSpl().then();
