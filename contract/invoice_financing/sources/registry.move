module invoice_financing::registry;

public struct SupplierCap has key {
    id: UID
}

entry fun register_supplier(ctx: &mut TxContext) {
    transfer::transfer(
        SupplierCap{id: object::new(ctx)},
        ctx.sender()
    );
}