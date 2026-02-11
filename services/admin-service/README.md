# Admin Service - Immoral Finance App

Microservicio administrativo para gestión de P&L, matriz de facturación, gastos y períodos financieros.

## 🎯 Filosofía: Flexibilidad Total (Como Excel)

**IMPORTANTE**: Este servicio proporciona **cálculos sugeridos** pero **TODO es ed itable manualmente**.

- ✅ Las funciones SQL calculan valores sugeridos
- ✅ El usuario puede modificar CUALQUIER valor
- ✅ Negociaciones, fees, porcentajes = 100% configurables
- ✅ Como en Excel: si no te gusta el cálculo, cámbialo

## 📦 Instalación

```bash
cd services/admin-service
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start
```

## 🔧 Configuración

```env
PORT=3010
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=development
```

## 📚 API Endpoints

### Billing Matrix

#### POST /billing/calculate
Calcula facturación sugerida para un cliente/período.

**Request:**
```json
{
  "client_id": "uuid",
  "fiscal_year": 2026,
  "fiscal_month": 1,
  "save": false  // true = guarda,false = solo preview
}
```

**Response:**
```json
{
  "success": true,
  "saved": false,
  "message": "Billing calculated (not saved - preview only)",
  "calculation": {
    "total_investment": 5000,
    "platform_count": 2,
    "suggested_fee_pct": 40,
    "suggested_platform_costs": 1000,
    "calculated_fee": 3000,
    "immedia_total": 3000,
    "imcontent_total": 0,
    "immoralia_total": 0,
    "grand_total": 3000
  },
  "note": "All values are editable. Use PATCH /billing/:id to modify."
}
```

#### PATCH /billing/:id
Edita valores de facturación manualmente.

**Request:**
```json
{
  "applied_fee_percentage": 35,  // Cambiar fee%
  "fee_paid": 2500,  // Cambiar fee manualmente
  "notes": "Cliente negoció descuento especial"
}
```

#### POST /billing/details
Agrega línea de servicio (como fila en Excel).

```json
{
  "monthly_billing_id": "uuid",
  "department_id": "uuid",
  "service_name": "Consultoría extra",
  "amount": 1500
}
```

### Expenses

#### POST /expenses/prorate-preview
Preview de prorrateo de gastos generales.

**Request:**
```json
{
  "fiscal_year": 2026,
  "fiscal_month": 1
}
```

**Response:**
```json
{
  "success": true,
  "preview": true,
  "total_general_expenses": 10000,
  "by_department": [{
    "department_name": "Imcontent",
    "proration_pct": 52,
    "prorated_amount": 5200
  }]
}
```

#### POST /expenses/prorate-execute
Ejecuta prorrateo (crea registros).

#### POST /expenses
Agrega gasto manualmente.

```json
{
  "fiscal_year": 2026,
  "fiscal_month": 1,
  "department_id": "uuid",
  "expense_category_id": "uuid",
  "amount": 1500,
  "description": "Alquiler oficina",
  "payment_date": "2026-01-15",
  "vendor": "Propietario S.L."
}
```

#### PATCH /expenses/:id
Edita gasto (flexibilidad total).

### Periods

#### POST /per iods/close
Cierra período financiero (solo admin).

```json
{
  "fiscal_year": 2026,
  "fiscal_month": 1,
  "closed_by": "user-uuid"
}
```

#### POST /periods/reopen
Reabre período (solo admin).

#### GET /periods/:year/:month/status
Verifica si período está cerrado.

## 🔄 Flujo de Trabajo Típico

### 1. Inicio de Mes: Calcular Facturación

```bash
# Preview primero
curl -X POST http://localhost:3010/billing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "uuid-cliente",
    "fiscal_year": 2026,
    "fiscal_month": 1,
    "save": false
  }'

# Si está correcto, guardar
# ... mismo request con "save": true

# O editar manualmente después
curl -X PATCH http://localhost:3010/billing/uuid-billing \
  -H "Content-Type: application/json" \
  -d '{"fee_paid": 2800}'
```

### 2. Durante el Mes: Registrar Gastos

```bash
# Agregar gastos manualmente
curl -X POST http://localhost:3010/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "fiscal_year": 2026,
    "fiscal_month": 1,
    "department_id": "uuid",
    "expense_category_id": "uuid",
    "amount": 1200,
    "description": "Software subscription"
  }'
```

### 3. Fin de Mes: Prorratear y Cerrar

```bash
# 1. Preview prorrateo
curl -X POST http://localhost:3010/expenses/prorate-preview \
  -H "Content-Type: application/json" \
  -d '{"fiscal_year": 2026, "fiscal_month": 1}'

# 2. Ejecutar prorrateo
curl -X POST http://localhost:3010/expenses/prorate-execute \
  -H "Content-Type: application/json" \
  -d '{"fiscal_year": 2026, "fiscal_month": 1}'

# 3. Cerrar período
curl -X POST http://localhost:3010/periods/close \
  -H "Content-Type: application/json" \
  -d '{"fiscal_year": 2026, "fiscal_month": 1}'
```

## 🛡️ Validaciones

- ✅ Período cerrado = no se puede editar (solo admin reabre)
- ✅ Validación de campos (Joi)
- ✅ Tipos de dato correctos
- ⚠️ **NO valida** lógica de negocio rígida (el usuario decide)

## 🔑 Puntos Clave

1. **Sugerencias, no imposiciones**: Los cálculos son helpers
2. **Edición manual siempre disponible**: Como Excel
3. **Períodos cerrados**: Para evitar cambios accidentales
4. **Service Role**: Este servicio usa service_role (bypassa RLS)

## 🚀 Siguientes Pasos

```bash
# 1. Aplicar funciones SQL en Supabase
# Ejecutar: database/functions_v2.sql

# 2. Instalar dependencias
npm install

# 3. Configurar .env
cp .env.example .env

# 4. Iniciar servicio
npm run dev

# 5. Probar health check
curl http://localhost:3010/health
```

## 📋 Dependencias

- **Express**: Web framework
- **@supabase/supabase-js**: Supabase client
- **Joi**: Validación de datos
- **Helmet**: Security headers
- **Morgan**: HTTP logging
- **CORS**: Cross-origin requests

## 📝 Notas

- Puerto por defecto: **3010**
- Usa Supabase **service_role** key (bypassa RLS)
- Diseñado para máxima flexibilidad
- Todo editable como en Excel
