import * as anchor from "@coral-xyz/anchor";
import { PreSaleProgram } from "../target/types/pre_sale_program";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
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
    [Buffer.from("program_config")],
    program.programId
  );

  async function airdrop(pubkey: PublicKey) {
    const airdropSignature = await connection.requestAirdrop(
      pubkey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(airdropSignature);
  }

  before(async () => {
    await airdrop(signerKeypair.publicKey);
    await airdrop(randomKeypair.publicKey);
  });

  it("should be initialized!", async () => {
    await program.methods
      .initializeProgramConfig()
      .accounts({
        authority: signerKeypair.publicKey,
        programConfig: programConfigAddress,
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
          authority: signerKeypair.publicKey,
          programConfig: programConfigAddress,
        })
        .signers([signerKeypair])
        .rpc()
    ).to.be.rejectedWith();
  });

  it("should throw an error if not admin tries to update config", async () => {
    await expect(
      program.methods
        .updateProgramConfig({
          hasPresaleEnded: true,
          admin: randomKeypair.publicKey,
          mints: [],
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
        mints: null,
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
    expect(JSON.stringify(programConfig.mints)).to.equal(
      JSON.stringify(updatedProgramConfig.mints)
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
        mints: null,
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
    expect(JSON.stringify(programConfig.mints)).to.equal(
      JSON.stringify(updatedProgramConfig.mints)
    );
    expect(programConfig.hasPresaleEnded).to.equal(
      updatedProgramConfig.hasPresaleEnded
    );
  });

  it("should only update mints value", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const mint = {
      pubkey: randomKeypair.publicKey,
      price: new anchor.BN(1_000_000_000),
    };

    const mints = [mint];

    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: null,
        mints,
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
    expect(JSON.stringify(programConfig.mints)).to.not.equal(
      JSON.stringify(updatedProgramConfig.mints)
    );
    expect(JSON.stringify(mints)).to.equal(
      JSON.stringify(updatedProgramConfig.mints)
    );
  });
});
