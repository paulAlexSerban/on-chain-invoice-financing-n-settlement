module invoice_financing::escrow;

use invoice_financing::invoice::{Invoice, buyer};
use sui::coin::Coin;
use sui::sui::SUI;
use sui::balance::{Balance, zero};
use invoice_financing::invoice::set_status;

#[error]
const E_NOT_BUYER: vector<u8> = b"Caller is not the invoice buyer";

#[error]
const E_INVALID_PAYMENT_AMOUNT: vector<u8> = b"Payment amount does not cover the escrow";

#[error]
const E_WRONG_INVOICE: vector<u8> = b"Escrow does not belong to the specified invoice";

public struct BuyerEscrow has key, store {
    id: UID,
    invoice_id: ID,
    buyer: address,
    escrow_amount: u64,
    paid: bool,
    escrow: Balance<SUI>,
}

// GETTERS

public fun paid(buyer_escrow: &BuyerEscrow): bool {
    buyer_escrow.paid
}

public fun escrow_amount(buyer_escrow: &BuyerEscrow): u64 {
    buyer_escrow.escrow_amount
}


public fun create_escrow_internal(
    invoice_id: ID,
    buyer: address,
    escrow_amount: u64,
    ctx: &mut TxContext,
): BuyerEscrow {
    
    BuyerEscrow {
        id: object::new(ctx),
        invoice_id,
        buyer,
        escrow_amount,
        paid: false,
        escrow: zero<SUI>(),
    }
}

public entry fun pay_escrow(invoice: &mut Invoice, buyer_escrow: &mut BuyerEscrow, payment: Coin<SUI>, ctx: &TxContext) {
    let sender = ctx.sender();

    assert!(
        sender == buyer(invoice),
        E_NOT_BUYER
    );

    assert!(
        buyer_escrow.invoice_id == object::id(invoice),
        E_WRONG_INVOICE
    );

    let payment_amount = payment.balance().value();
    assert!(
        payment_amount == buyer_escrow.escrow_amount,
        E_INVALID_PAYMENT_AMOUNT
    );

    let balance = payment.into_balance();
    sui::balance::join(&mut buyer_escrow.escrow, balance);
    buyer_escrow.paid = true;
    set_status(invoice, 1);
}

/// Get escrow balance (mutable reference for repayment module)
public(package) fun escrow_balance_mut(buyer_escrow: &mut BuyerEscrow): &mut Balance<SUI> {
    &mut buyer_escrow.escrow
}

/// Check if escrow is paid
public fun is_paid(buyer_escrow: &BuyerEscrow): bool {
    buyer_escrow.paid
}

/// Get invoice ID
public fun invoice_id(buyer_escrow: &BuyerEscrow): ID {
    buyer_escrow.invoice_id
}
