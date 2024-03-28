use anchor_lang::prelude::*;
use anchor_spl::token::{ Mint, Token, TokenAccount };

use crate::{ constants, state::* };

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct BuyTokensArgs {
    pub amount: u64,
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
        constraint = program_config.prices.iter().any(|price| price.mint == payment_account.mint),
    )]
    pub payment_account: Account<'info, TokenAccount>,

    #[account(
        associated_token::mint = payment_account.mint,
        associated_token::authority = program_config.collected_funds_account
    )]
    pub collected_funds_account: Account<'info, TokenAccount>,

    #[account(constraint = vault_mint.key() == vault_account.mint)]
    pub vault_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_tokens(_ctx: Context<BuyTokens>, _args: BuyTokensArgs) -> Result<()> {
    Ok(())
}
