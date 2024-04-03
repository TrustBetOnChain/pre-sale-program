use std::ops::{ Div, Mul };

pub fn convert_to_float(value: u64, decimals: u8) -> f32 {
    (value as f32).div(f32::powf(10.0, decimals as f32))
}

pub fn convert_from_float(value: f32, decimals: u8) -> u64 {
    value.mul(f32::powf(10.0, decimals as f32)) as u64
}

pub fn calculate_token_amount(
    feed_value: u64,
    feed_decimals: u8,
    payer_mint_amount: u64,
    payer_decimals: u8,
    usd_price: u64,
    usd_decimals: u8,
    vault_mint_decimals: u8
) -> u64 {
    let f_feed_value = convert_to_float(feed_value as u64, feed_decimals);
    let f_payer_token_amount = convert_to_float(payer_mint_amount, payer_decimals);
    let f_payer_usd_amount = f_feed_value.mul(f_payer_token_amount);
    let f_usd_price = convert_to_float(usd_price, usd_decimals);
    let f_vault_mint_amount = f_payer_usd_amount.div(f_usd_price);

    let token_amount = convert_from_float(f_vault_mint_amount, vault_mint_decimals);

    token_amount
}
