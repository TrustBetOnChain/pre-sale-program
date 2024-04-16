use anchor_lang::{ prelude::*, solana_program::system_instruction };
use anchor_spl::token::{ self, Mint, Token, TokenAccount, Transfer, spl_token::native_mint };
use chainlink_solana as chainlink;
use rust_decimal::prelude::ToPrimitive;

use crate::{ constants, error::*, state::*, utils };

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct BuyTokensArgs {
    pub amount: u64,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(seeds = [constants::CONFIG_SEED], bump)]
    pub program_config: Box<Account<'info, ProgramConfig>>,

    #[account(mut, seeds = [constants::VAULT_SEED], bump)]
    pub vault_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        seeds = [constants::USER_VAULT_SEED, signer.key().as_ref()],
        bump,
        payer = signer,
        token::mint = vault_mint,
        token::authority = user_vault_account
    )]
    pub user_vault_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = payer_mint,
        associated_token::authority = signer,
    )]
    pub payer_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = payer_mint.key(),
        associated_token::authority = program_config.collected_funds_account
    )]
    pub collected_funds_token_account: Box<Account<'info, TokenAccount>>,

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

    #[account(
        mut,
        constraint = collected_funds_account.key() == program_config.collected_funds_account @ PreSaleProgramError::IvalidCollectedFundsAccount
    )]
    /// CHECK: This account is used when transferring native SOL instead of WSOL
    pub collected_funds_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_tokens(ctx: Context<BuyTokens>, args: BuyTokensArgs) -> Result<()> {
    let amount = args.amount;

    // Check if the requested amount is greater than the vault account balance
    if amount > ctx.accounts.vault_account.amount {
        return Err(PreSaleProgramError::InsufficientVaultBalance.into());
    }

    let payer_mint_amount = calculate_payer_mint_amount(&ctx, amount)?;

    if payer_mint_amount <= 0 {
        return Err(PreSaleProgramError::LessThanMinimalValue.into());
    }

    transfer_funds_to_collector(&ctx, payer_mint_amount)?;
    transfer_tokens_to_user(&ctx, amount)?;

    Ok(())
}

fn calculate_payer_mint_amount(ctx: &Context<BuyTokens>, amount: u64) -> Result<u64> {
    let round = chainlink::latest_round_data(
        ctx.accounts.chainlink_program.to_account_info(),
        ctx.accounts.chainlink_feed.to_account_info()
    )?;
    let feed_decimals = chainlink::decimals(
        ctx.accounts.chainlink_program.to_account_info(),
        ctx.accounts.chainlink_feed.to_account_info()
    )?;

    let d_payer_mint_amount = utils::convert_mint(
        amount,
        ctx.accounts.vault_mint.decimals,
        ctx.accounts.program_config.usd_price,
        ctx.accounts.program_config.usd_decimals,
        round.answer as u64,
        feed_decimals,
        ctx.accounts.payer_mint.decimals
    );

    return d_payer_mint_amount.to_u64().ok_or(PreSaleProgramError::ConversionError.into());
}

fn transfer_funds_to_collector<'info>(
    ctx: &Context<BuyTokens>,
    payer_mint_amount: u64
) -> Result<()> {
    if ctx.accounts.payer_mint.key() == native_mint::id() {
        transfer_sol_to_collector_directly(ctx, payer_mint_amount)?;
    } else {
        transfer_spl_to_collector(ctx, payer_mint_amount)?;
    }

    Ok(())
}

fn transfer_sol_to_collector_directly<'info>(
    ctx: &Context<BuyTokens>,
    payer_mint_amount: u64
) -> Result<()> {
    let transfer_instruction = system_instruction::transfer(
        ctx.accounts.signer.key,
        ctx.accounts.collected_funds_account.key,
        payer_mint_amount
    );

    anchor_lang::solana_program::program::invoke_signed(
        &transfer_instruction,
        &[
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.collected_funds_account.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        &[]
    )?;

    Ok(())
}

fn transfer_spl_to_collector<'info>(
    ctx: &Context<BuyTokens>,
    payer_mint_amount: u64
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info().clone(),
        to: ctx.accounts.collected_funds_token_account.to_account_info().clone(),
        authority: ctx.accounts.signer.to_account_info().clone(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();

    token::transfer(CpiContext::new(cpi_program, cpi_accounts), payer_mint_amount)?;

    Ok(())
}

fn transfer_tokens_to_user<'info>(ctx: &Context<BuyTokens>, amount: u64) -> Result<()> {
    let bump = ctx.bumps.vault_account;
    let signer: &[&[&[u8]]] = &[&[constants::VAULT_SEED, &[bump]]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_account.to_account_info().clone(),
        to: ctx.accounts.user_vault_account.to_account_info().clone(),
        authority: ctx.accounts.vault_account.to_account_info().clone(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();

    token::transfer(CpiContext::new_with_signer(cpi_program, cpi_accounts, signer), amount)?;

    Ok(())
}
