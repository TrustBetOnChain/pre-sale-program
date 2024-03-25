import * as anchor from "@coral-xyz/anchor";
import { PreSaleProgram } from "../target/types/pre_sale_program";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionConfirmationStrategy,
} from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

const signerKeypair = Keypair.fromSecretKey(
  new Uint8Array([
    104, 111, 227, 68, 80, 198, 10, 155, 242, 12, 3, 96, 88, 98, 2, 227, 159, 8,
    187, 108, 44, 203, 127, 216, 107, 30, 74, 88, 213, 67, 221, 141, 148, 233,
    238, 76, 204, 72, 175, 20, 55, 185, 155, 29, 149, 76, 138, 216, 229, 16,
    200, 139, 34, 82, 69, 61, 141, 173, 111, 153, 170, 159, 45, 230,
  ])
);

const randomKeypair = Keypair.fromSecretKey(
  new Uint8Array([
    78, 49, 163, 146, 231, 4, 222, 156, 189, 164, 83, 245, 24, 3, 81, 161, 134,
    246, 0, 148, 130, 53, 218, 96, 33, 176, 194, 60, 30, 239, 207, 187, 94, 112,
    153, 137, 145, 133, 50, 4, 158, 173, 80, 114, 132, 24, 177, 208, 224, 116,
    77, 250, 201, 89, 84, 193, 184, 174, 194, 71, 137, 142, 45, 103,
  ])
);

const collectedFundsKeypair = Keypair.fromSecretKey(
  new Uint8Array([
    37, 61, 63, 175, 49, 172, 51, 143, 11, 255, 215, 213, 78, 97, 122, 154, 219,
    12, 122, 26, 236, 208, 135, 93, 87, 247, 26, 180, 67, 21, 234, 98, 23, 141,
    199, 162, 76, 135, 179, 115, 60, 119, 4, 175, 185, 133, 248, 208, 133, 140,
    70, 37, 228, 217, 104, 184, 208, 153, 95, 25, 190, 189, 156, 197,
  ])
);

const mintKeypair = Keypair.fromSecretKey(
  new Uint8Array([
    137, 62, 102, 159, 168, 233, 183, 162, 87, 139, 44, 153, 233, 248, 195, 133,
    223, 23, 167, 185, 221, 162, 249, 145, 129, 116, 98, 118, 235, 219, 103,
    220, 235, 59, 26, 230, 22, 35, 33, 218, 102, 229, 133, 7, 91, 179, 161, 197,
    207, 46, 174, 143, 64, 23, 120, 45, 86, 59, 181, 198, 0, 220, 25, 99,
  ])
);

describe("pre-sale-program", () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(signerKeypair),
    {}
  );
  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  const DECIMALS = 9;

  const program = anchor.workspace
    .PreSaleProgram as anchor.Program<PreSaleProgram>;

  const [programConfigAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const [tokenVaultAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_vault")],
    program.programId
  );

  async function airdrop(pubkey: PublicKey, amount: number) {
    const airdropSignature = await connection.requestAirdrop(
      pubkey,
      amount * anchor.web3.LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(
      {
        signature: airdropSignature,
      } as TransactionConfirmationStrategy,
      "confirmed"
    );
  }

  async function createSplToken() {
    await createMint(
      connection,
      signerKeypair,
      signerKeypair.publicKey,
      signerKeypair.publicKey,
      DECIMALS,
      mintKeypair
    );
  }

  function calculateConfigSize(mintsLength: number) {
    const PUB_KEY_SIZE = 32;
    const BOOL_SIZE = 1;
    const DISCRIMINATOR_SIZE = 8;
    const VECTOR_SIZE = 4;
    const PRICE_SIZE = 8;

    const MINT_SIZE = PRICE_SIZE + PUB_KEY_SIZE;
    const BASE_CONFIG_SIZE =
      DISCRIMINATOR_SIZE + PUB_KEY_SIZE + PUB_KEY_SIZE + BOOL_SIZE;

    return BASE_CONFIG_SIZE + VECTOR_SIZE + MINT_SIZE * mintsLength;
  }

  before(async () => {
    await airdrop(signerKeypair.publicKey, 5);
    await airdrop(randomKeypair.publicKey, 5);
    await airdrop(collectedFundsKeypair.publicKey, 5);
    await createSplToken();
  });

  it("should be initialized!", async () => {
    await program.methods
      .initializeProgramConfig()
      .accounts({
        signer: signerKeypair.publicKey,
        programConfig: programConfigAddress,
        tokenVaultAccount: tokenVaultAddress,
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
          tokenVaultAccount: tokenVaultAddress,
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

    const mintPrice = {
      pubkey: randomKeypair.publicKey,
      price: new anchor.BN(1_000_000_000),
    };

    const prices = [mintPrice];

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
      pubkey: randomKeypair.publicKey,
      price: new anchor.BN(1_000_000_000),
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
});
