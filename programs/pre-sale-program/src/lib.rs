use anchor_lang::prelude::*;

mod instructions;
use instructions::*;

mod state;

mod error;
mod utils;

#[cfg(test)]
mod tests;

declare_id!("CksdmMwTMoiotvYaNhXt8yUTYWHG4z8bBDvnq3cGY1EC");

pub mod constants {
    pub const CONFIG_SEED: &[u8] = b"config";
    pub const VAULT_INFO_SEED: &[u8] = b"vault_info";
    pub const USER_INFO_SEED: &[u8] = b"user_info";
}

#[program]
pub mod pre_sale_program {
    use super::*;

    pub fn initialize_program_config(ctx: Context<InitializeProgramConfig>) -> Result<()> {
        instructions::initialize_program_config(ctx)
    }

    pub fn update_program_config(
        ctx: Context<UpdateProgramConfig>,
        args: UpdateProgramConfigArgs
    ) -> Result<()> {
        instructions::update_program_config(ctx, args)
    }

    pub fn update_vault(ctx: Context<UpdateVault>, args: UpdateVaultArgs) -> Result<()> {
        instructions::update_vault(ctx, args)
    }

    pub fn buy_tokens(ctx: Context<BuyTokens>, args: BuyTokensArgs) -> Result<()> {
        instructions::buy_tokens(ctx, args)
    }
}
