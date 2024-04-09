#[cfg(test)]
mod tests {
    use crate::utils::convert_mint;

    #[test]
    fn test_convert_mint() {
        // Test case 1: Nominal case
        assert_eq!(convert_mint(1780_041579, 6, 10, 2, 178_00415790, 8, 9), 1_000000000);
        // Test case 2: Nominal case
        assert_eq!(convert_mint(1000_000000000, 9, 25, 2, 1_00000000, 8, 6), 250_000000);
        // Test case 3: Zero from_amount
        assert_eq!(convert_mint(0, 6, 10, 2, 178_00415790, 8, 9), 0);
        // Test case 4: Zero from_price
        assert_eq!(convert_mint(1780_041579, 6, 0, 2, 178_00415790, 8, 9), 0);

        // Test case 5: Zero feed_value
        // assert_eq!(convert_mint(1780_041579, 6, 10, 2, 0, 8, 9), 0);

        // // Test case 6: Large values (overflow test)
        // assert_eq!(convert_mint(u64::MAX, 6, u64::MAX, 2, u64::MAX, 8, 9), 18_014398509481984);

        // // Test case 7: Small values (underflow test)
        // assert_eq!(convert_mint(1, 6, 1, 2, 1, 8, 9), 0);

        // Test case 8: Different decimals (overflow test)
        // assert_eq!(convert_mint(u64::MAX, 38, u64::MAX, 2, u64::MAX, 8, 6), 9_223372036854775807);
        // Test case 9: Different decimals (underflow test)
        // assert_eq!(convert_mint(1, 0, 1, 38, 1, 8, 6), 0);
    }
}
