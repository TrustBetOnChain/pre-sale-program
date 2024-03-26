import { workspace, Program, BN } from "@coral-xyz/anchor";
import { PreSaleProgram } from "../target/types/pre_sale_program";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  USDT_ADDRESS,
  USDT_DECIMALS,
  WSOL_ADDRESS,
  WSOL_DECIMALS,
  collectedFundsKeypair,
  connection,
  mintKeypair,
  randomKeypair,
  signerKeypair,
} from "./config";
import {
  airdrop,
  createSplToken,
  calculateConfigSize,
  convertToLamports,
} from "./utils";
chai.use(chaiAsPromised);
const expect = chai.expect;

describe("pre-sale-program", () => {
  const program = workspace.PreSaleProgram as Program<PreSaleProgram>;

  const [programConfigAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const [tokenVaultAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  );

  before(async () => {
    await airdrop(signerKeypair.publicKey, 5, connection);
    await airdrop(randomKeypair.publicKey, 5, connection);
    await airdrop(collectedFundsKeypair.publicKey, 5, connection);
    await createSplToken(signerKeypair, mintKeypair, 9, connection);
  });

  it("should be initialized!", async () => {
    await program.methods
      .initializeProgramConfig()
      .accounts({
        signer: signerKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        mint: mintKeypair.publicKey,
        collectedFundsAccount: collectedFundsKeypair.publicKey,
      })
      .signers([signerKeypair])
      .rpc();
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );
    expect(programConfig.admin.toString()).to.equal(
      signerKeypair.publicKey.toString()
    );
  });

  it("should be initialized only once!", async () => {
    await expect(
      program.methods
        .initializeProgramConfig()
        .accounts({
          signer: signerKeypair.publicKey,
          programConfig: programConfigAddress,
          vaultAccount: tokenVaultAddress,
          mint: mintKeypair.publicKey,
          collectedFundsAccount: collectedFundsKeypair.publicKey,
        })
        .signers([signerKeypair])
        .rpc()
    ).to.be.rejectedWith(
      "failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x0"
    );
  });

  it("should throw an error if not admin tries to update config", async () => {
    await expect(
      program.methods
        .updateProgramConfig({
          hasPresaleEnded: true,
          admin: randomKeypair.publicKey,
          prices: [],
          collectedFundsAccount: randomKeypair.publicKey,
        })
        .accounts({
          programConfig: programConfigAddress,
        })
        .signers([randomKeypair])
        .rpc()
    ).to.be.rejectedWith(
      `unknown signer: ${randomKeypair.publicKey.toString()}`
    );
  });

  it("should only update hasPresaleEnded value", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: true,
        admin: null,
        prices: null,
        collectedFundsAccount: null,
      })
      .accounts({
        programConfig: programConfigAddress,
      })
      .signers([signerKeypair])
      .rpc();

    const updatedProgramConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    expect(programConfig.admin.toString()).to.equal(
      updatedProgramConfig.admin.toString()
    );
    expect(JSON.stringify(programConfig.prices)).to.equal(
      JSON.stringify(updatedProgramConfig.prices)
    );
    expect(programConfig.hasPresaleEnded).to.not.equal(
      updatedProgramConfig.hasPresaleEnded
    );
  });

  it("should only update admin value", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: randomKeypair.publicKey,
        prices: null,
        collectedFundsAccount: null,
      })
      .accounts({
        programConfig: programConfigAddress,
      })
      .signers([signerKeypair])
      .rpc();

    const updatedProgramConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    expect(programConfig.admin.toString()).to.not.equal(
      updatedProgramConfig.admin.toString()
    );
    expect(JSON.stringify(programConfig.prices)).to.equal(
      JSON.stringify(updatedProgramConfig.prices)
    );
    expect(programConfig.hasPresaleEnded).to.equal(
      updatedProgramConfig.hasPresaleEnded
    );
  });

  it("should only update mints value", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const solPrice = {
      mint: WSOL_ADDRESS,
      price: convertToLamports(0.5, WSOL_DECIMALS),
    };

    const usdtPrice = {
      mint: USDT_ADDRESS,
      price: convertToLamports(50, USDT_DECIMALS),
    };

    const prices = [solPrice, usdtPrice];

    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: null,
        prices,
        collectedFundsAccount: null,
      })
      .accounts({
        admin: randomKeypair.publicKey,
        programConfig: programConfigAddress,
      })
      .signers([randomKeypair])
      .rpc();

    const updatedProgramConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    expect(programConfig.admin.toString()).to.equal(
      updatedProgramConfig.admin.toString()
    );
    expect(programConfig.hasPresaleEnded).to.equal(
      updatedProgramConfig.hasPresaleEnded
    );
    expect(JSON.stringify(programConfig.prices)).to.not.equal(
      JSON.stringify(updatedProgramConfig.prices)
    );
    expect(JSON.stringify(prices)).to.equal(
      JSON.stringify(updatedProgramConfig.prices)
    );
  });

  it("should only update collectedFundsAccount value", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    expect(programConfig.collectedFundsAccount.toString()).to.equal(
      collectedFundsKeypair.publicKey.toString()
    );

    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: null,
        prices: null,
        collectedFundsAccount: randomKeypair.publicKey,
      })
      .accounts({
        admin: randomKeypair.publicKey,
        programConfig: programConfigAddress,
      })
      .signers([randomKeypair])
      .rpc();

    const updatedProgramConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    expect(programConfig.admin.toString()).to.equal(
      updatedProgramConfig.admin.toString()
    );

    expect(JSON.stringify(programConfig.prices)).to.equal(
      JSON.stringify(updatedProgramConfig.prices)
    );
    expect(programConfig.hasPresaleEnded).to.equal(
      updatedProgramConfig.hasPresaleEnded
    );
    expect(updatedProgramConfig.collectedFundsAccount.toString()).to.equal(
      randomKeypair.publicKey.toString()
    );
  });

  it("should allocate and reallocate right size", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    async function fetchConfigSize(account: any) {
      return (await program.coder.accounts.encode("ProgramConfig", account))
        .length;
    }

    expect(await fetchConfigSize(programConfig)).to.equal(
      calculateConfigSize(programConfig.prices.length)
    );

    const mintPrice = {
      mint: randomKeypair.publicKey,
      price: new BN(1_000_000_000),
    };

    const prices = [mintPrice, mintPrice, mintPrice, mintPrice, mintPrice];

    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: null,
        prices,
        collectedFundsAccount: null,
      })
      .accounts({
        admin: randomKeypair.publicKey,
        programConfig: programConfigAddress,
      })
      .signers([randomKeypair])
      .rpc();

    const updatedProgramConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    expect(await fetchConfigSize(updatedProgramConfig)).to.equal(
      calculateConfigSize(prices.length)
    );

    // Passing null for prices to check that there was no realloc at all and all the old data stood the same
    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: null,
        prices: null,
        collectedFundsAccount: null,
      })
      .accounts({
        admin: randomKeypair.publicKey,
        programConfig: programConfigAddress,
      })
      .signers([randomKeypair])
      .rpc();

    const updatedProgramConfigAfterNullPrices =
      await program.account.programConfig.fetch(programConfigAddress);

    expect(JSON.stringify(updatedProgramConfigAfterNullPrices.prices)).to.equal(
      JSON.stringify(prices)
    );

    expect(await fetchConfigSize(updatedProgramConfigAfterNullPrices)).to.equal(
      calculateConfigSize(prices.length)
    );
  });

  it("should buy tokens", async () => {
    await program.methods
      .buyTokens({ amount: new BN(0) })
      .accounts({
        signer: randomKeypair.publicKey,
      })
      .signers([randomKeypair])
      .rpc();
  });
});
