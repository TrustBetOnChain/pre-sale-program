use anchor_lang::prelude::*;
use anchor_spl::token::{ self, Mint, Token, TokenAccount, Transfer };

use crate::{ constants, error::*, state::* };

#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    #[account(seeds = [constants::CONFIG_SEED], bump)]
    pub program_config: Box<Account<'info, ProgramConfig>>,

    #[account(mut, seeds = [constants::VAULT_SEED], bump)]
    pub vault_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = vault_mint,
        associated_token::authority = admin,
    )]
    pub token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = vault_mint.key() == token_account.mint @ PreSaleProgramError::InvalidVaultMint,
    )]
    pub vault_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = program_config.admin
    )]
    pub admin: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn withdraw_tokens(ctx: Context<WithdrawTokens>) -> Result<()> {
    let vault_account = &ctx.accounts.vault_account;

    if vault_account.amount <= 0 {
        return Err(PreSaleProgramError::InsufficientVaultBalance.into());
    }

    transfer_tokens_to_admin(&ctx)?;

    Ok(())
}

fn transfer_tokens_to_admin<'info>(ctx: &Context<WithdrawTokens>) -> Result<()> {
    let vault_account = &ctx.accounts.vault_account;
    let bump = ctx.bumps.vault_account;
    let signer: &[&[&[u8]]] = &[&[constants::VAULT_SEED, &[bump]]];

    let cpi_accounts = Transfer {
        from: vault_account.to_account_info().clone(),
        to: ctx.accounts.token_account.to_account_info().clone(),
        authority: ctx.accounts.vault_account.to_account_info().clone(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();

    token::transfer(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, signer),
        vault_account.amount
    )?;

    Ok(())
}
