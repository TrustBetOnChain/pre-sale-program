use anchor_lang::prelude::*;
use anchor_spl::token::{ self, Mint, Token, TokenAccount, Transfer };
use rust_decimal::prelude::*;

use crate::{ constants, error::*, state::*, utils };

#[derive(Accounts)]
pub struct ClaimTokens<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(seeds = [constants::CONFIG_SEED], bump)]
    pub program_config: Box<Account<'info, ProgramConfig>>,

    #[account(
        mut,
        seeds = [constants::USER_VAULT_SEED, signer.key().as_ref()],
        bump,
        token::mint = vault_mint,
        token::authority = user_vault_account
    )]
    pub user_vault_account: Box<Account<'info, TokenAccount>>,

    #[account(seeds = [constants::USER_INFO_SEED, signer.key.as_ref()], bump)]
    pub user_info_account: Box<Account<'info, UserInfo>>,

    #[account(
        mut,
        associated_token::mint = vault_mint,
        associated_token::authority = signer,
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = vault_mint.key() == user_vault_account.mint @ PreSaleProgramError::InvalidVaultMint,
    )]
    pub vault_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn claim_tokens(ctx: Context<ClaimTokens>) -> Result<()> {
    let user_info_account = &ctx.accounts.user_info_account;
    let user_vault_account = &ctx.accounts.user_vault_account;
    let program_config = &ctx.accounts.program_config;

    if !program_config.has_presale_ended {
        return Err(PreSaleProgramError::PreSaleStillOn.into());
    }

    if user_vault_account.amount <= 0 || program_config.available_percentage <= 0 {
        return Err(PreSaleProgramError::InsufficientVaultBalance.into());
    }

    let d_claimable_amount = utils::calculate_claimable_amount(
        user_info_account.stake,
        user_vault_account.amount,
        program_config.available_percentage
    );

    let claimable_amount = d_claimable_amount.to_u64().unwrap();

    if d_claimable_amount.le(&Decimal::ZERO) || claimable_amount <= 0 {
        return Err(PreSaleProgramError::InsufficientVaultBalance.into());
    }

    transfer_tokens_to_user(&ctx, claimable_amount)?;

    Ok(())
}

fn transfer_tokens_to_user<'info>(ctx: &Context<ClaimTokens>, amount: u64) -> Result<()> {
    let user_vault_account = &ctx.accounts.user_vault_account;
    let user = ctx.accounts.signer.key;
    let bump = ctx.bumps.user_vault_account;
    let signer: &[&[&[u8]]] = &[&[constants::USER_VAULT_SEED, user.as_ref(), &[bump]]];

    let cpi_accounts = Transfer {
        from: user_vault_account.to_account_info().clone(),
        to: ctx.accounts.user_token_account.to_account_info().clone(),
        authority: ctx.accounts.user_vault_account.to_account_info().clone(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();

    token::transfer(CpiContext::new_with_signer(cpi_program, cpi_accounts, signer), amount)?;

    Ok(())
}
