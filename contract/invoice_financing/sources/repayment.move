module invoice_financing::repayment;

use invoice_financing::invoice::{Self, Invoice, set_status, buyer};
use invoice_financing::escrow::{Self, BuyerEscrow};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use std::option;

#[error]
const E_INVOICE_NOT_FINANCED: vector<u8> = b"Invoice must be in Financed status (2)";

#[error]
const E_NOT_BUYER: vector<u8> = b"Only buyer can repay the invoice";

#[error]
const E_INSUFFICIENT_PAYMENT: vector<u8> = b"Payment amount is insufficient";

#[error]
const E_NO_INVESTOR: vector<u8> = b"Invoice has no investor";

const DIVISOR: u64 = 10_000;

/// Repay an invoice
/// Buyer pays full invoice amount, investor receives (amount - take_rate_fee - settlement_fee)
public entry fun repay_invoice(
    invoice: &mut Invoice,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();
    let invoice_status = invoice::status(invoice);
    let invoice_buyer = buyer(invoice);
    let invoice_amount = invoice::amount(invoice);

    // Validations
    assert!(invoice_status == 2, E_INVOICE_NOT_FINANCED);
    assert!(sender == invoice_buyer, E_NOT_BUYER);

    let payment_amount = payment.value();
    assert!(payment_amount >= invoice_amount, E_INSUFFICIENT_PAYMENT);

    // Get financing details
    let investor_option = invoice::investor(invoice);
    assert!(option::is_some(&investor_option), E_NO_INVESTOR);
    let investor = *option::borrow(&investor_option);

    let discount_bps = invoice::discount_bps(invoice);
    let fee_bps = invoice::fee_bps(invoice);

    // Calculate fees at settlement
    let discount_amount = (invoice_amount * discount_bps) / DIVISOR;
    let take_rate_fee = (discount_amount * fee_bps) / DIVISOR;

    // Settlement fee: 0.01 SUI = 10_000_000 MIST
    let settlement_fee = 10_000_000u64;

    // Total platform fees at settlement
    let total_platform_fees = take_rate_fee + settlement_fee;

    // Investor receives: full payment - platform fees
    let investor_amount = invoice_amount - total_platform_fees;

    // Split payment
    let platform_fees_coin = payment.split(total_platform_fees, ctx);
    let investor_coin = payment.split(investor_amount, ctx);

    // Return overpayment
    if (payment.value() > 0) {
        transfer::public_transfer(payment, sender);
    } else {
        payment.destroy_zero();
    };

    // Update invoice status to Paid (3)
    set_status(invoice, 3);

    // Transfer payments
    // Platform fees go to supplier (TODO: Use platform treasury)
    let supplier = invoice::supplier(invoice);
    transfer::public_transfer(platform_fees_coin, supplier);

    // Investor receives their return
    transfer::public_transfer(investor_coin, investor);

    // Note: Escrow is released separately via release_escrow function
}

/// Release escrow back to buyer after successful repayment
public entry fun release_escrow(
    invoice: &Invoice,
    buyer_escrow: &mut BuyerEscrow,
    ctx: &mut TxContext,
) {
    let invoice_status = invoice::status(invoice);
    let invoice_buyer = buyer(invoice);

    // Only release if invoice is paid
    assert!(invoice_status == 3, E_INVOICE_NOT_FINANCED);
    assert!(ctx.sender() == invoice_buyer, E_NOT_BUYER);

    // Extract escrow balance and transfer to buyer
    let escrow_balance_ref = escrow::escrow_balance_mut(buyer_escrow);
    let escrow_balance = sui::balance::withdraw_all(escrow_balance_ref);
    let escrow_coin = coin::from_balance(escrow_balance, ctx);

    transfer::public_transfer(escrow_coin, invoice_buyer);
}
