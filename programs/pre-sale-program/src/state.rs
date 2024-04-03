use anchor_lang::prelude::*;

#[account]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub collected_funds_account: Pubkey,
    pub chainlink_program: Pubkey,
    pub has_presale_ended: bool,
    pub usd_price: u64,
    pub usd_decimals: u8,
    pub feeds: Vec<PriceFeedInfo>,
}

impl ProgramConfig {
    pub const BASE_LEN: usize = 8 + 32 + 32 + 32 + 1 + 8 + 1;

    pub fn get_len(mints_len: usize) -> usize {
        let mints_size = mints_len * PriceFeedInfo::get_len();
        Self::BASE_LEN + 4 + mints_size
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct PriceFeedInfo {
    pub asset: Pubkey,
    pub data_feed: Pubkey,
}

impl PriceFeedInfo {
    pub const LEN: usize = 32 * 2;

    pub fn get_len() -> usize {
        Self::LEN
    }
}
