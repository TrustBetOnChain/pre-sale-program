use anchor_lang::prelude::*;

mod instructions;
use instructions::*;

mod state;

mod error;
mod utils;

#[cfg(test)]
mod tests;

declare_id!("766iB3MufKxoStQRGHRs4CHToTMEkBTRYNeRoRcSR3LH");

pub mod constants {
    pub const CONFIG_SEED: &[u8] = b"config";
    pub const VAULT_SEED: &[u8] = b"vault";
    pub const USER_VAULT_SEED: &[u8] = b"user_vault";
    pub const USER_INFO_SEED: &[u8] = b"user_info";
}

#[program]
pub mod pre_sale_program {
    use state::DataFeed;

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

    pub fn get_token_amount(
        ctx: Context<GetPayerTokenAmount>,
        args: GetTokenAmountArgs
    ) -> Result<u64> {
        instructions::get_payer_token_amount(ctx, args)
    }

    pub fn buy_tokens(ctx: Context<BuyTokens>, args: BuyTokensArgs) -> Result<()> {
        instructions::buy_tokens(ctx, args)
    }

    pub fn claim_tokens(ctx: Context<ClaimTokens>) -> Result<()> {
        instructions::claim_tokens(ctx)
    }

    pub fn withdraw_tokens(ctx: Context<WithdrawTokens>) -> Result<()> {
        instructions::withdraw_tokens(ctx)
    }

    pub fn get_data_feed(ctx: Context<GetDataFeed>) -> Result<DataFeed> {
        instructions::get_data_feed(ctx)
    }
}
