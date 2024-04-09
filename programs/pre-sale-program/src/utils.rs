use anchor_lang::solana_program::msg;
use rust_decimal::prelude::*;

pub fn to_decimal(value: u64, decimals: u8) -> Option<Decimal> {
    let decimal = Decimal::from(value).checked_div(Decimal::from((10u64).pow(decimals as u32)));

    decimal
}

pub fn convert_mint(
    from_amount: u64,
    from_decimals: u8,
    from_price: u64,
    from_price_decimals: u8,
    feed_value: u64,
    feed_decimals: u8,
    to_decimals: u8
) -> u64 {
    let d_feed_value = to_decimal(feed_value, feed_decimals).unwrap();
    msg!("d_feed_value {}", d_feed_value);
    let d_from_amount = to_decimal(from_amount, from_decimals).unwrap();
    msg!("d_from_amount {}", d_from_amount);
    let d_from_price = to_decimal(from_price, from_price_decimals).unwrap();
    msg!("d_from_price {}", d_from_price);
    let d_usd_amount = d_from_price.checked_mul(d_from_amount).unwrap();
    msg!("d_usd_amount {}", d_usd_amount);
    let d_to_amount = d_usd_amount.checked_div(d_feed_value).unwrap();
    msg!("d_to_amount {}", d_to_amount);
    let d_lamports_in_to = Decimal::from((10u64).pow(to_decimals as u32));
    msg!("d_lamports_in_to {}", d_lamports_in_to);
    let d_to_amount = d_to_amount.checked_mul(d_lamports_in_to).unwrap();
    msg!("d_to_amount {}", d_to_amount);
    d_to_amount.to_u64().unwrap()
}
