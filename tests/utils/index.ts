import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionConfirmationStrategy,
} from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

export function calculateConfigSize(mintsLength: number) {
  const PUB_KEY_SIZE = 32;
  const BOOL_SIZE = 1;
  const DISCRIMINATOR_SIZE = 8;
  const VECTOR_SIZE = 4;
  const PRICE_SIZE = 8;

  const MINT_SIZE = PRICE_SIZE + PUB_KEY_SIZE;
  const BASE_CONFIG_SIZE =
    DISCRIMINATOR_SIZE + PUB_KEY_SIZE + PUB_KEY_SIZE + BOOL_SIZE;

  return BASE_CONFIG_SIZE + VECTOR_SIZE + MINT_SIZE * mintsLength;
}

export async function airdrop(
  pubkey: PublicKey,
  amount: number,
  connection: Connection
) {
  const airdropSignature = await connection.requestAirdrop(
    pubkey,
    amount * LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(
    {
      signature: airdropSignature,
    } as TransactionConfirmationStrategy,
    "confirmed"
  );
}

export async function createSplToken(
  signer: Keypair,
  mintKeypair: Keypair,
  decimals: number,
  connection: Connection
) {
  await createMint(
    connection,
    signer,
    signer.publicKey,
    signer.publicKey,
    decimals,
    mintKeypair
  );
}

export function convertToLamports(amount: number, decimals: number): BN {
  const multiplier = new BN(10).pow(new BN(decimals));
  const lamports = new BN(amount).mul(multiplier);
  return lamports;
}
