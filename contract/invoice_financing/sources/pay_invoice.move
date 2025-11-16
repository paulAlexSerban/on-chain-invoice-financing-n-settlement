module invoice_financing::pay_invoice;

use invoice_financing::invoice::Invoice;
use invoice_financing::escrow::BuyerEscrow;
use sui::sui::SUI;
use sui::coin::{Coin, split};
use invoice_financing::invoice;
use invoice_financing::escrow;
use invoice_financing::invoice_financing::Funding;
use invoice_financing::invoice_financing;
use invoice_financing::treasury::{Treasury, deposit_fee};
use invoice_financing::treasury;

#[error]
const E_NOT_BUYER: vector<u8> = b"Only the buyer can pay the invoice.";

#[error]
const E_CANNOT_PAY_INVOICE: vector<u8> = b"Invoice already paid or defaulted.";

// payment = invoice amount (without discount) + discount (without fee) + treasury fee (taken out of the discount)
//                                     FUNDER                                               TREASURY
entry fun pay_invoice(
    invoice: &mut Invoice,
    buyer_escrow: &mut BuyerEscrow,
    funding: &Funding,
    treasury: &mut Treasury,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    // Only the buyer can pay
    assert!(invoice::buyer(invoice) == ctx.sender(), E_NOT_BUYER);

    // Check invoice is not already paid or defaulted
    assert!(invoice::status(invoice) != 3 && invoice::status(invoice) != 4, E_CANNOT_PAY_INVOICE);

    // Split the payment amount from the coin
    let treasury_fee_payment = split(&mut payment, (invoice::amount(invoice) * invoice::discount_bps(invoice) * treasury::treasury_fee_bps(treasury)) / 100_000_000, ctx);

    // Transfer payment to the supplier
    deposit_fee(treasury, treasury_fee_payment);
    transfer::public_transfer(payment, invoice_financing::funder(funding));

    escrow::payback_escrow(buyer_escrow, ctx);    
    // Mark invoice as paid
    invoice::set_status(invoice, 3);
}