use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::{ CONFIG_SEED, VAULT_INFO_SEED };

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct UpdateVaultArgs {
    pub stake: Option<u64>,
    pub decimals: Option<u8>,
}

#[derive(Accounts)]
#[instruction(args: UpdateVaultArgs)]
pub struct UpdateVault<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(
        mut,
        seeds = [VAULT_INFO_SEED], bump
    )]
    pub vault_account: Account<'info, VaultInfo>,

    #[account(
        mut,
        address = program_config.admin
    )]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn update_vault(ctx: Context<UpdateVault>, args: UpdateVaultArgs) -> Result<()> {
    let vault = &mut ctx.accounts.vault_account;

    if let Some(stake) = args.stake {
        vault.stake = stake;
    }

    if let Some(decimals) = args.decimals {
        vault.decimals = decimals;
    }
    Ok(())
}
