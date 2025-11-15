module invoice_financing::invoice_financing;

use invoice_financing::invoice::{Invoice};
use invoice_financing::invoice;
use invoice_financing::escrow::{BuyerEscrow};
use invoice_financing::escrow;
use sui::coin::Coin;
use sui::sui::SUI;

const DIVISOR: u64 = 10_000;

#[error]
const E_WRONG_PAYMENT_AMOUNT: vector<u8> = b"Payment amount does exactly cover the invoice's discounted amount";

#[error]
const E_ESCROW_NOT_PAID: vector<u8> = b"Escrow hasn't been paid";

#[error]
const E_INVOICE_NOT_READY_FOR_FUNDING: vector<u8> = b"The invoice is not ready to be funded";

#[error]
const E_NOT_FUNDER: vector<u8> = b"The sender is not the funder";

#[error]
const E_INVOICE_NOT_FUNDED: vector<u8> = b"The invoice is not funded";

public struct Funding has key, store {
    id: UID,
    invoice_id: ID,
    funder: address,
}

entry fun fund_invoice(invoice: &mut Invoice, buyer_escrow: &BuyerEscrow, payment: Coin<SUI>, ctx: &mut TxContext) {
    let sender = ctx.sender();
    let seller = invoice::supplier(invoice);

    assert!(
        escrow::paid(buyer_escrow),
        E_ESCROW_NOT_PAID
    );

    assert!(
        invoice::status(invoice) == 1,
        E_INVOICE_NOT_READY_FOR_FUNDING
    );

    // calculate the funding amount (total - discount)
    let discount_amount = invoice::amount(invoice) * invoice::discount_bps(invoice) / DIVISOR;

    // todo consider the fee as well 
    let expected_payment_amount = invoice::amount(invoice) - discount_amount;
    // check that the payment amount 
    let payment_amount = payment.balance().value();
    assert!(
        expected_payment_amount == payment_amount,
        E_WRONG_PAYMENT_AMOUNT
    );

    invoice::set_status(invoice, 2); // set status to funded

    // transfer the payment to the supplier
    transfer::public_transfer(payment, seller);

    // create the funding object
    transfer::public_share_object(create_funding_internal(object::id(invoice), sender, ctx));
}

entry fun collect_escrow(invoice: &mut Invoice, buyer_escrow: &mut BuyerEscrow, funding: &Funding, ctx: &mut TxContext) {
    let sender = ctx.sender();

    assert!(
        sender == funding.funder,
        E_NOT_FUNDER
    );
    
    assert!(
        invoice::status(invoice) == 2,
        E_INVOICE_NOT_FUNDED
    );

}

public(package) fun create_funding_internal(invoice_id: ID, funder: address, ctx: &mut TxContext): Funding {
    Funding {
        id: object::new(ctx),
        invoice_id,
        funder
    }
}

