import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a ledger entry
 * Uses the database function for validation and consistency
 */
export async function createLedgerEntry({
    entryType,
    transactionId,
    departmentId,
    verticalId = null,
    amount,
    entryDate,
    description,
    referenceType = null,
    referenceId = null,
    metadata = null,
    isAdjustment = false,
    adjustmentOf = null,
    createdBy = null
}) {
    const { data, error } = await supabase.rpc('create_ledger_entry', {
        p_entry_type: entryType,
        p_transaction_id: transactionId,
        p_department_id: departmentId,
        p_vertical_id: verticalId,
        p_amount: amount,
        p_entry_date: entryDate,
        p_description: description,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_metadata: metadata,
        p_is_adjustment: isAdjustment,
        p_adjustment_of: adjustmentOf,
        p_created_by: createdBy
    });

    if (error) {
        throw new Error(`Failed to create ledger entry: ${error.message}`);
    }

    return data;
}

/**
 * Create multiple ledger entries in a transaction
 * Useful for revenue splits across departments
 */
export async function createLedgerEntries(entries) {
    const results = [];
    const errors = [];

    for (const entry of entries) {
        try {
            const entryId = await createLedgerEntry(entry);
            results.push({ success: true, entryId, entry });
        } catch (error) {
            errors.push({ success: false, error: error.message, entry });
        }
    }

    if (errors.length > 0) {
        throw new Error(`Failed to create ${errors.length} ledger entries: ${JSON.stringify(errors)}`);
    }

    return results;
}

/**
 * Create ledger entries for invoice splits
 */
export async function createInvoiceLedgerEntries({
    transactionId,
    contractId,
    verticalId,
    invoiceDate,
    invoiceNumber,
    splits,
    metadata = {}
}) {
    const entries = splits.map(split => ({
        entryType: 'revenue',
        transactionId,
        departmentId: split.department_id,
        verticalId,
        amount: parseFloat(split.split_amount),
        entryDate: invoiceDate,
        description: `Revenue from invoice ${invoiceNumber} - ${split.department_name} (${split.split_percentage}%)`,
        referenceType: 'invoice',
        referenceId: contractId,
        metadata: {
            ...metadata,
            invoice_number: invoiceNumber,
            split_percentage: split.split_percentage,
            department_name: split.department_name
        }
    }));

    return await createLedgerEntries(entries);
}

/**
 * Create ledger entries for payroll splits
 */
export async function createPayrollLedgerEntries({
    transactionId,
    employeeId,
    payrollId,
    paymentDate,
    splits,
    metadata = {}
}) {
    const entries = splits.map(split => ({
        entryType: 'payroll',
        transactionId,
        departmentId: split.department_id,
        verticalId: null,
        amount: -parseFloat(split.split_amount), // Negative for costs
        entryDate: paymentDate,
        description: `Payroll for employee - ${split.department_name}`,
        referenceType: 'payroll',
        referenceId: payrollId,
        metadata: {
            ...metadata,
            employee_id: employeeId,
            department_name: split.department_name
        }
    }));

    return await createLedgerEntries(entries);
}

/**
 * Create ledger entry for expense
 */
export async function createExpenseLedgerEntry({
    transactionId,
    expenseId,
    departmentId,
    amount,
    expenseDate,
    description,
    metadata = {}
}) {
    return await createLedgerEntry({
        entryType: 'expense',
        transactionId,
        departmentId,
        verticalId: null,
        amount: -parseFloat(amount), // Negative for costs
        entryDate: expenseDate,
        description,
        referenceType: 'expense',
        referenceId: expenseId,
        metadata
    });
}

/**
 * Create ledger entries for general expense allocation
 */
export async function createGeneralExpenseLedgerEntries({
    transactionId,
    expenseId,
    expenseDate,
    description,
    allocations,
    metadata = {}
}) {
    const entries = allocations.map(allocation => ({
        entryType: 'expense',
        transactionId,
        departmentId: allocation.department_id,
        verticalId: null,
        amount: -parseFloat(allocation.allocated_amount), // Negative for costs
        entryDate: expenseDate,
        description: `${description} - ${allocation.department_name} (${allocation.allocation_percentage}%)`,
        referenceType: 'expense',
        referenceId: expenseId,
        metadata: {
            ...metadata,
            allocation_percentage: allocation.allocation_percentage,
            department_name: allocation.department_name
        }
    }));

    return await createLedgerEntries(entries);
}

/**
 * Create ledger entry for commission
 */
export async function createCommissionLedgerEntry({
    transactionId,
    commissionId,
    departmentId,
    amount,
    commissionDate,
    commissionType, // 'paid' or 'received'
    description,
    metadata = {}
}) {
    // Received commissions are positive, paid commissions are negative
    const ledgerAmount = commissionType === 'received' ?
        parseFloat(amount) :
        -parseFloat(amount);

    return await createLedgerEntry({
        entryType: 'commission',
        transactionId,
        departmentId,
        verticalId: null,
        amount: ledgerAmount,
        entryDate: commissionDate,
        description,
        referenceType: 'commission',
        referenceId: commissionId,
        metadata: {
            ...metadata,
            commission_type: commissionType
        }
    });
}

/**
 * Generate a new transaction ID
 */
export function generateTransactionId() {
    return uuidv4();
}
