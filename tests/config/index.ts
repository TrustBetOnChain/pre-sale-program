import { AnchorProvider, Wallet, setProvider } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

export const signerKeypair = Keypair.fromSecretKey(
  new Uint8Array([
    104, 111, 227, 68, 80, 198, 10, 155, 242, 12, 3, 96, 88, 98, 2, 227, 159, 8,
    187, 108, 44, 203, 127, 216, 107, 30, 74, 88, 213, 67, 221, 141, 148, 233,
    238, 76, 204, 72, 175, 20, 55, 185, 155, 29, 149, 76, 138, 216, 229, 16,
    200, 139, 34, 82, 69, 61, 141, 173, 111, 153, 170, 159, 45, 230,
  ])
);

export const randomKeypair = Keypair.fromSecretKey(
  new Uint8Array([
    78, 49, 163, 146, 231, 4, 222, 156, 189, 164, 83, 245, 24, 3, 81, 161, 134,
    246, 0, 148, 130, 53, 218, 96, 33, 176, 194, 60, 30, 239, 207, 187, 94, 112,
    153, 137, 145, 133, 50, 4, 158, 173, 80, 114, 132, 24, 177, 208, 224, 116,
    77, 250, 201, 89, 84, 193, 184, 174, 194, 71, 137, 142, 45, 103,
  ])
);

export const collectedFundsKeypair = Keypair.fromSecretKey(
  new Uint8Array([
    37, 61, 63, 175, 49, 172, 51, 143, 11, 255, 215, 213, 78, 97, 122, 154, 219,
    12, 122, 26, 236, 208, 135, 93, 87, 247, 26, 180, 67, 21, 234, 98, 23, 141,
    199, 162, 76, 135, 179, 115, 60, 119, 4, 175, 185, 133, 248, 208, 133, 140,
    70, 37, 228, 217, 104, 184, 208, 153, 95, 25, 190, 189, 156, 197,
  ])
);

export const mintKeypair = Keypair.fromSecretKey(
  new Uint8Array([
    137, 62, 102, 159, 168, 233, 183, 162, 87, 139, 44, 153, 233, 248, 195, 133,
    223, 23, 167, 185, 221, 162, 249, 145, 129, 116, 98, 118, 235, 219, 103,
    220, 235, 59, 26, 230, 22, 35, 33, 218, 102, 229, 133, 7, 91, 179, 161, 197,
    207, 46, 174, 143, 64, 23, 120, 45, 86, 59, 181, 198, 0, 220, 25, 99,
  ])
);

export const connection = new Connection("http://localhost:8899", "confirmed");

export const provider = new AnchorProvider(
  connection,
  new Wallet(signerKeypair),
  {}
);
setProvider(provider);

export const WSOL_ADDRESS = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

export const USDT_ADDRESS = new PublicKey(
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
);

export const USDT_USD_FEED = new PublicKey(
  "8vAuuqC5wVZ9Z9oQUGGDSjYgudTfjmyqGU5VucQxTk5U"
);

export const CHAINLINK_PROGRAM_ID =
  "HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny";

export const SOL_USD_FEED = new PublicKey(
  "CH31Xns5z3M1cTAbKW34jcxPPciazARpijcHj9rxtemt"
);

export const ETH_USD_FEED = "716hFAECqotxcXcj8Hs8nr7AG6q9dBw2oX3k3M8V7uGq";
export const BNB_USD_FEED = "F6rApkRBD31K6zZrwXt8aQrRKwzbZqCMH2vbMvBgftPX";
export const USDC_USD_FEED = "GzGuoKXE8Unn7Vcg1DtomwD27tL4bVUpSK2M1yk6Xfz5";

export const WSOL_DECIMALS = 9;
export const USDT_DECIMALS = 6;
