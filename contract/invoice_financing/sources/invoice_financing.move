module invoice_financing::invoice_financing;

use sui::clock::{Self, Clock};
use sui::event;
use sui::coin::{Self, Coin};
use sui::sui::SUI;

// ===== Structs =====

/// Platform configuration and treasury
public struct Platform has key {
    id: UID,
    /// Platform admin address
    admin: address,
    /// Treasury to collect fees
    treasury: address,
    /// Origination fee in basis points (1% = 100 bps, max 2% = 200 bps)
    origination_fee_bps: u64,
    /// Take-rate on financier discount in basis points (10% = 1000 bps, max 20% = 2000 bps)
    take_rate_bps: u64,
    /// Settlement fee in MIST (flat fee)
    settlement_fee: u64,
}

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
    /// Amount investor paid (purchase price including fees)
    investor_paid: u64,
    /// Amount supplier received (after discount and origination fee)
    supplier_received: u64,
    /// Origination fee collected by platform
    origination_fee_collected: u64,
    /// Discount rate applied (in basis points, e.g., 200 = 2%)
    discount_rate_bps: u64,
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
    investor_paid: u64,
    supplier_received: u64,
    origination_fee: u64,
    discount_rate_bps: u64,
}

public struct InvoiceRepaid has copy, drop {
    invoice_id: ID,
    amount_paid: u64,
    investor_received: u64,
    platform_take_rate_fee: u64,
    settlement_fee: u64,
}

public struct FeesCollected has copy, drop {
    invoice_id: ID,
    origination_fee: u64,
    take_rate_fee: u64,
    settlement_fee: u64,
    total_fees: u64,
}

// ===== Errors =====

const EInvalidAmount: u64 = 0;
const EInvalidDueDate: u64 = 1;
const ENotAuthorized: u64 = 2;
const EInvoiceAlreadyFunded: u64 = 3;
const EInvoiceNotFunded: u64 = 4;
const EInsufficientPayment: u64 = 5;
const EInvalidDiscountRate: u64 = 6;
const EInvalidFeeConfiguration: u64 = 7;

// ===== Constants =====

/// Basis points denominator (100% = 10,000 bps)
const BPS_DENOMINATOR: u64 = 10000;

/// Maximum origination fee: 2% = 200 bps
const MAX_ORIGINATION_FEE_BPS: u64 = 200;

/// Maximum take rate: 20% = 2000 bps
const MAX_TAKE_RATE_BPS: u64 = 2000;

/// Maximum discount rate: 50% = 5000 bps (prevents unrealistic discounts)
const MAX_DISCOUNT_RATE_BPS: u64 = 5000;

// ===== Module Initialization =====

