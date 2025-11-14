module invoice_financing::invoice_financing;

public struct Invoice has key {
    id: sui::object::UID,
    amount: u64,
    owner: address,
}

fun init(_ctx: &mut sui::tx_context::TxContext) {}

public fun create_invoice(amount: u64, ctx: &mut sui::tx_context::TxContext) {
    let invoice = Invoice {
        id: sui::object::new(ctx),
        amount,
        owner: sui::tx_context::sender(ctx),
    };
    sui::transfer::transfer(invoice, sui::tx_context::sender(ctx));
}
