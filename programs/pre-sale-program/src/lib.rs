use anchor_lang::prelude::*;

mod instructions;
use instructions::*;

mod state;

declare_id!("5Y8A7Z6G98zukZcUfWcFfGz29Eh3N8bPPuKXbXuH5534");

pub mod constants {
    pub const SEED_PROGRAM_CONFIG: &[u8] = b"program_config";
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
}
