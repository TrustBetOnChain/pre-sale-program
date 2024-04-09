import { Connection } from "@solana/web3.js";
import { CLUSTER_URL } from ".";

export const getConnection = () => {
  return new Connection(CLUSTER_URL, "confirmed");
};
