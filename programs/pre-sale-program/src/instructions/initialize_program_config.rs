use crate::state::ProgramConfig;
use crate::constants::SEED_PROGRAM_CONFIG;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeProgramConfig<'info> {
    #[account(
        init,
        seeds = [SEED_PROGRAM_CONFIG],
        bump,
        payer = authority,
        space = ProgramConfig::get_len(0)
    )]
    pub program_config: Account<'info, ProgramConfig>,
    #[account(
        mut,
    )]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_program_config(ctx: Context<InitializeProgramConfig>) -> Result<()> {
    ctx.accounts.program_config.admin = ctx.accounts.authority.key();
    Ok(())
}
