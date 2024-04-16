import { workspace, Program, BN, LangErrorCode } from "@coral-xyz/anchor";

import { IDL, PreSaleProgram } from "../target/types/pre_sale_program";
import {
  Keypair,
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
  mockUsdtKeypair,
} from "./mocks";
import {
  airdrop,
  createSplToken,
  calculateConfigSize,
  convertLamports,
  mint,
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
import {
  createAssociatedTokenAccount,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { viewTokenAmount } from "../scripts/views";
import { buyTokensInstruction } from "../scripts/instructions/buy-tokens";

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
    await createSplToken(
      mockSignerKeypair,
      mockMintKeypair,
      mintDecimals,
      connection
    );

    await createSplToken(
      mockSignerKeypair,
      mockUsdtKeypair,
      tokens.testnet.USDT.decimals,
      connection
    );

    const usdtAta = await createAssociatedTokenAccount(
      connection,
      mockSignerKeypair,
      mockUsdtKeypair.publicKey,
      mockSignerKeypair.publicKey
    );

    await mint(
      usdtAta,
      1005 * 10 ** tokens.testnet.USDT.decimals,
      mockSignerKeypair,
      mockUsdtKeypair.publicKey,
      connection
    );
  });

  it("[getDataFeed] should return price feed!", async () => {
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

  it("[initializeProgramConfig] should be initialized!", async () => {
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

  it("[initializeProgramConfig] should be initialized only once!", async () => {
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

  it("[updateProgramConfig] should throw an error if not admin tries to update config", async () => {
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

    await expect(sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]))
      .to.be.rejectedWith()
      .then((e) => {
        expect(
          e.logs.some((log) =>
            log.includes(
              `custom program error: 0x${LangErrorCode.ConstraintAddress.toString(
                16
              )}`
            )
          )
        ).to.be.true;
      });
  });

  it("[updateProgramConfig] should only update hasPresaleEnded value", async () => {
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

  it("[updateProgramConfig] should only update admin value", async () => {
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

  it("[updateProgramConfig] should only update feeds value", async () => {
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

  it("[updateProgramConfig] should only update collectedFundsAccount value", async () => {
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

  it("[updateProgramConfig] should only update Chainlink value", async () => {
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

  it("[updateProgramConfig] should only update price value", async () => {
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

  it("[updateProgramConfig] should allocate and reallocate right size", async () => {
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

    feeds[0].asset = mockUsdtKeypair.publicKey;

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

  it("[getTokenAmount] should throw LessThanMinimalValue error", async () => {
    const bigAmount = `${1}`;
    const priceFeed = getPriceFeed("SOL", "mainnet-beta");

    await expect(
      viewTokenAmount({
        accounts: {
          programConfig: programConfigAddress,
          vaultMint: mockMintKeypair.publicKey,
          chainlinkProgram: CHAINLINK_PROGRAM,
          payerMint: priceFeed.asset,
          chainlinkFeed: priceFeed.dataFeed,
        },
        args: { amount: new BN(bigAmount) },
        program,
      })
    )
      .to.be.rejectedWith()
      .then((e) => {
        expect(e.simulationResponse.err.InstructionError[1].Custom).to.equal(
          IDL.errors[6].code
        );
      });
  });

  it("[getTokenAmount] should return price in payer's token required for token amount!", async () => {
    const bigAmount = `${10_000_000 * 10 ** mintDecimals}`;

    const priceFeed = getPriceFeed("SOL", "mainnet-beta");

    const value = await viewTokenAmount({
      accounts: {
        programConfig: programConfigAddress,
        vaultMint: mockMintKeypair.publicKey,
        chainlinkProgram: CHAINLINK_PROGRAM,
        payerMint: priceFeed.asset,
        chainlinkFeed: priceFeed.dataFeed,
      },
      args: { amount: new BN(bigAmount) },
      program,
    });

    // around 5954 with 170 USD per SOL
    console.log(value.toNumber() / LAMPORTS_PER_SOL);
  });

  it("[buyTokens] should fail when a wrong collector ATA provided", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockRandomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wsolAtaForPayment = await createAssociatedTokenAccount(
      connection,
      mockRandomKeypair,
      tokens["mainnet-beta"].SOL.pubkey,
      mockRandomKeypair.publicKey
    );

    const wrongAtaAuthority = mockSignerKeypair;

    const wrongWsolAtaForCollecting = await createAssociatedTokenAccount(
      connection,
      wrongAtaAuthority,
      tokens["mainnet-beta"].SOL.pubkey,
      wrongAtaAuthority.publicKey
    );

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockRandomKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mockMintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: wsolAtaForPayment,
        collectedFundsTokenAccount: wrongWsolAtaForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: tokens["mainnet-beta"].SOL.pubkey,
        chainlinkFeed: tokens["mainnet-beta"].SOL.pubkey,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount: new BN(0) },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await expect(sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]))
      .to.be.rejectedWith()
      .then((e) => {
        expect(
          e.logs.some((log) => {
            // https://anchor.so/errors
            return log.includes(
              `custom program error: 0x${LangErrorCode.ConstraintTokenOwner.toString(
                16
              )}`
            );
          }) &&
            e.logs.some((log) =>
              log.includes(
                "Program log: AnchorError caused by account: collected_funds_token_account. Error Code: ConstraintTokenOwner. Error Number: 2015. Error Message: A token owner constraint was violated."
              )
            )
        ).to.be.true;
      });
  });

  it("[buyTokens] should fail when user vault is of another user", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockRandomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wrong_mint_address = mockMintKeypair.publicKey;

    const ataForPayment = await createAssociatedTokenAccount(
      connection,
      mockSignerKeypair,
      wrong_mint_address,
      mockSignerKeypair.publicKey
    );

    const ataForCollecting = await createAssociatedTokenAccount(
      connection,
      mockRandomKeypair,
      wrong_mint_address,
      mockRandomKeypair.publicKey
    );

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockSignerKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mockMintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: ataForPayment,
        collectedFundsTokenAccount: ataForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: tokens["mainnet-beta"].SOL.pubkey,
        chainlinkFeed: tokens["mainnet-beta"].SOL.pubkey,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount: new BN(0) },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await expect(sendAndConfirmTransaction(connection, tx, [mockSignerKeypair]))
      .to.be.rejectedWith()
      .then((e) => {
        expect(
          e.logs.some((log) =>
            log.includes(
              `AnchorError caused by account: user_vault_account. Error Code: ConstraintSeeds. Error Number: 2006. Error Message: A seeds constraint was violated.`
            )
          )
        ).to.be.true;
      });
  });

  it("[buyTokens] should fail when token accounts mint differs from payer mint", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockSignerKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wrong_mint_address = mockMintKeypair.publicKey;

    const ataForPayment = await getAssociatedTokenAddress(
      wrong_mint_address,
      mockSignerKeypair.publicKey
    );

    const ataForCollecting = await getAssociatedTokenAddress(
      wrong_mint_address,
      mockRandomKeypair.publicKey
    );

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockSignerKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mockMintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: ataForPayment,
        collectedFundsTokenAccount: ataForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: tokens["mainnet-beta"].SOL.pubkey,
        chainlinkFeed: tokens["mainnet-beta"].SOL.pubkey,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount: new BN(0) },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await expect(sendAndConfirmTransaction(connection, tx, [mockSignerKeypair]))
      .to.be.rejectedWith()
      .then((e) => {
        expect(
          e.logs.some((log) =>
            log.includes(
              `AnchorError caused by account: payer_token_account. Error Code: ConstraintAssociated. Error Number: 2009. Error Message: An associated constraint was violated.`
            )
          )
        ).to.be.true;
      });
  });

  it("[buyTokens] should fail when collector mint doesnt match payment mint", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockSignerKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wrong_mint_address = mockMintKeypair.publicKey;

    const wsolAtaForPayment = await getAssociatedTokenAddress(
      tokens["mainnet-beta"].SOL.pubkey,
      mockSignerKeypair.publicKey
    );

    const wrongAtaForCollecting = await getAssociatedTokenAddress(
      wrong_mint_address,
      mockRandomKeypair.publicKey
    );

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockSignerKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mockMintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: wsolAtaForPayment,
        collectedFundsTokenAccount: wrongAtaForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: tokens["mainnet-beta"].SOL.pubkey,
        chainlinkFeed: tokens["mainnet-beta"].SOL.pubkey,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount: new BN(0) },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await expect(sendAndConfirmTransaction(connection, tx, [mockSignerKeypair]))
      .to.be.rejectedWith()
      .then((e) => {
        expect(
          e.logs.some((log) =>
            log.includes(
              `AnchorError caused by account: collected_funds_token_account. Error Code: ConstraintAssociated. Error Number: 2009. Error Message: An associated constraint was violated.`
            )
          )
        ).to.be.true;
      });
  });

  it("[buyTokens] should fail when vault mint is invalid", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockRandomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wsolAtaForPayment = await getAssociatedTokenAddress(
      tokens["mainnet-beta"].SOL.pubkey,
      mockRandomKeypair.publicKey
    );

    const ataForCollecting = await getAssociatedTokenAddress(
      tokens["mainnet-beta"].SOL.pubkey,
      mockRandomKeypair.publicKey
    );

    const wrongVaultMint = tokens["mainnet-beta"].SOL.pubkey;

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockRandomKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: wrongVaultMint,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: wsolAtaForPayment,
        collectedFundsTokenAccount: ataForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: tokens["mainnet-beta"].SOL.pubkey,
        chainlinkFeed: tokens["mainnet-beta"].SOL.pubkey,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount: new BN(0) },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await expect(sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]))
      .to.be.rejectedWith()
      .then((e) => {
        expect(
          e.logs.some((log) =>
            log.includes(
              `AnchorError caused by account: vault_mint. Error Code: InvalidVaultMint. Error Number: 6000. Error Message: Vault mint is invalid.`
            )
          )
        ).to.be.true;
      });
  });

  it("[buyTokens] should fail if where were nonexistent payment mint provided", async () => {
    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockRandomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const nonexistentPriceMint = "USDC";

    const wsolAtaForPayment = await getAssociatedTokenAddress(
      tokens["mainnet-beta"][nonexistentPriceMint].pubkey,
      mockRandomKeypair.publicKey
    );

    const wsolAtaForCollecting = await createAssociatedTokenAccount(
      connection,
      mockRandomKeypair,
      tokens["mainnet-beta"][nonexistentPriceMint].pubkey,
      programConfig.collectedFundsAccount
    );

    const nonexistentPayerMint =
      getPriceFeeds("mainnet-beta")[nonexistentPriceMint].asset;
    const nonexistentFeedAddress =
      getPriceFeeds("mainnet-beta")[nonexistentPriceMint].dataFeed;

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockRandomKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mockMintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: wsolAtaForPayment,
        collectedFundsTokenAccount: wsolAtaForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: nonexistentPayerMint,
        chainlinkFeed: nonexistentFeedAddress,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount: new BN(0) },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await expect(sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]))
      .to.be.rejectedWith()
      .then((e) => {
        expect(
          e.logs.some((log) =>
            log.includes(
              `AnchorError caused by account: chainlink_feed. Error Code: InvalidChainlinkFeed. Error Number: 6004. Error Message: Invalid chainlink_feed account or payer_mint and chainlink_feed don't match.`
            )
          )
        ).to.be.true;
      });
  });

  it("[buyTokens] should fail if feed doesn't match", async () => {
    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockRandomKeypair.publicKey.toBuffer()],
      program.programId
    );

    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const existingPriceMint = "SOL";

    const wsolAtaForPayment = await getAssociatedTokenAddress(
      tokens["mainnet-beta"][existingPriceMint].pubkey,
      mockRandomKeypair.publicKey
    );

    const wsolAtaForCollecting = await getAssociatedTokenAddress(
      tokens["mainnet-beta"][existingPriceMint].pubkey,
      programConfig.collectedFundsAccount
    );

    const payerMint = getPriceFeeds("mainnet-beta")[existingPriceMint].asset;
    const feedAddress = getPriceFeeds("mainnet-beta")["USDT"].dataFeed;

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockRandomKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mockMintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: wsolAtaForPayment,
        collectedFundsTokenAccount: wsolAtaForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: payerMint,
        chainlinkFeed: feedAddress,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount: new BN(0) },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await expect(sendAndConfirmTransaction(connection, tx, [mockRandomKeypair]))
      .to.be.rejectedWith()
      .then((e) => {
        expect(
          e.logs.some((log) =>
            log.includes(
              `AnchorError caused by account: chainlink_feed. Error Code: InvalidChainlinkFeed. Error Number: 6004. Error Message: Invalid chainlink_feed account or payer_mint and chainlink_feed don't match.`
            )
          )
        ).to.be.true;
      });
  });

  it("[buyTokens] should fail if amount of tokens user should pay is less that minimal", async () => {
    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockSignerKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wsolAtaForPayment = await getAssociatedTokenAddress(
      getPriceFeeds("mainnet-beta").SOL.asset,
      mockSignerKeypair.publicKey
    );

    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const wsolAtaForCollecting = await getAssociatedTokenAddress(
      getPriceFeeds("mainnet-beta").SOL.asset,
      programConfig.collectedFundsAccount
    );

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockSignerKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mockMintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: wsolAtaForPayment,
        collectedFundsTokenAccount: wsolAtaForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: getPriceFeeds("mainnet-beta").SOL.asset,
        chainlinkFeed: getPriceFeeds("mainnet-beta").SOL.dataFeed,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount: new BN(0) },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await expect(sendAndConfirmTransaction(connection, tx, [mockSignerKeypair]))
      .to.be.rejectedWith()
      .then((e) => {
        expect(
          e.logs.some((log) =>
            log.includes(
              `AnchorError occurred. Error Code: LessThanMinimalValue. Error Number: 6006. Error Message: Payer value is less than minimal.`
            )
          )
        ).to.be.true;
      });
  });

  it("before successful [buyTokens] should prepare config", async () => {
    const updateCollectedFundsInstruction =
      await updateProgramConfigInstruction({
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
          collectedFundsAccount: mockCollectedFundsKeypair.publicKey,
          chainlinkProgram: null,
        },
        program,
      });

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(updateCollectedFundsInstruction),
      [mockRandomKeypair]
    );
  });

  it("[buyTokens] should throw an error is the amount of tokens to buy is bigger that treasury", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const currency = "USDT";

    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockSignerKeypair.publicKey.toBuffer()],
      program.programId
    );

    const usdtAtaForPayment = await getAssociatedTokenAddress(
      getPriceFeeds("testnet")[currency].asset,
      mockSignerKeypair.publicKey
    );

    const usdtAtaForCollecting = await createAssociatedTokenAccount(
      connection,
      mockSignerKeypair,
      getPriceFeeds("testnet")[currency].asset,
      programConfig.collectedFundsAccount
    );

    const amount = new BN(10_000 * 10 ** mintDecimals);

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockSignerKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mockMintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: usdtAtaForPayment,
        collectedFundsTokenAccount: usdtAtaForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: getPriceFeeds("testnet")[currency].asset,
        chainlinkFeed: getPriceFeeds("testnet")[currency].dataFeed,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await expect(sendAndConfirmTransaction(connection, tx, [mockSignerKeypair]))
      .to.be.rejectedWith()
      .then((e) => {
        expect(
          e.logs.some((log) =>
            log.includes(
              `AnchorError occurred. Error Code: InsufficientVaultBalance. Error Number: 6008. Error Message: Amount of purchase is bigger than the amount in the treasury.`
            )
          )
        ).to.be.true;
      });
  });

  it("[buyTokens] should buy tokens with SPL", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const currency = "USDT";
    const amount = new BN(10_000 * 10 ** mintDecimals);

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    const vaultBalance = (await getAccount(connection, vaultAddress)).amount;

    expect(Number(vaultBalance)).to.equal(0);

    await mint(
      vaultAddress,
      amount,
      mockSignerKeypair,
      mockMintKeypair.publicKey,
      connection
    );

    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockSignerKeypair.publicKey.toBuffer()],
      program.programId
    );

    const usdtAtaForPayment = await getAssociatedTokenAddress(
      getPriceFeeds("testnet")[currency].asset,
      mockSignerKeypair.publicKey
    );

    const usdtAtaForCollecting = await getAssociatedTokenAddress(
      getPriceFeeds("testnet")[currency].asset,
      programConfig.collectedFundsAccount
    );

    const collectedFundsUsdtBalance = (
      await getAccount(connection, usdtAtaForCollecting)
    ).amount;

    expect(Number(collectedFundsUsdtBalance)).to.equal(0);

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockSignerKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mockMintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: usdtAtaForPayment,
        collectedFundsTokenAccount: usdtAtaForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: getPriceFeeds("testnet")[currency].asset,
        chainlinkFeed: getPriceFeeds("testnet")[currency].dataFeed,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    try {
      await sendAndConfirmTransaction(connection, tx, [mockSignerKeypair]);
    } catch (e) {
      console.log(e);
    }

    const updatedVaultBalance = (await getAccount(connection, vaultAddress))
      .amount;

    expect(Number(updatedVaultBalance)).to.equal(0);

    const userVaultBalance = (await getAccount(connection, userVaultAddress))
      .amount;

    expect(userVaultBalance.toString()).to.equal(amount.toString());

    const updatedCollectedFundsUsdtBalance = (
      await getAccount(connection, usdtAtaForCollecting)
    ).amount;

    expect(Number(updatedCollectedFundsUsdtBalance)).to.not.equal(0);
  });

  it("before successful [buyTokens] should change price to 0.2", async () => {
    const updateCollectedFundsInstruction =
      await updateProgramConfigInstruction({
        accounts: {
          admin: mockRandomKeypair.publicKey,
          programConfig: programConfigAddress,
        },
        args: {
          hasPresaleEnded: null,
          admin: null,
          feeds: null,
          usdPrice: new BN(20),
          usdDecimals: null,
          collectedFundsAccount: null,
          chainlinkProgram: null,
        },
        program,
      });

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(updateCollectedFundsInstruction),
      [mockRandomKeypair]
    );
  });

  it("[buyTokens] should buy tokens with SOL", async () => {
    const programConfig = await program.account.programConfig.fetch(
      programConfigAddress
    );

    const [userVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), mockSignerKeypair.publicKey.toBuffer()],
      program.programId
    );

    const wsolAtaForPayment = await getAssociatedTokenAddress(
      getPriceFeeds("mainnet-beta").SOL.asset,
      mockSignerKeypair.publicKey
    );

    const wsolAtaForCollecting = await createAssociatedTokenAccount(
      connection,
      mockSignerKeypair,
      getPriceFeeds("mainnet-beta").SOL.asset,
      programConfig.collectedFundsAccount
    );

    const collectedFundsBalance = await connection.getBalance(
      programConfig.collectedFundsAccount
    );

    expect(Number(collectedFundsBalance)).to.equal(0);

    const amount = new BN(2_000 * 10 ** mintDecimals);

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    const vaultBalance = (await getAccount(connection, vaultAddress)).amount;
    const userVaultBalance = (await getAccount(connection, userVaultAddress))
      .amount;

    expect(Number(vaultBalance)).to.equal(0);

    await mint(
      vaultAddress,
      amount,
      mockSignerKeypair,
      mockMintKeypair.publicKey,
      connection
    );

    const instruction = await buyTokensInstruction({
      accounts: {
        signer: mockSignerKeypair.publicKey,
        programConfig: programConfigAddress,
        vaultAccount: tokenVaultAddress,
        vaultMint: mockMintKeypair.publicKey,
        userVaultAccount: userVaultAddress,
        payerTokenAccount: wsolAtaForPayment,
        collectedFundsTokenAccount: wsolAtaForCollecting,
        collectedFundsAccount: programConfig.collectedFundsAccount,
        payerMint: getPriceFeeds("mainnet-beta").SOL.asset,
        chainlinkFeed: getPriceFeeds("mainnet-beta").SOL.dataFeed,
        chainlinkProgram: CHAINLINK_PROGRAM,
      },
      args: { amount },
      program,
    });

    const tx = new Transaction();
    tx.add(instruction);

    await sendAndConfirmTransaction(connection, tx, [mockSignerKeypair]);

    const updatedCollectedFundsBalance = await connection.getBalance(
      programConfig.collectedFundsAccount
    );

    expect(Number(updatedCollectedFundsBalance)).to.not.equal(0);

    const updatedVaultBalance = (await getAccount(connection, vaultAddress))
      .amount;

    expect(Number(updatedVaultBalance)).to.equal(0);

    const updatedUserVaultBalance = (
      await getAccount(connection, userVaultAddress)
    ).amount;

    expect(Number(updatedUserVaultBalance) - Number(userVaultBalance)).to.equal(
      amount.toNumber()
    );
  });
});
