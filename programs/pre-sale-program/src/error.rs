use anchor_lang::prelude::*;

#[error_code]
pub enum PreSaleProgramError {
    #[msg("Vault mint is invalid")]
    InvalidVaultMint,
    #[msg("Invalid payer token account")]
    InvalidPayerTokenAccount,
    #[msg("Token amount should be greater than 0")]
    InvalidTokenAmount,
    #[msg("Provided price feed account is invalid")]
    InvalidPriceFeed,
    #[msg("Invalid Chainlink program account")]
    InvalidChainlinkProgram,
    #[msg("Invalid chainlink_feed account or payer_mint and chainlink_feed don't match")]
    InvalidChainlinkFeed,
    #[msg("Math operation overflow")]
    MathOverflow,
}
