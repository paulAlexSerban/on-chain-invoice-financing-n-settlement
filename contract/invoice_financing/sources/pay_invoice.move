module invoice_financing::pay_invoice;

use invoice_financing::invoice::Invoice;
use invoice_financing::escrow::BuyerEscrow;
use sui::sui::SUI;
use sui::coin::Coin;

#[error]
const E_NOT_BUYER: vector<u8> = b"Only the buyer can pay the invoice.";

// payment = invoice amount (without discount) + discount (without fee) + treasury fee (taken out of the discount)
//                                     FUNDER                                               TREASURY
public entry fun pay_invoice(
    invoice: &mut Invoice,
    escrow: &mut BuyerEscrow,
    payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    // Only the buyer can pay
    assert!(invoice.buyer == ctx.sender(), E_NOT_BUYER);

    // Check invoice is not already paid or defaulted
    assert!(invoice.status != 3 && invoice.status != 4, b"Invoice already paid or defaulted.");

    // Split the payment amount from the coin
    let invoice_payment = split(payment, invoice.amount, ctx);
    let discount_payment = split(payment, (invoice.amount * invoice.discount_bps) / 10_000, ctx);

    // Transfer payment to the supplier
    transfer::public_transfer(payment, invoice.supplier);

    // Mark invoice as paid
    invoice.status = 3;
}
