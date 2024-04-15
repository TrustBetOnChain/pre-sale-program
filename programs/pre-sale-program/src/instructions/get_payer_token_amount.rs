use anchor_lang::prelude::*;

use anchor_spl::token::Mint;
use chainlink_solana as chainlink;

use crate::{ constants, error::PreSaleProgramError, state::ProgramConfig, utils };
use rust_decimal::prelude::ToPrimitive;

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct GetTokenAmountArgs {
    pub amount: u64,
}

#[derive(Accounts)]
pub struct GetPayerTokenAmount<'info> {
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

pub fn get_payer_token_amount(
    ctx: Context<GetPayerTokenAmount>,
    args: GetTokenAmountArgs
) -> Result<u64> {
    let amount = args.amount;
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

    let d_payer_mint_amount = utils::convert_mint(
        amount,
        vault_mint_decimals,
        usd_price,
        usd_decimals,
        round.answer as u64,
        feed_decimals,
        payer_decimals
    );

    let payer_mint_amount = d_payer_mint_amount.to_u64().unwrap();

    if payer_mint_amount <= 0 {
        return Err(PreSaleProgramError::LessThanMinimalValue.into());
    }

    Ok(payer_mint_amount)
}
