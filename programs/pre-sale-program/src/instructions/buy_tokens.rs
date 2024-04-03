use anchor_lang::prelude::*;
use anchor_spl::token::{ Mint, Token, TokenAccount };
use std::ops::{ Div, Mul };

use crate::{ constants, error::*, state::*, utils };
use chainlink_solana as chainlink;

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct BuyTokensArgs {
    pub payer_token_amount: u64,
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
    if args.payer_token_amount <= 0 {
        return Err(PreSaleProgramError::InvalidTokenAmount.into());
    }

    let BuyTokens { chainlink_program, chainlink_feed, program_config, .. } = &ctx.accounts;
    let payer_token_amount = args.payer_token_amount;
    let payer_decimals = ctx.accounts.payer_mint.decimals;
    let usd_decimals = program_config.usd_decimals;
    let usd_price = program_config.usd_price;

    let round = chainlink::latest_round_data(
        chainlink_program.to_account_info(),
        chainlink_feed.to_account_info()
    )?;

    let description = chainlink::description(
        ctx.accounts.chainlink_program.to_account_info(),
        ctx.accounts.chainlink_feed.to_account_info()
    )?;

    let feed_decimals = chainlink::decimals(
        chainlink_program.to_account_info(),
        chainlink_feed.to_account_info()
    )?;

    let asset_decimals = ctx.accounts.vault_mint.decimals;

    let f_feed_value = utils::convert_to_float(round.answer as u64, feed_decimals);
    let f_payer_token_amount = utils::convert_to_float(payer_token_amount, payer_decimals);
    let f_payer_usd_amount = f_feed_value.mul(f_payer_token_amount);
    let f_usd_price = utils::convert_to_float(usd_price, usd_decimals);
    let f_token_amount = f_payer_usd_amount.div(f_usd_price);

    let token_amount = utils::convert_from_float(f_token_amount, asset_decimals);

    msg!("- description: {}", description);
    msg!("- f_feed_value: {}", f_feed_value);
    msg!("- f_payer_token_amount: {}", f_payer_token_amount);
    msg!("- f_payer_usd_amount: {}", f_payer_usd_amount);
    msg!("- f_token_amount: {}", f_token_amount);
    msg!("- token_amount: {}", token_amount);
    msg!("- f_usd_price: {}", f_usd_price);
    msg!("- feed_decimals: {}", feed_decimals);
    msg!("- payer_decimals: {}", payer_decimals);
    msg!("- asset_decimals: {}", asset_decimals);
    Ok(())
}
