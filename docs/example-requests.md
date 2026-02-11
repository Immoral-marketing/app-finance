# API Example Requests

Complete examples for all Immoral Finance API endpoints.

## 🔐 Authentication

All microservice endpoints use service-role authentication (internal use). Frontend authentication uses Supabase Auth with RLS.

## 1️⃣ Billing Service (Port 3001)

### Record Invoice Issued

```bash
curl -X POST http://localhost:3001/events/invoice-issued \
  -H "Content-Type: application/json" \
  -d '{
    "contract_id": "550e8400-e29b-41d4-a716-446655440000",
    "invoice_number": "INV-2026-001",
    "invoice_date": "2026-01-30",
    "base_amount": 10000.00,
    "client_name": "La Vecina Rubia",
    "description": "Monthly content services January 2026"
  }'
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "invoice": {
    "invoice_number": "INV-2026-001",
    "invoice_date": "2026-01-30",
    "base_amount": 10000.00,
    "fee_percentage": 15.00,
    "minimum_fee": 500.00,
    "fee_amount": 1500.00,
    "client": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "La Vecina Rubia"
    },
    "contract": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Standard Management 2026"
    },
    "vertical": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Content Creation"
    }
  },
  "splits": [
    {
      "department_id": "770e8400-e29b-41d4-a716-446655440001",
      "department_name": "Management",
      "split_percentage": 60.00,
      "split_amount": 900.00
    },
    {
      "department_id": "770e8400-e29b-41d4-a716-446655440002",
      "department_name": "Operations",
      "split_percentage": 40.00,
      "split_amount": 600.00
    }
  ],
  "ledger_entries": [
    {
      "entry_id": "880e8400-e29b-41d4-a716-446655440001",
      "department_id": "770e8400-e29b-41d4-a716-446655440001",
      "amount": 900.00,
      "description": "Revenue from invoice INV-2026-001 - Management (60%)"
    },
    {
      "entry_id": "880e8400-e29b-41d4-a716-446655440002",
      "department_id": "770e8400-e29b-41d4-a716-446655440002",
      "amount": 600.00,
      "description": "Revenue from invoice INV-2026-001 - Operations (40%)"
    }
  ],
  "message": "Invoice INV-2026-001 processed successfully with 2 department splits"
}
```

## 2️⃣ Expenses Service (Port 3002)

### Register Direct Expense

```bash
curl -X POST http://localhost:3002/events/expense-registered \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "990e8400-e29b-41d4-a716-446655440000",
    "department_id": "770e8400-e29b-41d4-a716-446655440001",
    "description": "Social media advertising",
    "amount": 500.00,
    "expense_date": "2026-01-28",
    "payment_date": "2026-01-30",
    "vendor": "Meta Ads",
    "invoice_number": "FB-2026-001"
  }'
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "a47ac10b-58cc-4372-a567-0e02b2c3d479",
  "expense": {
    "id": "aa0e8400-e29b-41d4-a716-446655440001",
    "expense_code": "EXP-2026-001",
    "category": "Marketing",
    "department": "Management",
    "amount": 500.00,
    "expense_date": "2026-01-28",
    "vendor": "Meta Ads"
  },
  "ledger_entry": {
    "entry_id": "bb0e8400-e29b-41d4-a716-446655440001",
    "amount": -500.00,
    "description": "Social media advertising"
  }
}
```

### Allocate General Expenses

```bash
curl -X POST http://localhost:3002/events/general-expenses-allocated \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "990e8400-e29b-41d4-a716-446655440001",
    "description": "Office rent - January",
    "total_amount": 2000.00,
    "expense_date": "2026-01-31",
    "allocation_rule": {
      "dept1": { "department_id": "770e8400-e29b-41d4-a716-446655440001", "percentage": 60 },
      "dept2": { "department_id": "770e8400-e29b-41d4-a716-446655440002", "percentage": 40 }
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "b47ac10b-58cc-4372-a567-0e02b2c3d479",
  "expense": {
    "id": "cc0e8400-e29b-41d4-a716-446655440001",
    "total_amount": 2000.00,
    "description": "Office rent - January"
  },
  "allocations": [
    {
      "department": "Management",
      "percentage": 60.00,
      "amount": 1200.00
    },
    {
      "department": "Operations",
      "percentage": 40.00,
      "amount": 800.00
    }
  ]
}
```

## 3️⃣ Payroll Service (Port 3003)

### Record Payroll Payment

```bash
curl -X POST http://localhost:3003/events/payroll-paid \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "dd0e8400-e29b-41d4-a716-446655440001",
    "pay_period_start": "2026-01-01",
    "pay_period_end": "2026-01-31",
    "payment_date": "2026-01-31",
    "base_salary": 3000.00,
    "bonuses": 500.00,
    "variable_pay": 200.00,
    "deductions": 100.00
  }'
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "c47ac10b-58cc-4372-a567-0e02b2c3d479",
  "payroll": {
    "id": "ee0e8400-e29b-41d4-a716-446655440001",
    "employee": "Juan Pérez",
    "pay_period": "2026-01-01 to 2026-01-31",
    "gross_pay": 3700.00,
    "deductions": 100.00,
    "net_pay": 3600.00
  },
  "splits": [
    {
      "department": "Management",
      "amount": 2160.00
    },
    {
      "department": "Operations",
      "amount": 1440.00
    }
  ]
}
```

