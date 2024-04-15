import { Program } from "@coral-xyz/anchor";
import { PRE_SALE_PROGRAM, PROGRAM_IDL } from ".";
import { getProvider } from "./provider";

export const getProgram = () => {
  const provider = getProvider();
  return new Program(PROGRAM_IDL, PRE_SALE_PROGRAM, provider);
};
