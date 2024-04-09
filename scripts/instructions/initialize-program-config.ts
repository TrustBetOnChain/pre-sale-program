import { Keypair, PublicKey } from "@solana/web3.js";
import { PreSaleProgram } from "../../target/types/pre_sale_program";
import { Program } from "@coral-xyz/anchor";

type InitializeProgramConfigAgrs = {
  accounts: {
    signer: PublicKey;
    programConfig: PublicKey;
    chainlinkProgram: PublicKey;
    collectedFundsAccount: PublicKey;
    vaultAccount: PublicKey;
    mint: PublicKey;
  };
  program: Program<PreSaleProgram>;
};

export function initializeProgramConfigInstuction({
  accounts,
  program,
}: InitializeProgramConfigAgrs) {
  return program.methods
    .initializeProgramConfig()
    .accounts(accounts)
    .instruction();
}
