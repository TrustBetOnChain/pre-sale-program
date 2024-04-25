import { Keypair, PublicKey, Signer } from "@solana/web3.js";
import { PreSaleProgram } from "../../target/types/pre_sale_program";
import { BN, Program } from "@coral-xyz/anchor";

type PriceFeedInfo = {
  asset: PublicKey;
  dataFeed: PublicKey;
};

type UpdateProgramConfigAgrs = {
  args: {
    hasPresaleEnded: boolean | null;
    admin: PublicKey | null;
    chainlinkProgram: PublicKey | null;
    collectedFundsAccount: PublicKey | null;
    usdPrice: number | null;
    usdDecimals: number | null;
    feeds: PriceFeedInfo[] | null;
  };
  accounts: {
    programConfig: PublicKey;
    admin: PublicKey;
  };
  program: Program<PreSaleProgram>;
};

export function updateProgramConfigInstruction({
  accounts,
  program,
  args,
}: UpdateProgramConfigAgrs) {
  return program.methods
    .updateProgramConfig(args)
    .accounts(accounts)
    .instruction();
}
