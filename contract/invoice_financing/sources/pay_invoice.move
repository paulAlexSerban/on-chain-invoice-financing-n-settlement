module invoice_financing::pay_invoice;

use invoice_financing::invoice::{Self, Invoice};
use invoice_financing::escrow::BuyerEscrow;
use sui::sui::SUI;
use sui::coin::{Self, Coin};

#[error]
const E_NOT_BUYER: vector<u8> = b"Only the buyer can pay the invoice.";

#[error]
const E_ALREADY_PAID_OR_DEFAULTED: vector<u8> = b"Invoice already paid or defaulted.";

// payment = invoice amount (without discount) + discount (without fee) + treasury fee (taken out of the discount)
//                                     FUNDER                                               TREASURY
public fun pay_invoice(
    invoice: &mut Invoice,
    _escrow: &mut BuyerEscrow,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    // Only the buyer can pay
    assert!(invoice::buyer(invoice) == ctx.sender(), E_NOT_BUYER);

    // Check invoice is not already paid or defaulted
    let current_status = invoice::status(invoice);
    assert!(current_status != 3 && current_status != 4, E_ALREADY_PAID_OR_DEFAULTED);

    // Get invoice details
    let invoice_amount = invoice::amount(invoice);
    let discount_bps = invoice::discount_bps(invoice);
    let discount_amount = (invoice_amount * discount_bps) / 10_000;
    
    // Split payments: invoice amount to supplier, discount to investor, remainder (fee) stays in payment
    let supplier_payment = coin::split(&mut payment, invoice_amount, ctx);
    let investor_payment = coin::split(&mut payment, discount_amount, ctx);

    // Transfer invoice amount to the supplier
    transfer::public_transfer(supplier_payment, invoice::supplier(invoice));
    
    // Transfer discount to the investor (if exists)
    let investor_opt = invoice::investor(invoice);
    if (option::is_some(&investor_opt)) {
        transfer::public_transfer(investor_payment, *option::borrow(&investor_opt));
    } else {
        // If no investor, send discount back to buyer or destroy
        transfer::public_transfer(investor_payment, ctx.sender());
    };
    
    // Transfer remaining (treasury fee) to buyer for now (TODO: send to treasury)
    transfer::public_transfer(payment, ctx.sender());

    // Mark invoice as paid
    invoice::set_status(invoice, 3);
}
