import { workspace, Program, BN } from "@coral-xyz/anchor";
import * as borsh from "borsh";

import { PreSaleProgram } from "../target/types/pre_sale_program";
import {
  GetVersionedTransactionConfig,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  BNB_USD_FEED,
  CHAINLINK_PROGRAM_ID,
  SOL_USD_FEED,
  USDC_USD_FEED,
  USDT_ADDRESS,
  USDT_DECIMALS,
  USDT_USD_FEED,
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
  toLamports,
  getReturnLog,
  convertLamports,
} from "./utils";
import {
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import assert from "assert";
chai.use(chaiAsPromised);
const expect = chai.expect;

import { BorshSchema, borshSerialize, borshDeserialize, Unit } from "borsher";
import { deserialize } from "v8";

describe("pre-sale-program", () => {
  let program = workspace.PreSaleProgram as Program<PreSaleProgram>;

  let [programConfigAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  let [tokenVaultAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  );

  before(async () => {
    await airdrop(signerKeypair.publicKey, 5, connection);
    await airdrop(randomKeypair.publicKey, 5, connection);
    await airdrop(collectedFundsKeypair.publicKey, 5, connection);
    await createSplToken(signerKeypair, mintKeypair, 9, connection);
  });

  // it("should return price feed!", async () => {
  //   interface Feed {
  //     decimals: number;
  //     description: string;
  //     value: bigint;
  //   }

  //   const usdt_feed: Feed = await program.methods
  //     .getDataFeed()
  //     .accounts({
  //       chainlinkProgram: CHAINLINK_PROGRAM_ID,
  //       chainlinkFeed: USDT_USD_FEED,
  //     })
  //     .view();

  //   const usdtUsdPrice = convertLamports(usdt_feed.value, usdt_feed.decimals);
  //   // TODO: figure out how to round stable coins
  //   // expect(usdtUsdPrice.eqn(1)).to.be.true;

  //   const usdc_feed: Feed = await program.methods
  //     .getDataFeed()
  //     .accounts({
  //       chainlinkProgram: CHAINLINK_PROGRAM_ID,
  //       chainlinkFeed: USDC_USD_FEED,
  //     })
  //     .view();

  //   const usdcUsdPrice = convertLamports(usdc_feed.value, usdc_feed.decimals);
  //   // TODO: figure out how to round stable coins
  //   // expect(usdcUsdPrice.eqn(1)).to.be.true;
  // });

  it("should be initialized!", async () => {
    await program.methods
      .initializeProgramConfig()
      .accounts({
        signer: signerKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        mint: mintKeypair.publicKey,
        collectedFundsAccount: collectedFundsKeypair.publicKey,
        chainlinkProgram: BNB_USD_FEED,
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
    const program = workspace.PreSaleProgram as Program<PreSaleProgram>;

    const [programConfigAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    const [tokenVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    await expect(
      program.methods
        .initializeProgramConfig()
        .accounts({
          signer: signerKeypair.publicKey,
          programConfig: programConfigAddress,
          vaultAccount: tokenVaultAddress,
          mint: mintKeypair.publicKey,
          collectedFundsAccount: collectedFundsKeypair.publicKey,
          chainlinkProgram: CHAINLINK_PROGRAM_ID,
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
          feeds: [],
          usdPrice: new BN(50),
          usdDecimals: 2,
          collectedFundsAccount: randomKeypair.publicKey,
          chainlinkProgram: CHAINLINK_PROGRAM_ID,
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
        feeds: null,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: null,
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
    expect(JSON.stringify(programConfig.feeds)).to.equal(
      JSON.stringify(updatedProgramConfig.feeds)
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
        feeds: null,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: null,
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
    expect(JSON.stringify(programConfig.feeds)).to.equal(
      JSON.stringify(updatedProgramConfig.feeds)
    );
    expect(programConfig.hasPresaleEnded).to.equal(
      updatedProgramConfig.hasPresaleEnded
    );
  });

  it("should only update feeds value", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const usdtFeed = {
      asset: USDT_ADDRESS,
      dataFeed: USDT_USD_FEED,
    };

    const solFeed = {
      asset: WSOL_ADDRESS,
      dataFeed: SOL_USD_FEED,
    };

    const feeds = [usdtFeed, solFeed];

    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: null,
        feeds,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: null,
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
    expect(JSON.stringify(programConfig.feeds)).to.not.equal(
      JSON.stringify(updatedProgramConfig.feeds)
    );
    expect(JSON.stringify(feeds)).to.equal(
      JSON.stringify(updatedProgramConfig.feeds)
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
        feeds: null,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: randomKeypair.publicKey,
        chainlinkProgram: null,
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

    expect(JSON.stringify(programConfig.feeds)).to.equal(
      JSON.stringify(updatedProgramConfig.feeds)
    );
    expect(programConfig.hasPresaleEnded).to.equal(
      updatedProgramConfig.hasPresaleEnded
    );
    expect(updatedProgramConfig.collectedFundsAccount.toString()).to.equal(
      randomKeypair.publicKey.toString()
    );
  });

  it("should only update Chainlink value", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: null,
        feeds: null,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: CHAINLINK_PROGRAM_ID,
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

    expect(programConfig.usdPrice.eq(updatedProgramConfig.usdPrice)).to.be.true;
    expect(programConfig.usdDecimals).to.equal(
      updatedProgramConfig.usdDecimals
    );

    expect(JSON.stringify(programConfig.feeds)).to.equal(
      JSON.stringify(updatedProgramConfig.feeds)
    );
    expect(programConfig.hasPresaleEnded).to.equal(
      updatedProgramConfig.hasPresaleEnded
    );
    expect(programConfig.collectedFundsAccount.toString()).to.equal(
      updatedProgramConfig.collectedFundsAccount.toString()
    );

    expect(programConfig.chainlinkProgram.toString()).to.not.equal(
      updatedProgramConfig.chainlinkProgram.toString()
    );

    expect(updatedProgramConfig.chainlinkProgram.toString()).to.equal(
      CHAINLINK_PROGRAM_ID.toString()
    );
  });

  it("should only update price value", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const usdPrice = 0.5;
    const usdDecimals = 2;

    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: null,
        feeds: null,
        usdPrice: new BN(usdPrice * 10 ** usdDecimals),
        usdDecimals,
        collectedFundsAccount: null,
        chainlinkProgram: CHAINLINK_PROGRAM_ID,
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

    expect(JSON.stringify(programConfig.feeds)).to.equal(
      JSON.stringify(updatedProgramConfig.feeds)
    );
    expect(programConfig.hasPresaleEnded).to.equal(
      updatedProgramConfig.hasPresaleEnded
    );
    expect(programConfig.collectedFundsAccount.toString()).to.equal(
      updatedProgramConfig.collectedFundsAccount.toString()
    );

    expect(programConfig.usdPrice.toString()).to.not.equal(
      updatedProgramConfig.usdPrice.toString()
    );

    expect(programConfig.usdDecimals).to.not.equal(
      updatedProgramConfig.usdDecimals
    );

    expect(updatedProgramConfig.usdDecimals).to.equal(usdDecimals);
    expect(updatedProgramConfig.usdPrice.toNumber()).to.equal(
      usdPrice * 10 ** usdDecimals
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
      calculateConfigSize(programConfig.feeds.length)
    );

    const usdtFeed = {
      asset: USDT_ADDRESS,
      dataFeed: USDT_USD_FEED,
    };

    const solFeed = {
      asset: WSOL_ADDRESS,
      dataFeed: SOL_USD_FEED,
    };

    const feeds = [usdtFeed, solFeed, solFeed, solFeed, solFeed];

    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: null,
        feeds,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: null,
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
      calculateConfigSize(feeds.length)
    );

    // Passing null for prices to check that there was no realloc at all and all the old data stood the same
    await program.methods
      .updateProgramConfig({
        hasPresaleEnded: null,
        admin: null,
        feeds,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: null,
      })
      .accounts({
        admin: randomKeypair.publicKey,
        programConfig: programConfigAddress,
      })
      .signers([randomKeypair])
      .rpc();

    const updatedProgramConfigAfterNullPrices =
      await program.account.programConfig.fetch(programConfigAddress);

    expect(JSON.stringify(updatedProgramConfigAfterNullPrices.feeds)).to.equal(
      JSON.stringify(feeds)
    );

    expect(await fetchConfigSize(updatedProgramConfigAfterNullPrices)).to.equal(
      calculateConfigSize(feeds.length)
    );
  });

  it("should fail when a wrong collector ATA provided", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wsolAtaForPayment = await createAssociatedTokenAccount(
      connection,
      signerKeypair,
      WSOL_ADDRESS,
      signerKeypair.publicKey
    );

    const wrongAtaAuthority = collectedFundsKeypair;

    const wrongWsolAtaForCollecting = await createAssociatedTokenAccount(
      connection,
      wrongAtaAuthority,
      WSOL_ADDRESS,
      wrongAtaAuthority.publicKey
    );

    await expect(
      program.methods
        .buyTokens({ payerMintAmount: new BN(0) })
        .accounts({
          signer: randomKeypair.publicKey,
          programConfig: programConfigAddress,
          vaultAccount: tokenVaultAddress,
          vaultMint: mintKeypair.publicKey,
          userVaultAccount: userVaultAddress,
          payerTokenAccount: wsolAtaForPayment,
          collectedFundsAccount: wrongWsolAtaForCollecting,
          payerMint: WSOL_ADDRESS,
          chainlinkFeed: WSOL_ADDRESS,
          chainlinkProgram: CHAINLINK_PROGRAM_ID,
        })
        .signers([randomKeypair])
        .rpc()
    ).to.be
      .rejectedWith(`AnchorError caused by account: collected_funds_account. Error Code: ConstraintTokenOwner. Error Number: 2015. Error Message: A token owner constraint was violated.
Program log: Left:
Program log: ${wrongAtaAuthority.publicKey}
Program log: Right:
Program log: ${programConfig.collectedFundsAccount}`);
  });

  it("should fail when mint doesnt exist in feeds", async () => {
    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wrong_mint_address = mintKeypair.publicKey;

    const ataForPayment = await createAssociatedTokenAccount(
      connection,
      signerKeypair,
      wrong_mint_address,
      signerKeypair.publicKey
    );

    const ataForCollecting = await createAssociatedTokenAccount(
      connection,
      randomKeypair,
      wrong_mint_address,
      randomKeypair.publicKey
    );

    await expect(
      program.methods
        .buyTokens({ payerMintAmount: new BN(0) })
        .accounts({
          signer: randomKeypair.publicKey,
          programConfig: programConfigAddress,
          vaultAccount: tokenVaultAddress,
          vaultMint: mintKeypair.publicKey,
          userVaultAccount: userVaultAddress,
          payerTokenAccount: ataForPayment,
          collectedFundsAccount: ataForCollecting,
          payerMint: WSOL_ADDRESS,
          chainlinkFeed: WSOL_ADDRESS,
          chainlinkProgram: CHAINLINK_PROGRAM_ID,
        })
        .signers([randomKeypair])
        .rpc()
    ).to.be.rejectedWith(
      `AnchorError caused by account: payer_token_account. Error Code: InvalidPayerTokenAccount. Error Number: 6001. Error Message: Invalid payer token account.`
    );
  });

  it("should fail when collector mint doesnt match payment mint", async () => {
    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wrong_mint_address = mintKeypair.publicKey;

    const wsolAtaForPayment = await getAssociatedTokenAddress(
      WSOL_ADDRESS,
      signerKeypair.publicKey
    );

    const expectedAtaForCollecting = await getAssociatedTokenAddress(
      WSOL_ADDRESS,
      randomKeypair.publicKey
    );

    const wrongAtaForCollecting = await getAssociatedTokenAddress(
      wrong_mint_address,
      randomKeypair.publicKey
    );

    await expect(
      program.methods
        .buyTokens({ payerMintAmount: new BN(0) })
        .accounts({
          signer: randomKeypair.publicKey,
          programConfig: programConfigAddress,
          vaultAccount: tokenVaultAddress,
          vaultMint: mintKeypair.publicKey,
          userVaultAccount: userVaultAddress,
          payerTokenAccount: wsolAtaForPayment,
          collectedFundsAccount: wrongAtaForCollecting,
          payerMint: WSOL_ADDRESS,
          chainlinkFeed: WSOL_ADDRESS,
          chainlinkProgram: CHAINLINK_PROGRAM_ID,
        })
        .signers([randomKeypair])
        .rpc()
    ).to.be
      .rejectedWith(`AnchorError caused by account: collected_funds_account. Error Code: ConstraintAssociated. Error Number: 2009. Error Message: An associated constraint was violated.
Program log: Left:
Program log: ${wrongAtaForCollecting}
Program log: Right:
Program log: ${expectedAtaForCollecting}`);
  });

  it("should fail when vault mint is invalid", async () => {
    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wsolAtaForPayment = await getAssociatedTokenAddress(
      WSOL_ADDRESS,
      signerKeypair.publicKey
    );

    const ataForCollecting = await createAssociatedTokenAccount(
      connection,
      randomKeypair,
      WSOL_ADDRESS,
      randomKeypair.publicKey
    );

    const wrongVaultMint = WSOL_ADDRESS;

    await expect(
      program.methods
        .buyTokens({ payerMintAmount: new BN(0) })
        .accounts({
          signer: randomKeypair.publicKey,
          programConfig: programConfigAddress,
          vaultAccount: tokenVaultAddress,
          vaultMint: wrongVaultMint,
          userVaultAccount: userVaultAddress,
          payerTokenAccount: wsolAtaForPayment,
          collectedFundsAccount: ataForCollecting,
          payerMint: WSOL_ADDRESS,
          chainlinkFeed: WSOL_ADDRESS,
          chainlinkProgram: CHAINLINK_PROGRAM_ID,
        })
        .signers([randomKeypair])
        .rpc()
    ).to.be.rejectedWith(
      `AnchorError caused by account: vault_mint. Error Code: InvalidVaultMint. Error Number: 6000. Error Message: Vault mint is invalid.`
    );
  });

  it("should fail if amount is less or equals 0", async () => {
    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wsolAtaForPayment = await getAssociatedTokenAddress(
      WSOL_ADDRESS,
      signerKeypair.publicKey
    );

    const wsolAtaForCollecting = await getAssociatedTokenAddress(
      WSOL_ADDRESS,
      randomKeypair.publicKey
    );

    await expect(
      program.methods
        .buyTokens({ payerMintAmount: new BN(0) })
        .accounts({
          signer: randomKeypair.publicKey,
          programConfig: programConfigAddress,
          vaultAccount: tokenVaultAddress,
          vaultMint: mintKeypair.publicKey,
          userVaultAccount: userVaultAddress,
          payerTokenAccount: wsolAtaForPayment,
          collectedFundsAccount: wsolAtaForCollecting,
          payerMint: WSOL_ADDRESS,
          chainlinkFeed: SOL_USD_FEED,
          chainlinkProgram: CHAINLINK_PROGRAM_ID,
        })
        .signers([randomKeypair])
        .rpc()
    ).to.be.rejectedWith(
      `AnchorError occurred. Error Code: InvalidTokenAmount. Error Number: 6002. Error Message: Token amount should be greater than 0.`
    );
  });

  it("should buy tokens", async () => {
    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const ataForCollecting = await createAssociatedTokenAccount(
      connection,
      randomKeypair,
      USDT_ADDRESS,
      randomKeypair.publicKey
    );

    const ataForPayment = await createAssociatedTokenAccount(
      connection,
      randomKeypair,
      USDT_ADDRESS,
      signerKeypair.publicKey
    );

    // await expect(
    await program.methods
      .buyTokens({ payerMintAmount: new BN(1_000_000_000) })
      .accounts({
        signer: randomKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: ataForPayment,
        collectedFundsAccount: ataForCollecting,
        payerMint: USDT_ADDRESS,
        chainlinkProgram: CHAINLINK_PROGRAM_ID,
        chainlinkFeed: USDT_USD_FEED,
      })
      .signers([randomKeypair])
      .rpc();
    // ).to.be.rejectedWith(
    //   `AnchorError occurred. Error Code: InvalidTokenAmount. Error Number: 6001. Error Message: Token amount should be greater than 0`
    // );
  });

  it("should buy tokens", async () => {
    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wsolAtaForPayment = await getAssociatedTokenAddress(
      WSOL_ADDRESS,
      signerKeypair.publicKey
    );

    const wsolAtaForCollecting = await getAssociatedTokenAddress(
      WSOL_ADDRESS,
      randomKeypair.publicKey
    );

    await program.methods
      .buyTokens({ payerMintAmount: new BN(1 * 10 ** (9 - 1)) })
      .accounts({
        signer: randomKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: wsolAtaForPayment,
        collectedFundsAccount: wsolAtaForCollecting,
        chainlinkProgram: CHAINLINK_PROGRAM_ID,
        payerMint: WSOL_ADDRESS,
        chainlinkFeed: SOL_USD_FEED,
      })
      .signers([randomKeypair])
      .rpc();
  });

  it("should return vault token amount available for payer tokens", async () => {
    const amount = await program.methods
      .getTokenAmount({ payerMintAmount: new BN(1 * 10 ** (9 - 1)) })
      .accounts({
        programConfig: programConfigAddress,
        vaultMint: mintKeypair.publicKey,
        chainlinkProgram: CHAINLINK_PROGRAM_ID,
        payerMint: WSOL_ADDRESS,
        chainlinkFeed: SOL_USD_FEED,
      })
      .view();

    console.log(amount.toNumber() / 10 ** WSOL_DECIMALS);
  });
});
