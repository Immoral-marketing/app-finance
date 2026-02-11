# Integration Guide

Guide for integrating Immoral Finance App with n8n and Holded.

## 🔗 n8n Integration

### Overview

n8n is a workflow automation tool that can connect Immoral Finance with external systems via webhooks.

### Use Cases

1. **Automatic Invoice Processing**: Trigger when new invoices are received
2. **Expense Import**: Import expenses from bank statements or receipt scanners
3. **Reporting Automation**: Generate and email monthly reports
4. **Notifications**: Slack/email alerts for large expenses or low cash flow

### Setup

#### 1. Webhook Listener in n8n

Create a webhook node in n8n to listen for Immoral Finance events:

```
Webhook URL: https://your-n8n-instance.com/webhook/immoral-invoice
```

#### 2. Example: Auto-process Invoice from Email

**Workflow**:
1. Email Trigger → Watch for emails with invoices
2. Extract Data → Parse invoice details from email/PDF
3. HTTP Request → Post to Immoral Finance billing service

**HTTP Request Node Configuration**:
```json
{
  "method": "POST",
  "url": "http://your-server:3001/events/invoice-issued",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "contract_id": "{{$json.contractId}}",
    "invoice_number": "{{$json.invoiceNumber}}",
    "invoice_date": "{{$json.invoiceDate}}",
    "base_amount": "{{$json.amount}}",
    "client_name": "{{$json.clientName}}",
    "description": "{{$json.description}}"
  }
}
```

#### 3. Example: Monthly Report Generation

**Workflow**:
1. Cron Trigger → Run on 1st of each month
2. HTTP Request → Close previous month period
3. Query Database → Get monthly summary from Supabase
4. Generate PDF → Create formatted report
5. Send Email → Email to stakeholders

**Cron Expression**: `0 9 1 * *` (9 AM on 1st of each month)

**Close Period Request**:
```json
{
  "method": "POST",
  "url": "http://your-server:3005/events/month-closed",
  "body": {
    "year": "{{$now.year()}}",
    "month": "{{$now.month()}}"
  }
}
```

#### 4. Example: Expense Import from Bank CSV

**Workflow**:
1. Schedule/Manual Trigger
2. Read CSV → Bank statement
3. Filter → Identify business expenses
4. Transform → Map to Immoral Finance format
5. HTTP Request → POST to expenses service

```json
{
  "method": "POST",
  "url": "http://your-server:3002/events/expense-registered",
  "body": {
    "category_id": "{{$json.categoryId}}",
    "department_id": "{{$json.departmentId}}",
    "description": "{{$json.description}}",
    "amount": "{{$json.amount}}",
    "expense_date": "{{$json.date}}",
    "vendor": "{{$json.vendor}}"
  }
}
```

### Error Handling

Add error handling nodes:
- **Retry Logic**: Retry failed API calls
- **Error Notifications**: Send alerts to admin
- **Logging**: Store failed transactions

---

## 📊 Holded Integration

### Overview

Holded is an accounting/ERP platform. Integrate bidirectionally with Immoral Finance.

### Integration Methods

#### 1. Holded API

Use Holded's REST API to sync data.

**Authentication**:
```javascript
const headers = {
  'key': 'YOUR_HOLDED_API_KEY',
  'Content-Type': 'application/json'
};
```

#### 2. Sync Invoices to Holded

When an invoice is created in Immoral Finance, create it in Holded:

**n8n Workflow**:
1. Webhook → Listen for Immoral invoice events
2. HTTP Request → Create invoice in Holded

**Holded API Request**:
```javascript
POST https://api.holded.com/api/invoicing/v1/documents/invoice

{
  "contactId": "holded-client-id",
  "contactName": "{{clientName}}",
  "date": "{{invoiceDate}}",
  "desc": "{{description}}",
  "items": [
    {
      "name": "Management Services",
      "desc": "{{description}}",
      "units": 1,
      "subtotal": "{{feeAmount}}"
    }
  ]
}
```

#### 3. Sync Expenses from Holded

Import expenses from Holded to Immoral Finance:

**Schedule**: Daily at midnight

**Holded API Request** (Get recent expenses):
```javascript
GET https://api.holded.com/api/invoicing/v1/documents/expense
?date=gte:{{yesterday}}
```

**Transform and POST to Immoral**:
```javascript
POST http://your-server:3002/events/expense-registered

{
  "category_id": "map-from-holded-category",
  "department_id": "map-from-holded-tag",
  "description": "{{expense.desc}}",
  "amount": "{{expense.total}}",
  "expense_date": "{{expense.date}}",
  "vendor": "{{expense.contactName}}",
  "invoice_number": "{{expense.number}}"
}
```

