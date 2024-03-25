use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::CONFIG_SEED;

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct UpdateProgramConfigArgs {
    pub admin: Option<Pubkey>,
    pub mints: Option<Vec<MintPrice>>,
    pub has_presale_ended: Option<bool>,
}

#[derive(Accounts)]
#[instruction(args: UpdateProgramConfigArgs)]
pub struct UpdateProgramConfig<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump,
        realloc = ProgramConfig::get_len(args.mints.clone().unwrap_or_default().len()),
        realloc::payer = admin,
        realloc::zero = true,
    )]
    pub program_config: Account<'info, ProgramConfig>,
    #[account(
        mut,
        address = program_config.admin
    )]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn update_program_config(
    ctx: Context<UpdateProgramConfig>,
    args: UpdateProgramConfigArgs
) -> Result<()> {
    let program_config = &mut ctx.accounts.program_config;

    if let Some(admin) = args.admin {
        program_config.admin = admin;
    }

    if let Some(mints) = args.mints {
        program_config.prices = mints;
    }

    if let Some(has_presale_ended) = args.has_presale_ended {
        program_config.has_presale_ended = has_presale_ended;
    }

    Ok(())
}
