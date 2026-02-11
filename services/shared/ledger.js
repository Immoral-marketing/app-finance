import { supabase } from './supabase.js';
import { v4 as uuidv4 } from 'uuid';

export function generateTransactionId() {
    return uuidv4();
}

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

    if (error) throw new Error(`Failed to create ledger entry: ${error.message}`);
    return data;
}

export async function createLedgerEntries(entries) {
    const results = [];
    for (const entry of entries) {
        const entryId = await createLedgerEntry(entry);
        results.push({ entryId, entry });
    }
    return results;
}
