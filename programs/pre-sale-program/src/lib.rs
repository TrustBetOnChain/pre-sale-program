use anchor_lang::prelude::*;

mod instructions;
use instructions::*;

mod state;

declare_id!("5Y8A7Z6G98zukZcUfWcFfGz29Eh3N8bPPuKXbXuH5534");

pub mod constants {
    pub const CONFIG_SEED: &[u8] = b"config";
    pub const TOKEN_VAULT_SEED: &[u8] = b"token_vault";
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

    // set mint token accounts
    // buy =  transfer from transfer to
    // withdraw once presale ended
}
