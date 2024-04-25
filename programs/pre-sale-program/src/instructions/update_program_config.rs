use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::CONFIG_SEED;

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct UpdateProgramConfigArgs {
    pub admin: Option<Pubkey>,
    pub feeds: Option<Vec<PriceFeedInfo>>,
    pub has_presale_ended: Option<bool>,
    pub usd_price: Option<u8>,
    pub usd_decimals: Option<u8>,
    pub collected_funds_account: Option<Pubkey>,
    pub chainlink_program: Option<Pubkey>,
    pub available_percentage: Option<u8>,
}

#[derive(Accounts)]
#[instruction(args: UpdateProgramConfigArgs)]
pub struct UpdateProgramConfig<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump,
        realloc = ProgramConfig::get_len(
            args.feeds
                .as_ref()
                .map(|prices| prices.len())
                .unwrap_or(program_config.feeds.len())
        ),
        realloc::payer = admin,
        realloc::zero = false,
    )]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(
        mut,
        address = program_config.admin
    )]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn update_program_config(
    ctx: Context<UpdateProgramConfig>,
    args: UpdateProgramConfigArgs
) -> Result<()> {
    let program_config = &mut ctx.accounts.program_config;

    if let Some(admin) = args.admin {
        program_config.admin = admin;
    }

    if let Some(feeds) = args.feeds {
        program_config.feeds = feeds;
    }

    if let Some(collected_funds_account) = args.collected_funds_account {
        program_config.collected_funds_account = collected_funds_account;
    }

    if let Some(chainlink_program) = args.chainlink_program {
        program_config.chainlink_program = chainlink_program;
    }

    if let Some(usd_price) = args.usd_price {
        program_config.usd_price = usd_price;
    }

    if let Some(usd_decimals) = args.usd_decimals {
        program_config.usd_decimals = usd_decimals;
    }

    if let Some(has_presale_ended) = args.has_presale_ended {
        program_config.has_presale_ended = has_presale_ended;
    }

    if let Some(available_percentage) = args.available_percentage {
        program_config.available_percentage = available_percentage;
    }

    Ok(())
}
