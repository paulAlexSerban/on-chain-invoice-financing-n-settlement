module invoice_financing::registry;

// use std::address;
// use sui::object::{Self, UID};
// use sui::tx_context::{Self, TxContext};
// use sui::transfer;


public struct SupplierCap has key {
    id: UID
}

public fun register_supplier(ctx: &mut TxContext) {
    transfer::transfer(
        SupplierCap{id: object::new(ctx)}, 
            ctx.sender()
    );
}
