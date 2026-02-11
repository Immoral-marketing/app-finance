import { supabase } from '../config/supabase.js';

/**
 * Calculate department splits for a contract
 * @param {string} contractId - UUID of the contract
 * @param {number} invoiceAmount - Total invoice amount
 * @returns {Promise<Array>} Array of splits with department info
 */
export async function calculateDepartmentSplits(contractId, invoiceAmount) {
    const { data, error } = await supabase.rpc('calculate_department_splits', {
        p_contract_id: contractId,
        p_invoice_amount: invoiceAmount
    });

    if (error) {
        throw new Error(`Failed to calculate splits: ${error.message}`);
    }

    return data;
}

/**
 * Calculate fee amount considering minimum fee
 * @param {number} baseAmount - Base amount to calculate fee from
 * @param {number} feePercentage - Fee percentage
 * @param {number} minimumFee - Minimum fee amount
 * @returns {Promise<number>} Calculated fee
 */
export async function calculateFee(baseAmount, feePercentage, minimumFee) {
    const { data, error } = await supabase.rpc('calculate_fee', {
        p_base_amount: baseAmount,
        p_fee_percentage: feePercentage,
        p_minimum_fee: minimumFee || 0
    });

    if (error) {
        throw new Error(`Failed to calculate fee: ${error.message}`);
    }

    return data;
}

/**
 * Get active contract for a client on a specific date
 * @param {string} clientId - UUID of the client
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Contract details
 */
export async function getActiveContract(clientId, date) {
    const { data, error } = await supabase.rpc('get_active_contract', {
        p_client_id: clientId,
        p_date: date
    });

    if (error) {
        throw new Error(`Failed to get active contract: ${error.message}`);
    }

    if (!data || data.length === 0) {
        throw new Error(`No active contract found for client ${clientId} on ${date}`);
    }

    return data[0];
}

/**
 * Validate that splits sum to 100%
 * @param {Array} splits - Array of split objects with percentage
 * @returns {boolean}
 */
export function validateSplitsSum(splits) {
    const total = splits.reduce((sum, split) => sum + parseFloat(split.split_percentage || 0), 0);
    return Math.abs(total - 100.0) < 0.01; // Allow for floating point precision
}

/**
 * Get contract with department splits
 * @param {string} contractId - UUID of the contract
 * @returns {Promise<Object>} Contract with splits
 */
export async function getContractWithSplits(contractId) {
    // Get contract
    const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select(`
      *,
      client:clients(*),
      vertical:verticals(*),
      splits:contract_department_splits(
        *,
        department:departments(*)
      )
    `)
        .eq('id', contractId)
        .single();

    if (contractError) {
        throw new Error(`Failed to get contract: ${contractError.message}`);
    }

    if (!contract) {
        throw new Error(`Contract ${contractId} not found`);
    }

    // Validate contract is active
    if (!contract.is_active) {
        throw new Error(`Contract ${contractId} is not active`);
    }

    // Validate splits exist and sum to 100%
    if (!contract.splits || contract.splits.length === 0) {
        throw new Error(`Contract ${contractId} has no department splits configured`);
    }

    if (!validateSplitsSum(contract.splits)) {
        throw new Error(`Contract ${contractId} splits do not sum to 100%`);
    }

    return contract;
}
