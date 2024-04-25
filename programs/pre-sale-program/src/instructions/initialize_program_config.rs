use anchor_spl::token::{ Mint, Token };
use anchor_lang::prelude::*;
use crate::state::{ ProgramConfig, VaultInfo };
use crate::constants::*;

#[derive(Accounts)]
pub struct InitializeProgramConfig<'info> {
    #[account(init, seeds = [CONFIG_SEED], bump, payer = signer, space = ProgramConfig::get_len(0))]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(
        init,
        seeds = [VAULT_INFO_SEED],
        bump,
        payer = signer,
        space = 8 + std::mem::size_of::<VaultInfo>()
    )]
    pub vault_account: Account<'info, VaultInfo>,

    /// CHECK: This is an external account used for collecting funds
    pub collected_funds_account: AccountInfo<'info>,

    #[account(
        mut,
    )]
    pub signer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    /// CHECK: This is the Chainlink program library
    pub chainlink_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_program_config(ctx: Context<InitializeProgramConfig>) -> Result<()> {
    let program_config = &mut ctx.accounts.program_config;
    program_config.admin = ctx.accounts.signer.key();
    program_config.collected_funds_account = ctx.accounts.collected_funds_account.key();
    program_config.chainlink_program = ctx.accounts.chainlink_program.key();
    Ok(())
}