### Update Employee Salary

```bash
curl -X PATCH http://localhost:3003/employees/dd0e8400-e29b-41d4-a716-446655440001/salary \
  -H "Content-Type: application/json" \
  -d '{
    "new_salary": 3500.00,
    "effective_from": "2026-02-01",
    "change_reason": "Annual review - performance increase"
  }'
```

**Response:**
```json
{
  "success": true,
  "employee_id": "dd0e8400-e29b-41d4-a716-446655440001",
  "old_salary": 3000.00,
  "new_salary": 3500.00,
  "effective_from": "2026-02-01",
  "history_id": "ff0e8400-e29b-41d4-a716-446655440001"
}
```

## 4️⃣ Commissions Service (Port 3004)

### Record Commission Accrued

```bash
# Received commission (positive)
curl -X POST http://localhost:3004/events/commission-accrued \
  -H "Content-Type: application/json" \
  -d '{
    "commission_type": "received",
    "related_entity_type": "referral",
    "related_entity_name": "Partner Agency",
    "amount": 1000.00,
    "commission_date": "2026-01-30",
    "client_id": "550e8400-e29b-41d4-a716-446655440000",
    "revenue_percentage": 10.00,
    "department_id": "770e8400-e29b-41d4-a716-446655440001",
    "description": "Referral commission from new client"
  }'

# Paid commission (negative)
curl -X POST http://localhost:3004/events/commission-accrued \
  -H "Content-Type: application/json" \
  -d '{
    "commission_type": "paid",
    "related_entity_type": "platform",
    "related_entity_name": "OnlyFans",
    "amount": 500.00,
    "commission_date": "2026-01-30",
    "client_id": "550e8400-e29b-41d4-a716-446655440000",
    "revenue_percentage": 5.00,
    "department_id": "770e8400-e29b-41d4-a716-446655440001",
    "description": "Platform fee - OnlyFans"
  }'
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "d47ac10b-58cc-4372-a567-0e02b2c3d479",
  "commission": {
    "id": "gg0e8400-e29b-41d4-a716-446655440001",
    "type": "received",
    "entity": "Partner Agency",
    "amount": 1000.00,
    "ledger_amount": 1000.00
  },
  "ledger_entry": {
    "entry_id": "hh0e8400-e29b-41d4-a716-446655440001",
    "amount": 1000.00,
    "description": "Referral commission from new client"
  }
}
```

## 5️⃣ Financial Periods Service (Port 3005)

### Close Financial Period

```bash
curl -X POST http://localhost:3005/events/month-closed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "year": 2026,
    "month": 1
  }'
```

**Response:**
```json
{
  "success": true,
  "period": {
    "year": 2026,
    "month": 1,
    "quarter": 1,
    "is_closed": true,
    "closed_at": "2026-02-01T10:30:00Z"
  },
  "materialized_views_refreshed": [
    "mv_department_summary",
    "mv_vertical_summary",
    "mv_client_revenue",
    "mv_employee_costs",
    "mv_financial_summary"
  ],
  "summary": {
    "total_revenue": 150000.00,
    "total_expenses": 45000.00,
    "total_payroll": 30000.00,
    "net_result": 75000.00,
    "transaction_count": 247
  }
}
```

### Reopen Financial Period

```bash
curl -X POST http://localhost:3005/periods/2026/1/reopen \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>"
```

**Response:**
```json
{
  "success": true,
  "period": {
    "year": 2026,
    "month": 1,
    "is_closed": false,
    "reopened_at": "2026-02-02T14:30:00Z"
  },
  "message": "Period January 2026 has been reopened. New entries can now be created."
}
```

## 🔍 Health Checks

All services have health check endpoints:

```bash
curl http://localhost:3001/events/health
curl http://localhost:3002/events/health
curl http://localhost:3003/events/health
curl http://localhost:3004/events/health
curl http://localhost:3005/events/health
```

## ⚠️ Error Responses

### Validation Error
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "field": "invoice_number",
      "message": "invoice_number is required"
    }
  ]
}
```

### Business Logic Error
```json
{
  "success": false,
  "error": "No active contract found for client 550e8400-e29b-41d4-a716-446655440000 on 2026-01-30"
}
```

### Period Closed Error
```json
{
  "success": false,
  "error": "Cannot create entries for closed period: 2026-1"
}
```

## 💡 Tips

1. **Transaction IDs**: Automatically generated UUIDs that group related ledger entries
2. **Dates**: Use ISO 8601 format (YYYY-MM-DD)
3. **Amounts**: Always positive in requests (service determines sign for ledger)
4. **Split Validation**: Splits must sum to 100% or service returns error
5. **Period Locking**: Closed periods prevent new entries (admin can reopen)
