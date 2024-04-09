use anchor_lang::prelude::*;
use anchor_spl::token::{ Mint, Token, TokenAccount };

use crate::{ constants, error::*, state::*, utils };
use chainlink_solana as chainlink;

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct BuyTokensArgs {
    pub payer_mint_amount: u64,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(seeds = [constants::CONFIG_SEED], bump)]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(mut, seeds = [constants::VAULT_SEED], bump)]
    pub vault_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        seeds = [constants::USER_VAULT_SEED, signer.key().as_ref()],
        bump,
        payer = signer,
        token::mint = vault_mint,
        token::authority = user_vault_account
    )]
    pub user_vault_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint =  payer_token_account.mint ==  payer_mint.key() @ PreSaleProgramError::InvalidPayerTokenAccount,
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    #[account(
        associated_token::mint = payer_mint.key(),
        associated_token::authority = program_config.collected_funds_account
    )]
    pub collected_funds_account: Account<'info, TokenAccount>,

    #[account(
        constraint = vault_mint.key() == vault_account.mint @ PreSaleProgramError::InvalidVaultMint,
    )]
    pub vault_mint: Account<'info, Mint>,

    #[account()]
    pub payer_mint: Account<'info, Mint>,

    /// CHECK: We're reading data from this specified chainlink feed
    #[account(
        constraint = program_config.feeds
            .iter()
            .any(|feed| feed.asset == payer_mint.key() && feed.data_feed == chainlink_feed.key()) @ PreSaleProgramError::InvalidChainlinkFeed
    )]
    pub chainlink_feed: AccountInfo<'info>,
    #[account(
        constraint = chainlink_program.key() == program_config.chainlink_program @ PreSaleProgramError::InvalidChainlinkProgram
    )]
    /// CHECK: This is the Chainlink program library
    pub chainlink_program: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_tokens(ctx: Context<BuyTokens>, args: BuyTokensArgs) -> Result<()> {
    if args.payer_mint_amount <= 0 {
        return Err(PreSaleProgramError::InvalidTokenAmount.into());
    }

    let BuyTokens { chainlink_program, chainlink_feed, program_config, .. } = &ctx.accounts;
    let payer_mint_amount = args.payer_mint_amount;
    let payer_decimals = ctx.accounts.payer_mint.decimals;
    let usd_decimals = program_config.usd_decimals;
    let usd_price = program_config.usd_price;
    let vault_mint_decimals = ctx.accounts.vault_mint.decimals;

    let round = chainlink::latest_round_data(
        chainlink_program.to_account_info(),
        chainlink_feed.to_account_info()
    )?;

    let feed_decimals = chainlink::decimals(
        chainlink_program.to_account_info(),
        chainlink_feed.to_account_info()
    )?;

    // let mint_amount = utils::calculate_token_amount(
    //     round.answer as u64,
    //     feed_decimals,
    //     payer_mint_amount,
    //     payer_decimals,
    //     usd_price,
    //     usd_decimals,
    //     vault_mint_decimals
    // );

    // msg!("- mint_amount: {}", mint_amount);

    Ok(())
}
