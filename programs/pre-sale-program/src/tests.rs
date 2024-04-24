#[cfg(test)]
mod tests {
    use rust_decimal::{ prelude::ToPrimitive, Decimal };

    use crate::utils::*;

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

    #[test]
    fn test_calculate_claimable_amount() {
        assert_eq!(
            calculate_claimable_amount(1, 1, 23),
            Decimal::new(23, 2),
            "Test case: Stake 10100, Balance 1, Percentage 23"
        );
        assert_eq!(
            calculate_claimable_amount(1, 1, 100),
            Decimal::new(1, 0),
            "Test case: Stake 1, Balance 1, Percentage 100"
        );

        assert_eq!(
            calculate_claimable_amount(1, 1, 99),
            Decimal::new(99, 2),
            "Test case: Stake 1, Balance 1, Percentage 99"
        );

        assert_eq!(
            calculate_claimable_amount(1, 1, 1),
            Decimal::new(1, 2),
            "Test case: Stake 1, Balance 1, Percentage 99"
        );

        assert_eq!(
            calculate_claimable_amount(1, 0, 23),
            Decimal::ZERO,
            "Test case: Stake 1, Balance 0, Percentage 23"
        );

        assert_eq!(
            calculate_claimable_amount(100, 100, 20),
            Decimal::new(20, 0),
            "Test case: Stake 100, Balance 100, Percentage 20"
        );
        assert_eq!(
            calculate_claimable_amount(100, 80, 20),
            Decimal::ZERO,
            "Test case: Stake 100, Balance 80, Percentage 20"
        );
        assert_eq!(
            calculate_claimable_amount(100, 70, 20),
            Decimal::ZERO,
            "Test case: Stake 100, Balance 70, Percentage 20"
        );
        assert_eq!(
            calculate_claimable_amount(500, 500, 50),
            Decimal::new(250, 0),
            "Test case: Stake 500, Balance 500, Percentage 50"
        );
        assert_eq!(
            calculate_claimable_amount(1000, 800, 30),
            Decimal::new(100, 0),
            "Test case: Stake 1000, Balance 800, Percentage 30"
        );

        assert_eq!(
            calculate_claimable_amount(200, 180, 15),
            Decimal::new(10, 0),
            "Test case: Stake 200, Balance 180, Percentage 15"
        );

        assert_eq!(
            calculate_claimable_amount(0, 1000, 50),
            Decimal::new(1000, 0),
            "Test case: Stake 0, Balance 1000, Percentage 50"
        );

        assert_eq!(
            calculate_claimable_amount(1000, 0, 50),
            Decimal::ZERO,
            "Test case: Stake 1000, Balance 0, Percentage 50"
        );
        assert_eq!(
            calculate_claimable_amount(1000, 1000, 0),
            Decimal::ZERO,
            "Test case: Stake 1000, Balance 1000, Percentage 0"
        );
        assert_eq!(
            calculate_claimable_amount(100, 100, 100),
            Decimal::new(100, 0),
            "Test case: Stake 100, Balance 100, Percentage 100"
        );
        assert_eq!(
            calculate_claimable_amount(100, 50, 100),
            Decimal::new(50, 0),
            "Test case: Stake 100, Balance 50, Percentage 100"
        );
        assert_eq!(
            calculate_claimable_amount(100, 200, 100),
            Decimal::new(200, 0),
            "Test case: Stake 100, Balance 200, Percentage 100"
        );

        assert_eq!(
            calculate_claimable_amount(5000, 4000, 10),
            Decimal::ZERO,
            "Test case: Stake 5000, Balance 4000, Percentage 10"
        );
        assert_eq!(
            calculate_claimable_amount(10000_0000000000, 8000_0000000000, 5),
            Decimal::new(0, 0),
            "Test case: Stake 10000_0000000000, Balance 8000_0000000000, Percentage 5"
        );
        assert_eq!(
            calculate_claimable_amount(500, 600, 80),
            Decimal::new(500, 0),
            "Test case: Stake 500, Balance 600, Percentage 80"
        );
        assert_eq!(
            calculate_claimable_amount(1000, 500, 75),
            Decimal::new(250, 0),
            "Test case: Stake 1000, Balance 500, Percentage 75"
        );
    }
}
