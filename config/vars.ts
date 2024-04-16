import { PublicKey, clusterApiUrl } from "@solana/web3.js";
import { IDL } from "../target/types/pre_sale_program";

export const KEYPAIR_PATH = "/Users/yanmarinich/.config/solana/id.json";
export const PRIVATE_FOLDER_PATH = ".private";
import "dotenv/config";

const CLUSTER = process.env.CLUSTER;

export const CLUSTER_URL =
  CLUSTER === "localnet"
    ? "http://localhost:8899"
    : clusterApiUrl(CLUSTER as any);

export const PROGRAM_IDL = IDL;