fun init(ctx: &mut TxContext) {
    // Create platform configuration with default fees
    // Default: 1% origination (100 bps), 10% take-rate (1000 bps), 0.01 SUI settlement fee
    let platform = Platform {
        id: object::new(ctx),
        admin: tx_context::sender(ctx),
        treasury: tx_context::sender(ctx),
        origination_fee_bps: 100,  // 1%
        take_rate_bps: 1000,        // 10%
        settlement_fee: 10_000_000, // 0.01 SUI in MIST
    };

    transfer::share_object(platform);
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
        investor_paid: 0,
        supplier_received: 0,
        origination_fee_collected: 0,
        discount_rate_bps: 0,
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
///
/// # Arguments
/// * `platform` - Platform configuration (shared object)
/// * `invoice` - Invoice to finance
/// * `payment` - Payment from investor (must cover invoice amount after discount)
/// * `discount_rate_bps` - Discount rate in basis points (e.g., 200 = 2%)
///
/// # Fee Calculation
/// Example: 100 SUI invoice, 2% discount (200 bps), 1% origination fee (100 bps)
/// - Invoice face value: 100 SUI
/// - Discount (2%): 2 SUI
/// - Investor pays: 98 SUI (invoice - discount)
/// - Origination fee (1% of 98): 0.98 SUI
/// - Supplier receives: 97.02 SUI (98 - 0.98)
/// - Platform collects: 0.98 SUI (origination fee now)
/// - At settlement: Investor receives 100 SUI (minus take-rate & settlement fees)
public fun finance_invoice(
    platform: &Platform,
    invoice: &mut Invoice,
    mut payment: Coin<SUI>,
    discount_rate_bps: u64,
    ctx: &mut TxContext
) {
    // Validations
    assert!(invoice.status == STATUS_PENDING, EInvoiceAlreadyFunded);
    assert!(discount_rate_bps <= MAX_DISCOUNT_RATE_BPS, EInvalidDiscountRate);

    let payment_amount = coin::value(&payment);
    assert!(payment_amount > 0, EInsufficientPayment);

    // Calculate discount amount: invoice_amount * discount_rate / 10000
    let discount_amount = (invoice.amount * discount_rate_bps) / BPS_DENOMINATOR;

    // Investor pays: invoice_amount - discount (they get the discount upfront)
    let expected_payment = invoice.amount - discount_amount;
    assert!(payment_amount >= expected_payment, EInsufficientPayment);

    // Calculate origination fee on the amount investor pays
    let origination_fee = (expected_payment * platform.origination_fee_bps) / BPS_DENOMINATOR;

    // Supplier receives: what investor paid - origination_fee
    let supplier_amount = expected_payment - origination_fee;

    // Split payment
    let origination_fee_coin = coin::split(&mut payment, origination_fee, ctx);
    let supplier_coin = coin::split(&mut payment, supplier_amount, ctx);

    // Any remaining amount goes back to investor (if they overpaid)
    if (coin::value(&payment) > 0) {
        transfer::public_transfer(payment, tx_context::sender(ctx));
    } else {
        coin::destroy_zero(payment);
    };

    // Update invoice
    invoice.status = STATUS_FUNDED;
    invoice.financed_by = option::some(tx_context::sender(ctx));
    invoice.investor_paid = payment_amount;
    invoice.supplier_received = supplier_amount;
    invoice.origination_fee_collected = origination_fee;
    invoice.discount_rate_bps = discount_rate_bps;

    // Emit event
    event::emit(InvoiceFunded {
        invoice_id: object::uid_to_inner(&invoice.id),
        investor: tx_context::sender(ctx),
        investor_paid: payment_amount,
        supplier_received: supplier_amount,
        origination_fee,
        discount_rate_bps,
    });

    // Transfer origination fee to platform treasury
    transfer::public_transfer(origination_fee_coin, platform.treasury);

    // Transfer supplier amount to invoice issuer
    transfer::public_transfer(supplier_coin, invoice.issuer);
}

/// Repay invoice (buyer repays the investor)
///
/// # Arguments
/// * `platform` - Platform configuration
/// * `invoice` - Invoice to repay
/// * `payment` - Payment from buyer (must be >= invoice face value)
///
/// # Fee Calculation at Settlement
/// Example: $100,000 invoice repaid
/// - Buyer pays: 100,000 SUI (full face value)
/// - Discount earned by investor: 2,000 SUI (was deducted at financing)
/// - Platform take-rate (10% of 2,000): 200 SUI
/// - Settlement fee: 0.01 SUI (10 MIST)
/// - Investor receives: 100,000 - 200 - 0.01 = 99,799.99 SUI
/// - Net investor profit: 99,799.99 - 98,000 (original investment) = 1,799.99 SUI
///
/// Note: In this implementation, investor already "paid" for the discount upfront
/// by only receiving (amount - discount - origination_fee) to the supplier.
/// So at repayment, the full face value goes to investor minus platform fees.
public fun repay_invoice(
    platform: &Platform,
    invoice: &mut Invoice,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    // Validations
    assert!(invoice.status == STATUS_FUNDED, EInvoiceNotFunded);
    let payment_amount = coin::value(&payment);
    assert!(payment_amount >= invoice.amount, EInsufficientPayment);

    // Calculate fees on the discount amount
    let discount_amount = (invoice.amount * invoice.discount_rate_bps) / BPS_DENOMINATOR;

    // Platform take-rate: percentage of the discount earned by investor
    let take_rate_fee = (discount_amount * platform.take_rate_bps) / BPS_DENOMINATOR;

    // Settlement fee: flat fee
    let settlement_fee = platform.settlement_fee;

    // Total platform fees at settlement
    let total_platform_fees = take_rate_fee + settlement_fee;

    // Investor receives: full payment - platform fees
    let investor_amount = invoice.amount - total_platform_fees;

    // Split payment
    let platform_fees_coin = coin::split(&mut payment, total_platform_fees, ctx);
    let investor_coin = coin::split(&mut payment, investor_amount, ctx);

    // Return any overpayment to sender
    if (coin::value(&payment) > 0) {
        transfer::public_transfer(payment, tx_context::sender(ctx));
    } else {
        coin::destroy_zero(payment);
    };

    // Update status
    invoice.status = STATUS_REPAID;

    // Emit events
    event::emit(InvoiceRepaid {
        invoice_id: object::uid_to_inner(&invoice.id),
        amount_paid: payment_amount,
        investor_received: investor_amount,
        platform_take_rate_fee: take_rate_fee,
        settlement_fee,
    });

    event::emit(FeesCollected {
        invoice_id: object::uid_to_inner(&invoice.id),
        origination_fee: invoice.origination_fee_collected,
        take_rate_fee,
        settlement_fee,
        total_fees: invoice.origination_fee_collected + total_platform_fees,
    });

    // Transfer platform fees to treasury
    transfer::public_transfer(platform_fees_coin, platform.treasury);

    // Transfer payment to investor
    let investor = *option::borrow(&invoice.financed_by);
    transfer::public_transfer(investor_coin, investor);
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
    invoice.investor_paid
}

public fun get_investor_paid(invoice: &Invoice): u64 {
    invoice.investor_paid
}

public fun get_supplier_received(invoice: &Invoice): u64 {
    invoice.supplier_received
}

public fun get_origination_fee_collected(invoice: &Invoice): u64 {
    invoice.origination_fee_collected
}

public fun get_discount_rate_bps(invoice: &Invoice): u64 {
    invoice.discount_rate_bps
}

// Platform view functions
public fun get_origination_fee_bps(platform: &Platform): u64 {
    platform.origination_fee_bps
}

public fun get_take_rate_bps(platform: &Platform): u64 {
    platform.take_rate_bps
}

public fun get_settlement_fee(platform: &Platform): u64 {
    platform.settlement_fee
}

public fun get_platform_treasury(platform: &Platform): address {
    platform.treasury
}

// ===== Admin Functions =====

/// Update platform fees (admin only)
public fun update_platform_fees(
    platform: &mut Platform,
    origination_fee_bps: u64,
    take_rate_bps: u64,
    settlement_fee: u64,
    ctx: &TxContext
) {
    assert!(tx_context::sender(ctx) == platform.admin, ENotAuthorized);
    assert!(origination_fee_bps <= MAX_ORIGINATION_FEE_BPS, EInvalidFeeConfiguration);
    assert!(take_rate_bps <= MAX_TAKE_RATE_BPS, EInvalidFeeConfiguration);

    platform.origination_fee_bps = origination_fee_bps;
    platform.take_rate_bps = take_rate_bps;
    platform.settlement_fee = settlement_fee;
}

/// Update platform treasury address (admin only)
public fun update_treasury(
    platform: &mut Platform,
    new_treasury: address,
    ctx: &TxContext
) {
    assert!(tx_context::sender(ctx) == platform.admin, ENotAuthorized);
    platform.treasury = new_treasury;
}

/// Transfer admin rights (admin only)
public fun transfer_admin(
    platform: &mut Platform,
    new_admin: address,
    ctx: &TxContext
) {
    assert!(tx_context::sender(ctx) == platform.admin, ENotAuthorized);
    platform.admin = new_admin;
}
