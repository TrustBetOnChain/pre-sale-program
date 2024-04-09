import { PublicKey } from "@solana/web3.js";
import { PreSaleProgram } from "../../target/types/pre_sale_program";
import { BN, Program } from "@coral-xyz/anchor";

type getTokenAmountArgs = {
  args: { amount: BN };
  accounts: {
    programConfig: PublicKey;
    vaultMint: PublicKey;
    chainlinkProgram: PublicKey;
    payerMint: PublicKey;
    chainlinkFeed: PublicKey;
  };
  program: Program<PreSaleProgram>;
};

export function getTokenAmountView({
  accounts,
  program,
  args,
}: getTokenAmountArgs): Promise<BN> {
  return program.methods.getTokenAmount(args).accounts(accounts).view();
}
