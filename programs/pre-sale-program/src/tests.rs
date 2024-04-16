#[cfg(test)]
mod tests {
    use rust_decimal::prelude::ToPrimitive;

    use crate::utils::convert_mint;

    #[test]
    fn test_convert_mint() {
        let sol_feed_price: u64 = 178_00415790;
        let sol_decimals = 9;
        let usdt_feed_price = 1_00000000;
        let usdt_decimals = 6;
        let weth_feed_price: u64 = 3456_12345678;
        let weth_decimals = 8;
        let btc_feed_price: u64 = 68284_87654321;
        let wbtc_decimals = 8;
        let feed_decimals: u8 = 8;

        assert_eq!(
            convert_mint(1780_041579, 6, 10, 2, sol_feed_price, feed_decimals, sol_decimals)
                .to_u64()
                .unwrap(),
            1 * (10u64).pow(sol_decimals as u32),
            "Test case: Nominal case with SOL"
        );

        assert_eq!(
            convert_mint(
                1 * (10u64).pow(6),
                6,
                10,
                2,
                weth_feed_price,
                feed_decimals,
                weth_decimals
            )
                .to_u64()
                .unwrap(),
            2893,
            "Test case: Nominal case with ETH"
        );

        assert_eq!(
            convert_mint(
                10_000 * (10u64).pow(9),
                9,
                20,
                2,
                btc_feed_price,
                feed_decimals,
                wbtc_decimals
            )
                .to_u128()
                .unwrap(),
            2928906,
            "Test case: Nominal case with BTC"
        );

        assert_eq!(
            convert_mint(
                1000 * (10u64).pow(9),
                9,
                25,
                2,
                usdt_feed_price,
                feed_decimals,
                usdt_decimals
            )
                .to_u64()
                .unwrap(),
            250 * (10u64).pow(usdt_decimals as u32),
            "Test case: Nominal case with USDT"
        );

        assert_eq!(
            convert_mint(
                1_000_000_000 * (10u64).pow(9),
                9,
                10,
                2,
                sol_feed_price,
                feed_decimals,
                sol_decimals
            )
                .to_u64()
                .unwrap(),
            561784_630088126,
            "Test case: Big amount of coins with SOL"
        );

        assert_eq!(
            convert_mint(
                10_000_000_000 * (10u64).pow(9),
                9,
                1,
                2,
                weth_feed_price,
                feed_decimals,
                weth_decimals
            )
                .to_u64()
                .unwrap(),
            28934_15158646,
            "Test case: Big amount of coins with ETH"
        );

        assert_eq!(
            convert_mint(
                10_000_000_000 * (10u64).pow(9),
                9,
                1,
                2,
                btc_feed_price,
                feed_decimals,
                wbtc_decimals
            )
                .to_u128()
                .unwrap(),
            1464_45311264,
            "Test case: Big amount of coins with BTC"
        );

        assert_eq!(
            convert_mint(
                1_000_000_000 * (10u64).pow(9),
                9,
                20,
                2,
                usdt_feed_price,
                feed_decimals,
                usdt_decimals
            )
                .to_u64()
                .unwrap(),
            200_000_000 * (10u64).pow(usdt_decimals as u32),
            "Test case: Big amount of coins with USDT"
        );

        assert_eq!(
            convert_mint(
                1, // 1 lamport
                6,
                100,
                2,
                5_000_000 * (10u64).pow(feed_decimals as u32),
                feed_decimals,
                12
            )
                .to_u64()
                .unwrap(),
            0,
            "Test case: Price is less that 1 lamport of to token"
        );

        assert_eq!(
            convert_mint(
                1, // 1 lamport
                9,
                100,
                2,
                1 * (10u64).pow(feed_decimals as u32),
                feed_decimals,
                8
            )
                .to_u64()
                .unwrap(),
            0,
            "Test case: Minimal dust of from token more than minimal of to token"
        );

        assert_eq!(
            convert_mint(0, 6, 10, 2, sol_feed_price, feed_decimals, 9).to_u64().unwrap(),
            0,
            "Test case: Zero from_amount"
        );
    }
}
