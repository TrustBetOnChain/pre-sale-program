use anchor_spl::token::{ Mint, Token, TokenAccount };
use anchor_lang::prelude::*;
use crate::state::ProgramConfig;
use crate::constants::*;

#[derive(Accounts)]
pub struct InitializeProgramConfig<'info> {
    #[account(init, seeds = [CONFIG_SEED], bump, payer = signer, space = ProgramConfig::get_len(0))]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(
        init,
        seeds = [VAULT_SEED],
        bump,
        payer = signer,
        token::mint = mint,
        token::authority = vault_account
    )]
    pub vault_account: Account<'info, TokenAccount>,

    /// CHECK: This is an external account used for collecting funds
    pub collected_funds_account: AccountInfo<'info>,

    #[account(
        mut,
    )]
    pub signer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    /// CHECK: This is the Chainlink program library
    pub chainlink_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_program_config(ctx: Context<InitializeProgramConfig>) -> Result<()> {
    let program_config = &mut ctx.accounts.program_config;
    program_config.admin = ctx.accounts.signer.key();
    program_config.collected_funds_account = ctx.accounts.collected_funds_account.key();
    program_config.chainlink_program = ctx.accounts.chainlink_program.key();
    Ok(())
}
