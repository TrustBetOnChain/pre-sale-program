import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionConfirmationStrategy,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

export function calculateConfigSize(mintsLength: number) {
  const PUB_KEY_SIZE = 32;
  const BOOL_SIZE = 1;
  const DISCRIMINATOR_SIZE = 8;
  const VECTOR_SIZE = 4;
  const USD_PRICE_SIZE = 16;
  const PRICE_DECIMALS_SIZE = 1;

  const MINT_SIZE = PUB_KEY_SIZE * 2;
  const BASE_CONFIG_SIZE =
    DISCRIMINATOR_SIZE +
    PUB_KEY_SIZE +
    PUB_KEY_SIZE +
    BOOL_SIZE +
    USD_PRICE_SIZE +
    PRICE_DECIMALS_SIZE;

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

export function toLamports(amount: number, decimals: number): BN {
  const multiplier = new BN(10).pow(new BN(decimals));
  const lamports = new BN(amount).mul(multiplier);
  return lamports;
}

export function convertLamports(amount: bigint, decimals: number): BN {
  const multiplier = new BN(10).pow(new BN(decimals));
  return new BN(amount.toString()).div(multiplier);
}

export const getReturnLog = (
  confirmedTransaction: VersionedTransactionResponse
): [buffer: Buffer, key: string, data: string] => {
  const prefix = "Program return: ";
  let log = confirmedTransaction.meta.logMessages.find((log) =>
    log.startsWith(prefix)
  );
  log = log.slice(prefix.length);
  const [key, data] = log.split(" ", 2);
  const buffer = Buffer.from(data, "base64");
  return [buffer, key, data];
};
