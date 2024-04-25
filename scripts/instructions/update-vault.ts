import { Keypair, PublicKey, Signer } from "@solana/web3.js";
import { PreSaleProgram } from "../../target/types/pre_sale_program";
import { BN, Program } from "@coral-xyz/anchor";

type UpdateProgramConfigAgrs = {
  args: {
    stake: BN | null;
    decimals: number | null;
  };
  accounts: {
    programConfig: PublicKey;
    vaultAccount: PublicKey;
    admin: PublicKey;
  };
  program: Program<PreSaleProgram>;
};

export function updateVaultInstruction({
  accounts,
  program,
  args,
}: UpdateProgramConfigAgrs) {
  return program.methods.updateVault(args).accounts(accounts).instruction();
}
