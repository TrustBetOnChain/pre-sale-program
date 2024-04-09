import { AnchorProvider } from "@coral-xyz/anchor";
import { getConnection } from "./connection";
import { getWallet } from "./wallet";

export const getProvider = () => {
  const connection = getConnection();
  const wallet = getWallet();

  return new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
};
