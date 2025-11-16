module invoice_financing::treasury;

use sui::balance::{Balance, zero, split, join};
use sui::sui::SUI;
use sui::coin::from_balance;
use sui::coin::Coin;
use sui::coin::into_balance;

#[error]
const E_NOT_TREASURY_OWNER: vector<u8> = b"Only owner is able to withdraw funds from the treasury.";

public struct Treasury has key, store {
    id: UID,
    owner: address,
    fee_bps: u64,
    balance: Balance<SUI>
}

// GETTERS

public fun owner(treasury: &Treasury): address {
    treasury.owner
}

public fun treasury_fee_bps(treasury: &Treasury): u64 {
    treasury.fee_bps
}

public fun create_treasury(owner: address, fee_bps: u64, ctx: &mut TxContext): Treasury {
    Treasury {
        id: object::new(ctx),
        owner,
        fee_bps,
        balance: zero<SUI>(),
    }
}

public fun set_fee_bps(treasury: &mut Treasury, caller: address, new_fee_bps: u64) {
    assert!(treasury.owner == caller, E_NOT_TREASURY_OWNER);
    treasury.fee_bps = new_fee_bps;
}

public fun deposit_fee(treasury: &mut Treasury, coin: Coin<SUI>) {
    let fee_balance = into_balance(coin);
    join(&mut treasury.balance, fee_balance);
}

entry fun withdraw(
    treasury: &mut Treasury,
    amount: u64,
    ctx: &mut TxContext
) {
    assert!(treasury.owner == ctx.sender(), E_NOT_TREASURY_OWNER);
    let withdraw_balance = split(&mut treasury.balance, amount);
    transfer::public_transfer(from_balance(withdraw_balance, ctx), treasury.owner);
}