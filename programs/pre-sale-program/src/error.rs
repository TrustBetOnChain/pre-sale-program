use anchor_lang::prelude::*;

#[error_code]
pub enum PreSaleProgramError {
    #[msg("Vault mint is invalid")]
    InvalidVaultMint,
    #[msg("Token amount should be greater than 0")]
    InvalidTokenAmount,
    #[msg("Provided price feed account is invalid")]
    InvalidPriceFeed,
    #[msg("Invalid Chainlink program account")]
    InvalidChainlinkProgram,
    #[msg("Math operation overflow")]
    MathOverflow,
}
