module invoice_financing::financing;

use invoice_financing::invoice::{Self, Invoice, set_status, set_financing_details};
use sui::coin::Coin;
use sui::sui::SUI;

#[error]
const E_INVOICE_NOT_READY: vector<u8> = b"Invoice must be in Ready status (1) to be financed";

#[error]
const E_INSUFFICIENT_PAYMENT: vector<u8> = b"Payment amount is insufficient";

#[error]
const E_INVALID_DISCOUNT: vector<u8> = b"Discount rate exceeds maximum allowed";

const DIVISOR: u64 = 10_000;
const MAX_DISCOUNT_BPS: u64 = 5000; // 50% max

/// Finance an invoice
/// Investor pays (invoice_amount - discount), supplier receives (investor_payment - origination_fee)
public entry fun finance_invoice(
    invoice: &mut Invoice,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext,
) {
    // Get invoice details using getter functions
    let invoice_amount = invoice::amount(invoice);
    let invoice_status = invoice::status(invoice);
    let supplier = invoice::supplier(invoice);
    let discount_bps = invoice::discount_bps(invoice);
    let fee_bps = invoice::fee_bps(invoice);

    // Validations
    assert!(invoice_status == 1, E_INVOICE_NOT_READY); // Must be Ready
    assert!(discount_bps <= MAX_DISCOUNT_BPS, E_INVALID_DISCOUNT);

    let payment_amount = payment.value();

    // Calculate amounts
    let discount_amount = (invoice_amount * discount_bps) / DIVISOR;
    let expected_payment = invoice_amount - discount_amount;

    assert!(payment_amount >= expected_payment, E_INSUFFICIENT_PAYMENT);

    // Calculate origination fee on what investor pays
    let origination_fee = (expected_payment * fee_bps) / DIVISOR;

    // Supplier receives: investor payment - origination fee
    let supplier_amount = expected_payment - origination_fee;

    // Split payment
    let origination_fee_coin = payment.split(origination_fee, ctx);
    let supplier_coin = payment.split(supplier_amount, ctx);

    // Return any overpayment to investor
    if (payment.value() > 0) {
        transfer::public_transfer(payment, ctx.sender());
    } else {
        payment.destroy_zero();
    };

    // Store financing details in invoice
    set_financing_details(
        invoice,
        ctx.sender(), // investor
        expected_payment,
        supplier_amount,
        origination_fee
    );

    // Update invoice status to Financed (2)
    set_status(invoice, 2);

    // Transfer supplier payment immediately
    transfer::public_transfer(supplier_coin, supplier);

    // Transfer origination fee to platform treasury (for now, to supplier)
    // TODO: Use actual platform treasury address
    transfer::public_transfer(origination_fee_coin, supplier);
}
