import { Program } from "@coral-xyz/anchor";
import { PROGRAM_ID, PROGRAM_IDL } from ".";
import { getProvider } from "./provider";

export const getProgram = () => {
  const provider = getProvider();
  return new Program(PROGRAM_IDL, PROGRAM_ID, provider);
};
