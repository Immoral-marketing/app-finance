import express from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { calculateDepartmentSplits, getContractWithSplits } from '../services/splitCalculator.js';
import { createInvoiceLedgerEntries, generateTransactionId } from '../services/ledgerService.js';

const router = express.Router();

/**
 * Validation schema for invoice issued event
 */
const invoiceIssuedSchema = Joi.object({
    contract_id: Joi.string().uuid().required(),
    invoice_number: Joi.string().required(),
    invoice_date: Joi.date().iso().required(),
    base_amount: Joi.number().positive().required(),
    client_name: Joi.string().optional(),
    description: Joi.string().optional(),
    metadata: Joi.object().optional()
});

/**
 * POST /events/invoice-issued
 * Records an invoice issuance event
 * 
 * Request body:
 * {
 *   "contract_id": "uuid",
 *   "invoice_number": "INV-2026-001",
 *   "invoice_date": "2026-01-30",
 *   "base_amount": 10000.00,
 *   "client_name": "Client XYZ",
 *   "description": "Monthly services",
 *   "metadata": {}
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "transaction_id": "uuid",
 *   "invoice": {...},
 *   "splits": [...],
 *   "ledger_entries": [...]
 * }
 */
router.post('/invoice-issued', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = invoiceIssuedSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details
            });
        }

        const {
            contract_id,
            invoice_number,
            invoice_date,
            base_amount,
            client_name,
            description,
            metadata = {}
        } = value;

        // Get contract with splits
        const contract = await getContractWithSplits(contract_id);

        // Calculate fee amount (considering minimum fee)
        const feePercentage = parseFloat(contract.fee_percentage);
        const minimumFee = parseFloat(contract.minimum_fee || 0);
        let feeAmount = (base_amount * feePercentage) / 100.0;

        if (feeAmount < minimumFee) {
            feeAmount = minimumFee;
        }

        // Calculate department splits
        const splits = await calculateDepartmentSplits(contract_id, feeAmount);

        // Validate splits sum matches fee amount
        const totalSplit = splits.reduce((sum, s) => sum + parseFloat(s.split_amount), 0);
        if (Math.abs(totalSplit - feeAmount) > 0.01) {
            return res.status(500).json({
                success: false,
                error: 'Split calculation error',
                details: `Splits sum (${totalSplit}) does not match fee amount (${feeAmount})`
            });
        }

        // Generate transaction ID
        const transactionId = generateTransactionId();

        // Create ledger entries
        const ledgerEntries = await createInvoiceLedgerEntries({
            transactionId,
            contractId: contract_id,
            verticalId: contract.vertical_id,
            invoiceDate: invoice_date,
            invoiceNumber: invoice_number,
            splits,
            metadata: {
                ...metadata,
                client_id: contract.client_id,
                client_name: client_name || contract.client.name,
                contract_name: contract.contract_name,
                base_amount,
                fee_percentage: feePercentage,
                minimum_fee: minimumFee,
                calculated_fee: feeAmount,
                description
            }
        });

        // Return success response
        res.status(201).json({
            success: true,
            transaction_id: transactionId,
            invoice: {
                invoice_number,
                invoice_date,
                base_amount,
                fee_percentage: feePercentage,
                minimum_fee: minimumFee,
                fee_amount: feeAmount,
                client: {
                    id: contract.client_id,
                    name: client_name || contract.client.name
                },
                contract: {
                    id: contract_id,
                    name: contract.contract_name
                },
                vertical: contract.vertical ? {
                    id: contract.vertical_id,
                    name: contract.vertical.name
                } : null
            },
            splits: splits.map(s => ({
                department_id: s.department_id,
                department_name: s.department_name,
                split_percentage: s.split_percentage,
                split_amount: s.split_amount
            })),
            ledger_entries: ledgerEntries.map(le => ({
                entry_id: le.entryId,
                department_id: le.entry.departmentId,
                amount: le.entry.amount,
                description: le.entry.description
            })),
            message: `Invoice ${invoice_number} processed successfully with ${splits.length} department splits`
        });

    } catch (error) {
        console.error('Error processing invoice:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process invoice',
            details: error.message
        });
    }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'billing-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

export default router;
