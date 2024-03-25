use anchor_lang::prelude::*;

#[account]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub mints: Vec<Mint>,
    pub has_presale_ended: bool,
}

impl ProgramConfig {}

impl ProgramConfig {
    pub const BASE_LEN: usize = 8 + 32 + 1;

    pub fn get_len(mints_len: usize) -> usize {
        let mints_size = mints_len * Mint::get_len();
        Self::BASE_LEN + 4 + mints_size
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Mint {
    pub pubkey: Pubkey,
    pub price: u64,
}

impl Mint {
    pub const LEN: usize = 32 + 8;

    pub fn get_len() -> usize {
        Self::LEN
    }
}
