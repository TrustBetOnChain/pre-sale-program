use anchor_lang::prelude::*;

use anchor_spl::token::Mint;
use chainlink_solana as chainlink;

use crate::{ constants, state::ProgramConfig, utils };

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct GetTokenAmountArgs {
    pub payer_mint_amount: u64,
}

#[derive(Accounts)]
pub struct GetTokenAmount<'info> {
    #[account(seeds = [constants::CONFIG_SEED], bump)]
    pub program_config: Account<'info, ProgramConfig>,
    #[account()]
    pub vault_mint: Account<'info, Mint>,
    #[account()]
    pub payer_mint: Account<'info, Mint>,
    /// CHECK: We're reading data from this specified chainlink feed
    pub chainlink_feed: AccountInfo<'info>,
    /// CHECK: This is the Chainlink program library
    pub chainlink_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn get_token_amount(ctx: Context<GetTokenAmount>, args: GetTokenAmountArgs) -> Result<u64> {
    let payer_mint_amount = args.payer_mint_amount;
    let payer_decimals = ctx.accounts.payer_mint.decimals;
    let usd_decimals = ctx.accounts.program_config.usd_decimals;
    let usd_price = ctx.accounts.program_config.usd_price;
    let vault_mint_decimals = ctx.accounts.vault_mint.decimals;

    let round = chainlink::latest_round_data(
        ctx.accounts.chainlink_program.to_account_info(),
        ctx.accounts.chainlink_feed.to_account_info()
    )?;

    let feed_decimals = chainlink::decimals(
        ctx.accounts.chainlink_program.to_account_info(),
        ctx.accounts.chainlink_feed.to_account_info()
    )?;

    let mint_amount = utils::calculate_token_amount(
        round.answer as u64,
        feed_decimals,
        payer_mint_amount,
        payer_decimals,
        usd_price,
        usd_decimals,
        vault_mint_decimals
    );

    Ok(mint_amount)
}
