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
) -> Decimal {
    let d_feed_value = to_decimal(feed_value, feed_decimals).unwrap();
    let d_from_amount = to_decimal(from_amount, from_decimals).unwrap();
    let d_from_price = to_decimal(from_price, from_price_decimals).unwrap();
    let d_usd_amount = d_from_price.checked_mul(d_from_amount).unwrap();
    let d_to_amount = d_usd_amount.checked_div(d_feed_value).unwrap();
    let d_lamports_in_to = Decimal::from((10u64).pow(to_decimals as u32));
    let d_to_amount = d_to_amount.checked_mul(d_lamports_in_to).unwrap();

    d_to_amount
}
