import { workspace, Program, BN, LangErrorCode } from "@coral-xyz/anchor";

import { IDL, PreSaleProgram } from "../target/types/pre_sale_program";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  mockCollectedFundsKeypair,
  mockMintKeypair,
  mockRandomKeypair,
  mockSignerKeypair,
} from "./mocks";
import {
  airdrop,
  createSplToken,
  calculateConfigSize,
  convertLamports,
} from "../utils";

import {
  initializeProgramConfigInstuction,
  updateProgramConfigInstruction,
} from "../scripts/instructions";

import { simulateTransaction } from "@coral-xyz/anchor/dist/cjs/utils/rpc";
import {
  CHAINLINK_OFFCHAIN_PROGRAM,
  CHAINLINK_PROGRAM,
  chainlink_price_feed,
  getConnection,
  tokens,
} from "../config";
import { getPriceFeed, getPriceFeeds } from "../config/price-feed";

chai.use(chaiAsPromised);
const expect = chai.expect;

const connection = getConnection();

describe("pre-sale-program", () => {
  const mintDecimals = 9;

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
    await airdrop(mockSignerKeypair.publicKey, 5, connection);
    await airdrop(mockRandomKeypair.publicKey, 5, connection);
    await airdrop(mockCollectedFundsKeypair.publicKey, 5, connection);
    await createSplToken(
      mockSignerKeypair,
      mockMintKeypair,
      mintDecimals,
      connection
    );
  });

  it("should return price feed!", async () => {
    interface Feed {
      decimals: number;
      description: string;
      value: bigint;
    }

    const sol_feed: Feed = await program.methods
      .getDataFeed()
      .accounts({
        chainlinkProgram: CHAINLINK_PROGRAM,
        chainlinkFeed: chainlink_price_feed["mainnet-beta"].USDT_USD,
      })
      .view();

    const usdtUsdPrice = convertLamports(sol_feed.value, sol_feed.decimals);
    // TODO: figure out how to round stable coins
    // expect(usdtUsdPrice.eqn(1)).to.be.true;

    const usdc_feed: Feed = await program.methods
      .getDataFeed()
      .accounts({
        chainlinkProgram: CHAINLINK_PROGRAM,
        chainlinkFeed: chainlink_price_feed["mainnet-beta"].USDC_USD,
      })
      .view();

    const usdcUsdPrice = convertLamports(usdc_feed.value, usdc_feed.decimals);
    // TODO: figure out how to round stable coins
    // expect(usdcUsdPrice.eqn(1)).to.be.true;
  });

  it("should be initialized!", async () => {
    const initializeProgramConfigInstruction =
      await initializeProgramConfigInstuction({
        accounts: {
          signer: mockSignerKeypair.publicKey,
          programConfig: programConfigAddress,
          vaultAccount: tokenVaultAddress,
          mint: mockMintKeypair.publicKey,
          collectedFundsAccount: mockCollectedFundsKeypair.publicKey,
          chainlinkProgram: CHAINLINK_OFFCHAIN_PROGRAM,
        },
        program,
      });
    const tx = new Transaction();

    tx.add(initializeProgramConfigInstruction);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    await sendAndConfirmTransaction(connection, tx, [mockSignerKeypair]);

    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    expect(programConfig.admin.toString()).to.equal(
      mockSignerKeypair.publicKey.toString()
    );
    expect(programConfig.chainlinkProgram.toString()).to.equal(
      CHAINLINK_OFFCHAIN_PROGRAM.toString()
    );
    expect(programConfig.collectedFundsAccount.toString()).to.equal(
      mockCollectedFundsKeypair.publicKey.toString()
    );
    expect(programConfig.hasPresaleEnded).to.equal(false);
  });

  it("should be initialized only once!", async () => {
    const initializeProgramConfigInstruction =
      await initializeProgramConfigInstuction({
        accounts: {
          signer: mockSignerKeypair.publicKey,
          programConfig: programConfigAddress,
          vaultAccount: tokenVaultAddress,
          mint: mockMintKeypair.publicKey,
          collectedFundsAccount: mockCollectedFundsKeypair.publicKey,
          chainlinkProgram: CHAINLINK_PROGRAM,
        },
        program,
      });

    const tx = new Transaction();

    tx.add(initializeProgramConfigInstruction);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const simulatedResponse = await simulateTransaction(connection, tx, [
      mockSignerKeypair,
    ]);

    const expectedError = { InstructionError: [0, { Custom: 0 }] };

    expect(JSON.stringify(simulatedResponse.value.err)).to.equal(
      JSON.stringify(expectedError)
    );
  });

  it("should throw an error if not admin tries to update config", async () => {
    const instruction = await updateProgramConfigInstruction({
      accounts: {
        programConfig: programConfigAddress,
        admin: mockRandomKeypair.publicKey,
      },
      args: {
        hasPresaleEnded: true,
        admin: mockRandomKeypair.publicKey,
        feeds: [],
        usdPrice: new BN(50),
        usdDecimals: 2,
        collectedFundsAccount: mockRandomKeypair.publicKey,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    try {
      await sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]);
    } catch (error) {
      const containConstraintError = error.logs.some((log) =>
        log.includes(
          `custom program error: 0x${LangErrorCode.ConstraintAddress.toString(
            16
          )}`
        )
      );
      expect(containConstraintError).to.be.true;
    }
  });

  it("should only update hasPresaleEnded value", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const instruction = await updateProgramConfigInstruction({
      accounts: {
        programConfig: programConfigAddress,
        admin: mockSignerKeypair.publicKey,
      },
      args: {
        hasPresaleEnded: true,
        admin: null,
        feeds: null,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: null,
      },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await sendAndConfirmTransaction(connection, tx, [mockSignerKeypair]);

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

    const instruction = await updateProgramConfigInstruction({
      accounts: {
        programConfig: programConfigAddress,
        admin: mockSignerKeypair.publicKey,
      },
      args: {
        hasPresaleEnded: null,
        admin: mockRandomKeypair.publicKey,
        feeds: null,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: null,
      },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await sendAndConfirmTransaction(connection, tx, [mockSignerKeypair]);

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

    const feeds = Object.values(getPriceFeeds("mainnet-beta"));

    const instruction = await updateProgramConfigInstruction({
      accounts: {
        programConfig: programConfigAddress,
        admin: mockRandomKeypair.publicKey,
      },
      args: {
        hasPresaleEnded: null,
        admin: null,
        feeds,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: null,
      },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]);

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
      mockCollectedFundsKeypair.publicKey.toString()
    );

    const instruction = await updateProgramConfigInstruction({
      accounts: {
        admin: mockRandomKeypair.publicKey,
        programConfig: programConfigAddress,
      },
      args: {
        hasPresaleEnded: null,
        admin: null,
        feeds: null,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: mockRandomKeypair.publicKey,
        chainlinkProgram: null,
      },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]);

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
      mockRandomKeypair.publicKey.toString()
    );
  });

  it("should only update Chainlink value", async () => {
    // return;

    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const instruction = await updateProgramConfigInstruction({
      accounts: {
        admin: mockRandomKeypair.publicKey,
        programConfig: programConfigAddress,
      },
      args: {
        hasPresaleEnded: null,
        admin: null,
        feeds: null,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]);

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
      CHAINLINK_PROGRAM.toString()
    );
  });

  it("should only update price value", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const usdPrice = 0.1;
    const usdDecimals = 2;

    const instruction = await updateProgramConfigInstruction({
      accounts: {
        admin: mockRandomKeypair.publicKey,
        programConfig: programConfigAddress,
      },
      args: {
        hasPresaleEnded: null,
        admin: null,
        feeds: null,
        usdPrice: new BN(usdPrice * 10 ** usdDecimals),
        usdDecimals,
        collectedFundsAccount: null,
        chainlinkProgram: null,
      },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]);

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

    const feeds = [
      getPriceFeed("USDT", "mainnet-beta"),
      getPriceFeed("SOL", "mainnet-beta"),
      getPriceFeed("SOL", "mainnet-beta"),
      getPriceFeed("SOL", "mainnet-beta"),
      getPriceFeed("SOL", "mainnet-beta"),
    ];

    const instruction = await updateProgramConfigInstruction({
      accounts: {
        admin: mockRandomKeypair.publicKey,
        programConfig: programConfigAddress,
      },
      args: {
        hasPresaleEnded: null,
        admin: null,
        feeds,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: null,
      },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]);

    const updatedProgramConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    expect(await fetchConfigSize(updatedProgramConfig)).to.equal(
      calculateConfigSize(feeds.length)
    );

    // Passing null for prices to check that there was no realloc at all and all the old data stood the same
    const instruction2 = await updateProgramConfigInstruction({
      accounts: {
        admin: mockRandomKeypair.publicKey,
        programConfig: programConfigAddress,
      },
      args: {
        hasPresaleEnded: null,
        admin: null,
        feeds: null,
        usdPrice: null,
        usdDecimals: null,
        collectedFundsAccount: null,
        chainlinkProgram: null,
      },
      program,
    });

    const tx2 = new Transaction();
    tx2.add(instruction2);

    await sendAndConfirmTransaction(connection, tx2, [mockRandomKeypair]);

    const updatedProgramConfigAfterNullPrices =
      await program.account.programConfig.fetch(programConfigAddress);

    expect(JSON.stringify(updatedProgramConfigAfterNullPrices.feeds)).to.equal(
      JSON.stringify(feeds)
    );

    expect(await fetchConfigSize(updatedProgramConfigAfterNullPrices)).to.equal(
      calculateConfigSize(feeds.length)
    );
  });

  it("should throw LessThanMinimalValue error", async () => {
    const bigAmount = `${1}`;
    const priceFeed = getPriceFeed("SOL", "mainnet-beta");

    try {
      await program.methods
        .getTokenAmount({ amount: new BN(bigAmount) })
        .accounts({
          programConfig: programConfigAddress,
          vaultMint: mockMintKeypair.publicKey,
          chainlinkProgram: CHAINLINK_PROGRAM,
          payerMint: priceFeed.asset,
          chainlinkFeed: priceFeed.dataFeed,
        })
        .view();
    } catch (e) {
      expect(e.simulationResponse.err.InstructionError[1].Custom).to.equal(
        IDL.errors[7].code
      );
    }
  });

  it("should return price in payer's token required for token amount!", async () => {
    const bigAmount = `${10_000_000 * 10 ** mintDecimals}`;

    const priceFeed = getPriceFeed("SOL", "mainnet-beta");

    const value = await program.methods
      .getTokenAmount({ amount: new BN(bigAmount) })
      .accounts({
        programConfig: programConfigAddress,
        vaultMint: mockMintKeypair.publicKey,
        chainlinkProgram: CHAINLINK_PROGRAM,
        payerMint: priceFeed.asset,
        chainlinkFeed: priceFeed.dataFeed,
      })
      .view();

    // around 5954 with 170 USD per SOL
    console.log(value.toNumber() / LAMPORTS_PER_SOL);
  });

  //   it("should fail when a wrong collector ATA provided", async () => {
  //     const programConfig = await program.account.programConfig.fetch(
  //       programConfigAddress
  //     );

  //     const [userVaultAddress] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
  //       program.programId
  //     );

  //     const wsolAtaForPayment = await createAssociatedTokenAccount(
  //       connection,
  //       signerKeypair,
  //       WSOL_ADDRESS,
  //       signerKeypair.publicKey
  //     );

  //     const wrongAtaAuthority = collectedFundsKeypair;

  //     const wrongWsolAtaForCollecting = await createAssociatedTokenAccount(
  //       connection,
  //       wrongAtaAuthority,
  //       WSOL_ADDRESS,
  //       wrongAtaAuthority.publicKey
  //     );

  //     await expect(
  //       program.methods
  //         .buyTokens({ payerMintAmount: new BN(0) })
  //         .accounts({
  //           signer: randomKeypair.publicKey,
  //           programConfig: programConfigAddress,
  //           vaultAccount: tokenVaultAddress,
  //           vaultMint: mintKeypair.publicKey,
  //           userVaultAccount: userVaultAddress,
  //           payerTokenAccount: wsolAtaForPayment,
  //           collectedFundsAccount: wrongWsolAtaForCollecting,
  //           payerMint: WSOL_ADDRESS,
  //           chainlinkFeed: WSOL_ADDRESS,
  //           chainlinkProgram: CHAINLINK_PROGRAM_ID,
  //         })
  //         .signers([randomKeypair])
  //         .rpc()
  //     ).to.be
  //       .rejectedWith(`AnchorError caused by account: collected_funds_account. Error Code: ConstraintTokenOwner. Error Number: 2015. Error Message: A token owner constraint was violated.
  // Program log: Left:
  // Program log: ${wrongAtaAuthority.publicKey}
  // Program log: Right:
  // Program log: ${programConfig.collectedFundsAccount}`);
  //   });

  //   it("should fail when mint doesnt exist in feeds", async () => {
  //     const [userVaultAddress] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
  //       program.programId
  //     );

  //     const wrong_mint_address = mintKeypair.publicKey;

  //     const ataForPayment = await createAssociatedTokenAccount(
  //       connection,
  //       signerKeypair,
  //       wrong_mint_address,
  //       signerKeypair.publicKey
  //     );

  //     const ataForCollecting = await createAssociatedTokenAccount(
  //       connection,
  //       randomKeypair,
  //       wrong_mint_address,
  //       randomKeypair.publicKey
  //     );

  //     await expect(
  //       program.methods
  //         .buyTokens({ payerMintAmount: new BN(0) })
  //         .accounts({
  //           signer: randomKeypair.publicKey,
  //           programConfig: programConfigAddress,
  //           vaultAccount: tokenVaultAddress,
  //           vaultMint: mintKeypair.publicKey,
  //           userVaultAccount: userVaultAddress,
  //           payerTokenAccount: ataForPayment,
  //           collectedFundsAccount: ataForCollecting,
  //           payerMint: WSOL_ADDRESS,
  //           chainlinkFeed: WSOL_ADDRESS,
  //           chainlinkProgram: CHAINLINK_PROGRAM_ID,
  //         })
  //         .signers([randomKeypair])
  //         .rpc()
  //     ).to.be.rejectedWith(
  //       `AnchorError caused by account: payer_token_account. Error Code: InvalidPayerTokenAccount. Error Number: 6001. Error Message: Invalid payer token account.`
  //     );
  //   });

  //   it("should fail when collector mint doesnt match payment mint", async () => {
  //     const [userVaultAddress] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
  //       program.programId
  //     );

  //     const wrong_mint_address = mintKeypair.publicKey;

  //     const wsolAtaForPayment = await getAssociatedTokenAddress(
  //       WSOL_ADDRESS,
  //       signerKeypair.publicKey
  //     );

  //     const expectedAtaForCollecting = await getAssociatedTokenAddress(
  //       WSOL_ADDRESS,
  //       randomKeypair.publicKey
  //     );

  //     const wrongAtaForCollecting = await getAssociatedTokenAddress(
  //       wrong_mint_address,
  //       randomKeypair.publicKey
  //     );

  //     await expect(
  //       program.methods
  //         .buyTokens({ payerMintAmount: new BN(0) })
  //         .accounts({
  //           signer: randomKeypair.publicKey,
  //           programConfig: programConfigAddress,
  //           vaultAccount: tokenVaultAddress,
  //           vaultMint: mintKeypair.publicKey,
  //           userVaultAccount: userVaultAddress,
  //           payerTokenAccount: wsolAtaForPayment,
  //           collectedFundsAccount: wrongAtaForCollecting,
  //           payerMint: WSOL_ADDRESS,
  //           chainlinkFeed: WSOL_ADDRESS,
  //           chainlinkProgram: CHAINLINK_PROGRAM_ID,
  //         })
  //         .signers([randomKeypair])
  //         .rpc()
  //     ).to.be
  //       .rejectedWith(`AnchorError caused by account: collected_funds_account. Error Code: ConstraintAssociated. Error Number: 2009. Error Message: An associated constraint was violated.
  // Program log: Left:
  // Program log: ${wrongAtaForCollecting}
  // Program log: Right:
  // Program log: ${expectedAtaForCollecting}`);
  //   });

  //   it("should fail when vault mint is invalid", async () => {
  //     const [userVaultAddress] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
  //       program.programId
  //     );

  //     const wsolAtaForPayment = await getAssociatedTokenAddress(
  //       WSOL_ADDRESS,
  //       signerKeypair.publicKey
  //     );

  //     const ataForCollecting = await createAssociatedTokenAccount(
  //       connection,
  //       randomKeypair,
  //       WSOL_ADDRESS,
  //       randomKeypair.publicKey
  //     );

  //     const wrongVaultMint = WSOL_ADDRESS;

  //     await expect(
  //       program.methods
  //         .buyTokens({ payerMintAmount: new BN(0) })
  //         .accounts({
  //           signer: randomKeypair.publicKey,
  //           programConfig: programConfigAddress,
  //           vaultAccount: tokenVaultAddress,
  //           vaultMint: wrongVaultMint,
  //           userVaultAccount: userVaultAddress,
  //           payerTokenAccount: wsolAtaForPayment,
  //           collectedFundsAccount: ataForCollecting,
  //           payerMint: WSOL_ADDRESS,
  //           chainlinkFeed: WSOL_ADDRESS,
  //           chainlinkProgram: CHAINLINK_PROGRAM_ID,
  //         })
  //         .signers([randomKeypair])
  //         .rpc()
  //     ).to.be.rejectedWith(
  //       `AnchorError caused by account: vault_mint. Error Code: InvalidVaultMint. Error Number: 6000. Error Message: Vault mint is invalid.`
  //     );
  //   });

  //   it("should fail if amount is less or equals 0", async () => {
  //     const [userVaultAddress] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
  //       program.programId
  //     );

  //     const wsolAtaForPayment = await getAssociatedTokenAddress(
  //       WSOL_ADDRESS,
  //       signerKeypair.publicKey
  //     );

  //     const wsolAtaForCollecting = await getAssociatedTokenAddress(
  //       WSOL_ADDRESS,
  //       randomKeypair.publicKey
  //     );

  //     await expect(
  //       program.methods
  //         .buyTokens({ payerMintAmount: new BN(0) })
  //         .accounts({
  //           signer: randomKeypair.publicKey,
  //           programConfig: programConfigAddress,
  //           vaultAccount: tokenVaultAddress,
  //           vaultMint: mintKeypair.publicKey,
  //           userVaultAccount: userVaultAddress,
  //           payerTokenAccount: wsolAtaForPayment,
  //           collectedFundsAccount: wsolAtaForCollecting,
  //           payerMint: WSOL_ADDRESS,
  //           chainlinkFeed: SOL_USD_FEED,
  //           chainlinkProgram: CHAINLINK_PROGRAM_ID,
  //         })
  //         .signers([randomKeypair])
  //         .rpc()
  //     ).to.be.rejectedWith(
  //       `AnchorError occurred. Error Code: InvalidTokenAmount. Error Number: 6002. Error Message: Token amount should be greater than 0.`
  //     );
  //   });

  //   it("should buy tokens", async () => {
  //     const [userVaultAddress] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
  //       program.programId
  //     );

  //     const ataForCollecting = await createAssociatedTokenAccount(
  //       connection,
  //       randomKeypair,
  //       USDT_ADDRESS,
  //       randomKeypair.publicKey
  //     );

  //     const ataForPayment = await createAssociatedTokenAccount(
  //       connection,
  //       randomKeypair,
  //       USDT_ADDRESS,
  //       signerKeypair.publicKey
  //     );

  //     // await expect(
  //     await program.methods
  //       .buyTokens({ payerMintAmount: new BN(1_000_000_000) })
  //       .accounts({
  //         signer: randomKeypair.publicKey,
  //         programConfig: programConfigAddress,
  //         vaultAccount: tokenVaultAddress,
  //         vaultMint: mintKeypair.publicKey,
  //         userVaultAccount: userVaultAddress,
  //         payerTokenAccount: ataForPayment,
  //         collectedFundsAccount: ataForCollecting,
  //         payerMint: USDT_ADDRESS,
  //         chainlinkProgram: CHAINLINK_PROGRAM_ID,
  //         chainlinkFeed: USDT_USD_FEED,
  //       })
  //       .signers([randomKeypair])
  //       .rpc();
  //     // ).to.be.rejectedWith(
  //     //   `AnchorError occurred. Error Code: InvalidTokenAmount. Error Number: 6001. Error Message: Token amount should be greater than 0`
  //     // );
  //   });

  //   it("should buy tokens", async () => {
  //     const [userVaultAddress] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("user_vault"), randomKeypair.publicKey.toBuffer()],
  //       program.programId
  //     );

  //     const wsolAtaForPayment = await getAssociatedTokenAddress(
  //       WSOL_ADDRESS,
  //       signerKeypair.publicKey
  //     );

  //     const wsolAtaForCollecting = await getAssociatedTokenAddress(
  //       WSOL_ADDRESS,
  //       randomKeypair.publicKey
  //     );

  //     await program.methods
  //       .buyTokens({ payerMintAmount: new BN(1 * 10 ** (9 - 1)) })
  //       .accounts({
  //         signer: randomKeypair.publicKey,
  //         programConfig: programConfigAddress,
  //         vaultAccount: tokenVaultAddress,
  //         vaultMint: mintKeypair.publicKey,
  //         userVaultAccount: userVaultAddress,
  //         payerTokenAccount: wsolAtaForPayment,
  //         collectedFundsAccount: wsolAtaForCollecting,
  //         chainlinkProgram: CHAINLINK_PROGRAM_ID,
  //         payerMint: WSOL_ADDRESS,
  //         chainlinkFeed: SOL_USD_FEED,
  //       })
  //       .signers([randomKeypair])
  //       .rpc();
  //   });
});
