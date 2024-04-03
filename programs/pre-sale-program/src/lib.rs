use anchor_lang::prelude::*;

mod instructions;
use instructions::*;

mod state;

mod error;
mod utils;

declare_id!("4hPuDXNwStdVPCKukJPvHMgRxtFgQxKexVZQeTcHUdq6");

pub mod constants {
    pub const CONFIG_SEED: &[u8] = b"config";
    pub const VAULT_SEED: &[u8] = b"vault";
    pub const USER_VAULT_SEED: &[u8] = b"user_vault";
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

    pub fn get_token_amount(ctx: Context<GetTokenAmount>, args: GetTokenAmountArgs) -> Result<u64> {
        instructions::get_token_amount(ctx, args)
    }

    pub fn buy_tokens(ctx: Context<BuyTokens>, args: BuyTokensArgs) -> Result<()> {
        instructions::buy_tokens(ctx, args)
    }
}
