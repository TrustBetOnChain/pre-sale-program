import { PublicKey } from "@solana/web3.js";
import { PreSaleProgram } from "../../target/types/pre_sale_program";
import { BN, Program } from "@coral-xyz/anchor";

type WithdrawTokensArgs = {
  accounts: {
    admin: PublicKey;
    vaultAccount: PublicKey;
    tokenAccount: PublicKey;
    programConfig: PublicKey;
    vaultMint: PublicKey;
  };
  program: Program<PreSaleProgram>;
};

export function withdrawTokensInstruction({
  accounts,
  program,
}: WithdrawTokensArgs) {
  return program.methods.withdrawTokens().accounts(accounts).instruction();
}
