import { PublicKey } from "@solana/web3.js";
import { PreSaleProgram } from "../../target/types/pre_sale_program";
import { BN, Program } from "@coral-xyz/anchor";

type ClaimTokensArgs = {
  accounts: {
    signer: PublicKey;
    userVaultAccount: PublicKey;
    userTokenAccount: PublicKey;
    programConfig: PublicKey;
    vaultMint: PublicKey;
  };
  program: Program<PreSaleProgram>;
};

export function claimTokensInstruction({ accounts, program }: ClaimTokensArgs) {
  return program.methods.claimTokens().accounts(accounts).instruction();
}
