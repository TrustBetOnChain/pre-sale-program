use anchor_lang::prelude::*;

mod instructions;
use instructions::*;

mod state;
use state::DataFeed;

mod error;

declare_id!("5Y8A7Z6G98zukZcUfWcFfGz29Eh3N8bPPuKXbXuH5534");

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

    pub fn buy_tokens(ctx: Context<BuyTokens>, args: BuyTokensArgs) -> Result<()> {
        instructions::buy_tokens(ctx, args)
    }

    pub fn get_data_feed(ctx: Context<GetDataFeed>) -> Result<DataFeed> {
        instructions::get_data_feed(ctx)
    }

    // claim
    // withdraw
}
