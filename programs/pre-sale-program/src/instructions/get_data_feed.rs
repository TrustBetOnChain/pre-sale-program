use anchor_lang::prelude::*;

use chainlink_solana as chainlink;

use crate::state::DataFeed;

#[derive(Accounts)]
pub struct GetDataFeed<'info> {
    /// CHECK: We're reading data from this specified chainlink feed
    pub chainlink_feed: AccountInfo<'info>,
    /// CHECK: This is the Chainlink program library
    pub chainlink_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn get_data_feed(ctx: Context<GetDataFeed>) -> Result<DataFeed> {
    let round = chainlink::latest_round_data(
        ctx.accounts.chainlink_program.to_account_info(),
        ctx.accounts.chainlink_feed.to_account_info()
    )?;

    let description = chainlink::description(
        ctx.accounts.chainlink_program.to_account_info(),
        ctx.accounts.chainlink_feed.to_account_info()
    )?;

    let decimals = chainlink::decimals(
        ctx.accounts.chainlink_program.to_account_info(),
        ctx.accounts.chainlink_feed.to_account_info()
    )?;

    Ok(DataFeed { description, decimals, value: round.answer })
}
