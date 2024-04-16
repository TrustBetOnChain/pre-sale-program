use anchor_lang::{ prelude::*, solana_program::{ self, system_instruction } };
use anchor_spl::token::{
    self,
    transfer,
    Mint,
    Token,
    TokenAccount,
    Transfer,
    spl_token::native_mint,
};

use crate::{ constants, error::*, state::*, utils };
use chainlink_solana as chainlink;
use rust_decimal::prelude::ToPrimitive;

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct BuyTokensArgs {
    pub amount: u64,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(seeds = [constants::CONFIG_SEED], bump)]
    pub program_config: Box<Account<'info, ProgramConfig>>,

    #[account(mut, seeds = [constants::VAULT_SEED], bump)]
    pub vault_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        seeds = [constants::USER_VAULT_SEED, signer.key().as_ref()],
        bump,
        payer = signer,
        token::mint = vault_mint,
        token::authority = user_vault_account
    )]
    pub user_vault_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = payer_mint,
        associated_token::authority = signer,
    )]
    pub payer_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = payer_mint.key(),
        associated_token::authority = program_config.collected_funds_account
    )]
    pub collected_funds_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = vault_mint.key() == vault_account.mint @ PreSaleProgramError::InvalidVaultMint,
    )]
    pub vault_mint: Account<'info, Mint>,

    #[account()]
    pub payer_mint: Account<'info, Mint>,

    /// CHECK: We're reading data from this specified chainlink feed
    #[account(
        constraint = program_config.feeds
            .iter()
            .any(|feed| feed.asset == payer_mint.key() && feed.data_feed == chainlink_feed.key()) @ PreSaleProgramError::InvalidChainlinkFeed
    )]
    pub chainlink_feed: AccountInfo<'info>,
    #[account(
        constraint = chainlink_program.key() == program_config.chainlink_program @ PreSaleProgramError::InvalidChainlinkProgram
    )]
    /// CHECK: This is the Chainlink program library
    pub chainlink_program: AccountInfo<'info>,

    #[account(
        mut,
        constraint = collected_funds_account.key() == program_config.collected_funds_account @ PreSaleProgramError::IvalidCollectedFundsAccount
    )]
    /// CHECK: This account is used when transfering native SOL instead of WSOL
    pub collected_funds_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_tokens(ctx: Context<BuyTokens>, args: BuyTokensArgs) -> Result<()> {
    let amount = args.amount;
    let payer_decimals = ctx.accounts.payer_mint.decimals;
    let usd_decimals = ctx.accounts.program_config.usd_decimals;
    let usd_price = ctx.accounts.program_config.usd_price;
    let vault_mint_decimals = ctx.accounts.vault_mint.decimals;
    let payer_token_account = &mut ctx.accounts.payer_token_account;
    let payer_mint = &mut ctx.accounts.payer_mint;
    let collector_token_account = &mut ctx.accounts.collected_funds_token_account;
    let signer = &mut ctx.accounts.signer;
    let collector_account = &mut ctx.accounts.collected_funds_account;
    let token_program = &mut ctx.accounts.token_program;
    let vault_account: &Box<Account<'_, TokenAccount>> = &ctx.accounts.vault_account;
    let user_vault_account = &ctx.accounts.user_vault_account;

    if amount > vault_account.amount {
        return Err(PreSaleProgramError::InsufficientVaultBalance.into());
    }

    let round = chainlink::latest_round_data(
        ctx.accounts.chainlink_program.to_account_info(),
        ctx.accounts.chainlink_feed.to_account_info()
    )?;

    let feed_decimals = chainlink::decimals(
        ctx.accounts.chainlink_program.to_account_info(),
        ctx.accounts.chainlink_feed.to_account_info()
    )?;

    let d_payer_mint_amount = utils::convert_mint(
        amount,
        vault_mint_decimals,
        usd_price,
        usd_decimals,
        round.answer as u64,
        feed_decimals,
        payer_decimals
    );

    let payer_mint_amount = d_payer_mint_amount.to_u64().unwrap();

    if payer_mint_amount <= 0 {
        return Err(PreSaleProgramError::LessThanMinimalValue.into());
    }

    if payer_mint.key() == native_mint::id() {
        let transfer_instruction = system_instruction::transfer(
            signer.key,
            collector_account.key,
            payer_mint_amount
        );

        anchor_lang::solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                signer.to_account_info(),
                collector_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[]
        )?;
    } else {
        let cpi_accounts = Transfer {
            from: payer_token_account.to_account_info().clone(),
            to: collector_token_account.to_account_info().clone(),
            authority: signer.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();

        token::transfer(CpiContext::new(cpi_program, cpi_accounts), payer_mint_amount)?;
    }

    let bump = ctx.bumps.vault_account;
    let signer: &[&[&[u8]]] = &[&[constants::VAULT_SEED, &[bump]]];

    let cpi_accounts = Transfer {
        from: vault_account.to_account_info().clone(),
        to: user_vault_account.to_account_info().clone(),
        authority: vault_account.to_account_info().clone(),
    };
    let cpi_program = token_program.to_account_info();

    token::transfer(CpiContext::new_with_signer(cpi_program, cpi_accounts, signer), amount)?;

    Ok(())
}
