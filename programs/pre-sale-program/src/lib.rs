use anchor_lang::prelude::*;

declare_id!("5Y8A7Z6G98zukZcUfWcFfGz29Eh3N8bPPuKXbXuH5534");

#[program]
pub mod pre_sale_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
