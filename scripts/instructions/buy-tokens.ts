import { PublicKey } from "@solana/web3.js";
import { PreSaleProgram } from "../../target/types/pre_sale_program";
import { BN, Program } from "@coral-xyz/anchor";

type BuyTokensArgs = {
  args: { amount: BN };
  accounts: {
    signer: PublicKey;
    vaultAccount: PublicKey;
    userVaultAccount: PublicKey;
    payerTokenAccount: PublicKey;
    collectedFundsTokenAccount: PublicKey;
    collectedFundsAccount: PublicKey;
    programConfig: PublicKey;
    vaultMint: PublicKey;
    chainlinkProgram: PublicKey;
    payerMint: PublicKey;
    chainlinkFeed: PublicKey;
  };
  program: Program<PreSaleProgram>;
};

export function buyTokensInstruction({
  accounts,
  program,
  args,
}: BuyTokensArgs) {
  return program.methods.buyTokens(args).accounts(accounts).instruction();
}