#### 4. Bidirectional Sync Strategy

**Master Data**: Decide which system is the source of truth
- **Clients**: Holded → Immoral Finance (import)
- **Invoices**: Immoral Finance → Holded (export)
- **Expenses**: Holded → Immoral Finance (import)
- **Payroll**: Immoral Finance only (stays internal)

**Sync Frequency**:
- Invoices: Real-time (webhook)
- Expenses: Daily batch
- Clients: Weekly or on-demand

**Conflict Resolution**:
- Use timestamps to determine latest version
- Manual review for critical conflicts
- Log all sync operations for audit

---

## 🔔 Webhook Configuration

### Setting Up Webhooks from Immoral Finance

Add webhook support to microservices:

**Example: Billing Service Webhook**

```javascript
// In billing service after invoice creation
async function triggerWebhook(event, data) {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) return;
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'invoice.issued',
      timestamp: new Date().toISOString(),
      data: data
    })
  });
}

// After successful invoice creation
await triggerWebhook('invoice.issued', {
  transaction_id: transactionId,
  invoice_number: invoiceNumber,
  client_name: clientName,
  amount: feeAmount,
  splits: splits
});
```

### Environment Variables

```env
# n8n webhook
WEBHOOK_URL=https://your-n8n.com/webhook/immoral-events

# Holded API
HOLDED_API_KEY=your-holded-api-key
HOLDED_SYNC_ENABLED=true
```

---

## 🛠️ Integration Code Examples

### n8n Custom Code Node (JavaScript)

```javascript
// Transform Immoral Finance data for external system
const invoices = $input.all();

return invoices.map(invoice => ({
  json: {
    externalId: invoice.json.transaction_id,
    clientName: invoice.json.client.name,
    amount: invoice.json.fee_amount,
    date: invoice.json.invoice_date,
    splits: invoice.json.splits.map(s => ({
      department: s.department_name,
      amount: s.split_amount
    }))
  }
}));
```

### Holded Webhook Handler (Node.js)

```javascript
import express from 'express';

const app = express();
app.use(express.json());

// Handle Holded webhook for new expenses
app.post('/webhooks/holded/expense', async (req, res) => {
  const expense = req.body;
  
  // Map Holded expense to Immoral Finance format
  const immoral Expense = {
    category_id: mapCategoryId(expense.category),
    department_id: mapDepartmentId(expense.tags),
    description: expense.desc,
    amount: expense.total,
    expense_date: expense.date,
    vendor: expense.contactName,
    invoice_number: expense.number,
    metadata: {
      holded_id: expense.id,
      holded_sync: true
    }
  };
  
  // Post to Immoral Finance
  const response = await fetch('http://localhost:3002/events/expense-registered', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(immoralExpense)
  });
  
  res.json({ success: true });
});

app.listen(3100);
```

---

## 📋 Integration Checklist

### Pre-Integration
- [ ] Identify master data sources
- [ ] Map field equivalents between systems
- [ ] Define sync frequency
- [ ] Set up error handling strategy

### n8n Setup
- [ ] Install n8n (self-hosted or cloud)
- [ ] Create webhook endpoints
- [ ] Build automation workflows
- [ ] Test with sample data
- [ ] Monitor execution logs

### Holded Setup
- [ ] Obtain API key
- [ ] Map Immoral Finance categories to Holded
- [ ] Create sync workflows (n8n or custom)
- [ ] Test bidirectional sync
- [ ] Schedule periodic syncs

### Monitoring
- [ ] Set up logging for all integrations
- [ ] Configure alerts for failures
- [ ] Review sync status daily
- [ ] Audit data consistency weekly

---

## 🚨 Common Issues & Solutions

### Issue: Duplicate Entries

**Solution**: Use `metadata` field to store external IDs
```json
{
  "metadata": {
    "holded_id": "12345",
    "synced_at": "2026-01-30T10:00:00Z"
  }
}
```

Check for existing entries before creating:
```sql
SELECT * FROM expenses 
WHERE metadata->>'holded_id' = '12345';
```

### Issue: Category Mapping

**Solution**: Create mapping table
```sql
CREATE TABLE integration_mappings (
  external_system VARCHAR(50),
  external_id VARCHAR(100),
  internal_table VARCHAR(50),
  internal_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Issue: Sync Failures

**Solution**: Implement retry queue with exponential backoff
```javascript
async function syncWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await syncToExternalSystem(data);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}
```

---

## 📚 Additional Resources

- [n8n Documentation](https://docs.n8n.io)
- [Holded API Documentation](https://www.holded.com/api)
- [Webhook Best Practices](https://webhooks.dev)
