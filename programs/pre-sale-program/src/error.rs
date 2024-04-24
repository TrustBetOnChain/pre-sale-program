use anchor_lang::prelude::*;

#[error_code]
pub enum PreSaleProgramError {
    #[msg("Vault mint is invalid")]
    InvalidVaultMint,
    #[msg("Invalid payer token account")]
    InvalidTokenAccount,
    #[msg("Provided price feed account is invalid")]
    InvalidPriceFeed,
    #[msg("Invalid Chainlink program account")]
    InvalidChainlinkProgram,
    #[msg("Invalid chainlink_feed account or payer_mint and chainlink_feed don't match")]
    InvalidChainlinkFeed,
    #[msg("Math operation overflow")]
    MathOverflow,
    #[msg("Payer value is less than minimal")]
    LessThanMinimalValue,
    #[msg("Collected funds account invalid")]
    IvalidCollectedFundsAccount,
    #[msg("Amount of purchase is bigger than the amount in the treasury")]
    InsufficientVaultBalance,
    #[msg("Error occurred while converting mints")]
    ConversionError,
    #[msg("Pre-sale campaign has not ended")]
    PreSaleStillOn,
    #[msg("Pre-sale campaign ended")]
    PreSaleEnded,
}
