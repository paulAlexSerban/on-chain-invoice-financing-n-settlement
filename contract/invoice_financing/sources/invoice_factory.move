module invoice_financing::invoice_factory;

use invoice_financing::invoice::create_invoice_internal;

public struct InvoiceFactory has key {
    id: UID,
}

fun init(ctx: &mut TxContext) {
    let factory = InvoiceFactory {
        id: object::new(ctx),
    };

    transfer::share_object(factory);
}

entry fun issue_invoice(buyer: address, amount: u64, due_date: u64, companies_info: vector<u8>, discount_bps: u64, fee_bps: u64, ctx: &mut TxContext) {
    let invoice = create_invoice_internal(ctx.sender(), buyer, amount, due_date, companies_info, discount_bps, fee_bps, ctx);

    transfer::public_share_object(invoice);
}


