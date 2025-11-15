module invoice_financing::invoice_financing;

use sui::clock::{Self, Clock};
use sui::event;
use sui::coin::{Self, Coin};
use sui::sui::SUI;

// ===== Structs =====

/// Main invoice object
public struct Invoice has key, store {
    id: UID,
    /// Invoice number/identifier
    invoice_number: vector<u8>,
    /// Business issuing the invoice
    issuer: address,
    /// Buyer who owes the payment
    buyer: vector<u8>,
    /// Amount in MIST (1 SUI = 1,000,000,000 MIST)
    amount: u64,
    /// Due date timestamp (milliseconds)
    due_date: u64,
    /// Description of goods/services
    description: vector<u8>,
    /// Creation timestamp
    created_at: u64,
    /// Current status
    status: u8,
    /// Address of investor who financed (if any)
    financed_by: Option<address>,
    /// Amount received from financing (if financed)
    financed_amount: u64,
}

// Status constants
const STATUS_PENDING: u8 = 0;
const STATUS_FUNDED: u8 = 1;
const STATUS_REPAID: u8 = 2;
#[allow(unused_const)]
const STATUS_DEFAULTED: u8 = 3;

// ===== Events =====

public struct InvoiceCreated has copy, drop {
    invoice_id: ID,
    issuer: address,
    amount: u64,
    due_date: u64,
    invoice_number: vector<u8>,
}

public struct InvoiceFunded has copy, drop {
    invoice_id: ID,
    investor: address,
    amount: u64,
}

public struct InvoiceRepaid has copy, drop {
    invoice_id: ID,
    amount: u64,
}

// ===== Errors =====

const EInvalidAmount: u64 = 0;
const EInvalidDueDate: u64 = 1;
#[allow(unused_const)]
const ENotAuthorized: u64 = 2;
const EInvoiceAlreadyFunded: u64 = 3;
const EInvoiceNotFunded: u64 = 4;
const EInsufficientPayment: u64 = 5;

// ===== Module Initialization =====

fun init(_ctx: &mut TxContext) {
    // Future: can initialize shared objects here if needed
}

// ===== Public Functions =====

/// Create a new invoice
public fun create_invoice(
    invoice_number: vector<u8>,
    buyer: vector<u8>,
    amount: u64,
    due_date: u64,
    description: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Validations
    assert!(amount > 0, EInvalidAmount);
    let current_time = clock::timestamp_ms(clock);
    assert!(due_date > current_time, EInvalidDueDate);

    let invoice_id = object::new(ctx);
    let id_copy = object::uid_to_inner(&invoice_id);
    
    let invoice = Invoice {
        id: invoice_id,
        invoice_number,
        issuer: tx_context::sender(ctx),
        buyer,
        amount,
        due_date,
        description,
        created_at: current_time,
        status: STATUS_PENDING,
        financed_by: option::none(),
        financed_amount: 0,
    };

    // Emit event
    event::emit(InvoiceCreated {
        invoice_id: id_copy,
        issuer: tx_context::sender(ctx),
        amount,
        due_date,
        invoice_number,
    });

    // Transfer invoice to creator
    transfer::public_transfer(invoice, tx_context::sender(ctx));
}

/// Finance an invoice (investor provides liquidity)
public fun finance_invoice(
    invoice: &mut Invoice,
    payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    // Validations
    assert!(invoice.status == STATUS_PENDING, EInvoiceAlreadyFunded);
    let payment_amount = coin::value(&payment);
    assert!(payment_amount > 0, EInsufficientPayment);

    // Update invoice
    invoice.status = STATUS_FUNDED;
    invoice.financed_by = option::some(tx_context::sender(ctx));
    invoice.financed_amount = payment_amount;

    // Emit event
    event::emit(InvoiceFunded {
        invoice_id: object::uid_to_inner(&invoice.id),
        investor: tx_context::sender(ctx),
        amount: payment_amount,
    });

    // Transfer payment to invoice issuer
    transfer::public_transfer(payment, invoice.issuer);
}

/// Repay invoice (buyer repays the investor)
public fun repay_invoice(
    invoice: &mut Invoice,
    payment: Coin<SUI>,
    _ctx: &mut TxContext
) {
    // Validations
    assert!(invoice.status == STATUS_FUNDED, EInvoiceNotFunded);
    let payment_amount = coin::value(&payment);
    assert!(payment_amount >= invoice.financed_amount, EInsufficientPayment);

    // Update status
    invoice.status = STATUS_REPAID;

    // Emit event
    event::emit(InvoiceRepaid {
        invoice_id: object::uid_to_inner(&invoice.id),
        amount: payment_amount,
    });

    // Transfer payment to investor
    let investor = *option::borrow(&invoice.financed_by);
    transfer::public_transfer(payment, investor);
}

// ===== View Functions =====

public fun get_amount(invoice: &Invoice): u64 {
    invoice.amount
}

public fun get_issuer(invoice: &Invoice): address {
    invoice.issuer
}

public fun get_status(invoice: &Invoice): u8 {
    invoice.status
}

public fun get_due_date(invoice: &Invoice): u64 {
    invoice.due_date
}

public fun is_funded(invoice: &Invoice): bool {
    invoice.status == STATUS_FUNDED
}

public fun is_repaid(invoice: &Invoice): bool {
    invoice.status == STATUS_REPAID
}

public fun get_financed_amount(invoice: &Invoice): u64 {
    invoice.financed_amount
}
