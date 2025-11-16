module invoice_financing::invoice_factory;

use invoice_financing::invoice::create_invoice_internal;
use invoice_financing::registry::SupplierCap;
use invoice_financing::escrow::create_escrow_internal;
use invoice_financing::invoice;
use invoice_financing::treasury::create_treasury;

const DIVISOR: u64 = 10_000;

public struct InvoiceFactory has key {
    id: UID,
}

// Event emitted when an invoice is created
public struct InvoiceCreated has copy, drop {
    invoice_id: ID,
    supplier: address,
    buyer: address,
    amount: u64,
}

fun init(ctx: &mut TxContext) {
    let factory = InvoiceFactory {
        id: object::new(ctx),
    };

    transfer::share_object(factory);
    let treasury = create_treasury(ctx.sender(), 300, ctx);
    transfer::public_share_object(treasury);
}

entry fun issue_invoice(buyer: address, amount: u64, due_date: u64, companies_info: vector<u8>, escrow_bps: u64, discount_bps: u64, fee_bps: u64, _cap: &SupplierCap, ctx: &mut TxContext) {
    let invoice = create_invoice_internal(ctx.sender(), buyer, amount, due_date, companies_info, escrow_bps, discount_bps, fee_bps, ctx);

    let invoice_id = object::id(&invoice);
    let escrow_amount = amount * escrow_bps / DIVISOR;

    // Emit event
    sui::event::emit(InvoiceCreated {
        invoice_id,
        supplier: ctx.sender(),
        buyer,
        amount,
    });

    transfer::public_share_object(create_escrow_internal(invoice_id, invoice::buyer(&invoice), escrow_amount, ctx));
    transfer::public_share_object(invoice);
}