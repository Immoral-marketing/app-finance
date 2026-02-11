# Admin Service - Test Endpoints

Guía para probar los endpoints del servicio administrativo.

## 🔧 Setup

El servicio debe estar corriendo:
```bash
npm run dev
# Running on http://localhost:3010
```

## 📊 1. Health Check

```bash
curl http://localhost:3010/health
```

**Esperado:**
```json
{
  "service": "admin-service",
  "status": "healthy",
  "timestamp": "2026-01-31T...",
  "version": "1.0.0"
}
```

## 💰 2. Testing Billing Matrix

### 2.1 Calcular facturación (Preview)

Primero necesitas tener:
- Un cliente en la BD
- Inversión publicitaria registrada
- Fee tiers configurados

```bash
# Preview de cálculo (no guarda)
curl -X POST http://localhost:3010/billing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "UUID-DE-TU-CLIENTE",
    "fiscal_year": 2026,
    "fiscal_month": 1,
    "save": false
  }'
```

**Esperado:**
```json
{
  "success": true,
  "saved": false,
  "message": "Billing calculated (not saved - preview only)",
  "calculation": {
    "total_investment": 5000.00,
    "platform_count": 2,
    "suggested_fee_pct": 10.00,
    "suggested_platform_costs": 1000.00,
    "calculated_fee_paid": 1500.00,
    "immedia_total": 1500.00,
    "imcontent_total": 0.00,
    "immoralia_total": 0.00,
    "grand_total": 1500.00
  }
}
```

### 2.2 Guardar cálculo

```bash
# Mismo request con save: true
curl -X POST http://localhost:3010/billing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "UUID-DE-TU-CLIENTE",
    "fiscal_year": 2026,
    "fiscal_month": 1,
    "save": true
  }'
```

### 2.3 Editar facturación manualmente

```bash
# Cambiar el fee manualmente (flexibilidad total)
curl -X PATCH http://localhost:3010/billing/UUID-BILLING \
  -H "Content-Type: application/json" \
  -d '{
    "applied_fee_percentage": 12,
    "fee_paid": 1800,
    "notes": "Cliente negoció fee especial"
  }'
```

### 2.4 Agregar servicios adicionales

```bash
# Agregar servicio de Immoralia
curl -X POST http://localhost:3010/billing/details \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_billing_id": "UUID-BILLING",
    "department_id": "UUID-IMMORALIA",
    "service_name": "Gestión de redes sociales",
    "amount": 2000,
    "notes": "Servicio mensual"
  }'
```

## 💸 3. Testing Expenses

### 3.1 Agregar gasto

```bash
curl -X POST http://localhost:3010/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "fiscal_year": 2026,
    "fiscal_month": 1,
    "department_id": "UUID-IMMEDIA",
    "expense_category_id": "UUID-CATEGORIA",
    "amount": 1500,
    "description": "Alquiler oficina enero",
    "vendor": "Inmobiliaria XYZ",
    "payment_date": "2026-01-15"
  }'
```

### 3.2 Preview de prorrateo

```bash
curl -X POST http://localhost:3010/expenses/prorate-preview \
  -H "Content-Type: application/json" \
  -d '{
    "fiscal_year": 2026,
    "fiscal_month": 1
  }'
```

**Esperado:**
```json
{
  "success": true,
  "preview": true,
  "total_general_expenses": 5000.00,
  "total_prorated": 5000.00,
  "by_department": [
    {
      "department_name": "Imcontent",
      "department_code": "IMCONT",
      "proration_pct": 52.00,
      "total_general_expenses": 5000.00,
      "prorated_amount": 2600.00
    },
    {
      "department_name": "Immedia",
      "department_code": "IMMED",
      "proration_pct": 40.00,
      "total_general_expenses": 5000.00,
      "prorated_amount": 2000.00
    },
    {
      "department_name": "Immoralia",
      "department_code": "IMMOR",
      "proration_pct": 8.00,
      "total_general_expenses": 5000.00,
      "prorated_amount": 400.00
    }
  ]
}
```

### 3.3 Ejecutar prorrateo

