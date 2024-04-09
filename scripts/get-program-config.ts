import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../config";

async function getProgramConfig() {
  const program = getProgram();

  const [programConfigAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const programConfig = await program.account.programConfig.fetch(
    programConfigAddress
  );

  console.log(programConfig);
}

getProgramConfig().then();
