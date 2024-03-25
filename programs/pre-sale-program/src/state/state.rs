use anchor_lang::prelude::*;

#[account]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub collected_funds_account: Pubkey,
    pub has_presale_ended: bool,
    pub prices: Vec<MintPrice>,
}

impl ProgramConfig {
    pub const BASE_LEN: usize = 8 + 32 + 32 + 1;

    pub fn get_len(mints_len: usize) -> usize {
        let mints_size = mints_len * MintPrice::get_len();
        Self::BASE_LEN + 4 + mints_size
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct MintPrice {
    pub pubkey: Pubkey,
    pub price: u64,
}

impl MintPrice {
    pub const LEN: usize = 32 + 8;

    pub fn get_len() -> usize {
        Self::LEN
    }
}