```bash
curl -X POST http://localhost:3010/expenses/prorate-execute \
  -H "Content-Type: application/json" \
  -d '{
    "fiscal_year": 2026,
    "fiscal_month": 1
  }'
```

### 3.4 Ver gastos de un período

```bash
# Todos los gastos de enero 2026
curl http://localhost:3010/expenses/2026/1

# Gastos de un departamento específico
curl "http://localhost:3010/expenses/2026/1?department_id=UUID-DEPT"
```

## 📅 4. Testing Periods

### 4.1 Ver estado de un período

```bash
curl http://localhost:3010/periods/2026/1/status
```

### 4.2 Cerrar período (Admin only)

```bash
curl -X POST http://localhost:3010/periods/close \
  -H "Content-Type: application/json" \
  -d '{
    "fiscal_year": 2026,
    "fiscal_month": 1,
    "closed_by": "UUID-ADMIN-USER"
  }'
```

### 4.3 Reabrir período

```bash
curl -X POST http://localhost:3010/periods/reopen \
  -H "Content-Type: application/json" \
  -d '{
    "fiscal_year": 2026,
    "fiscal_month": 1,
    "reopened_by": "UUID-ADMIN-USER"
  }'
```

### 4.4 Listar todos los períodos

```bash
curl http://localhost:3010/periods
```

## 🔄 Flujo Completo de Mes

```bash
# 1. Registrar inversión publicitaria (directamente en BD o via otro servicio)

# 2. Calcular facturación preview
curl -X POST http://localhost:3010/billing/calculate \
  -H "Content-Type: application/json" \
  -d '{"client_id": "...", "fiscal_year": 2026, "fiscal_month": 1, "save": false}'

# 3. Si está bien, guardar
curl -X POST http://localhost:3010/billing/calculate \
  -H "Content-Type: application/json" \
  -d '{"client_id": "...", "fiscal_year": 2026, "fiscal_month": 1, "save": true}'

# 4. O editar manualmente
curl -X PATCH http://localhost:3010/billing/UUID \
  -H "Content-Type: application/json" \
  -d '{"fee_paid": 1800}'

# 5. Agregar gastos del mes
curl -X POST http://localhost:3010/expenses \
  -H "Content-Type: application/json" \
  -d '{"fiscal_year": 2026, "fiscal_month": 1, ...}'

# 6. Prorratear gastos generales
curl -X POST http://localhost:3010/expenses/prorate-execute \
  -H "Content-Type: application/json" \
  -d '{"fiscal_year": 2026, "fiscal_month": 1}'

# 7. Cerrar período
curl -X POST http://localhost:3010/periods/close \
  -H "Content-Type: application/json" \
  -d '{"fiscal_year": 2026, "fiscal_month": 1}'
```

## 🛠️ Obtener UUIDs necesarios

Para probar, necesitas obtener los UUIDs de tu BD:

```sql
-- Clientes
SELECT id, name FROM clients LIMIT 5;

-- Departamentos
SELECT id, name, code FROM departments;

-- Categorías de gastos
SELECT id, name, code FROM expense_categories LIMIT 10;

-- Ver servicios
SELECT id, name, department_id FROM services;
```

## ✅ Checklist de Pruebas

- [ ] Health check funciona
- [ ] Calcular facturación (preview)
- [ ] Calcular facturación (guardar)
- [ ] Editar facturación manualmente
- [ ] Agregar servicio adicional
- [ ] Agregar gasto
- [ ] Preview prorrateo
- [ ] Ejecutar prorrateo
- [ ] Ver gastos de período
- [ ] Verificar estado de período
- [ ] Cerrar período
- [ ] Intentar editar período cerrado (debe fallar)
- [ ] Reabrir período
- [ ] Listar períodos

## 💡 Tips

1. **Usa Postman o Insomnia** para guardar las requests y no escribir curl cada vez
2. **Periodo cerrado** = no se puede editar (buena práctica contable)
3. **Todo es editable** mientras el período esté abierto
4. **Preview primero** antes de ejecutar acciones automáticas
