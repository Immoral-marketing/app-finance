# Immoral Finance App - Microservices Overview

Complete backend architecture with 3 microservices for administrative management.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React PWA)                    │
│                    http://localhost:5173                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼────────┐ ┌─▼──────────────┐
│ Admin Service│ │   Payroll  │ │  Commissions   │
│   Port 3010  │ │   Service  │ │    Service     │
│              │ │ Port 3011  │ │   Port 3012    │
└──────┬───────┘ └─────┬──────┘ └────────┬───────┘
       │               │                  │
       └───────────────┼──────────────────┘
                       │
              ┌────────▼─────────┐
              │   Supabase DB    │
              │   PostgreSQL     │
              └──────────────────┘
```

## 📦 Microservices

### 1. Admin Service (Port 3010) ✅

**Responsabilidades:**
- Matriz de facturación (billing matrix)
- Gestión de gastos
- Prorrateo automático de gastos generales
- Cierre/reapertura de períodos financieros

**Endpoints principales:**
```
POST   /billing/calculate          - Calcular facturación sugerida
PATCH  /billing/:id                - Editar facturación manualmente
POST   /billing/details            - Agregar servicios
POST   /expenses                   - Registrar gasto
POST   /expenses/prorate-execute   - Prorratear gastos generales
POST   /periods/close              - Cerrar período
```

**Filosofía:** Sugerencias automáticas + edición manual total (como Excel)

---

### 2. Payroll Service (Port 3011) ✅

**Responsabilidades:**
- Gestión de empleados (CRUD)
- Historial salarial inmutable
- Nóminas mensuales
- División automática por departamento (splits)

**Endpoints principales:**
```
GET    /employees                  - Listar empleados
POST   /employees                  - Crear empleado
PATCH  /employees/:id/salary       - Actualizar salario
POST   /payroll                    - Crear nómina
POST   /payroll/:id/splits         - Editar splits manualmente
GET    /payroll/:year/:month       - Nóminas de un período
```

**Características:**
- Historial de cambios de salario inmutable
- Auto-split por departamento (70% Immedia, 30% Imcontent, etc.)
- Override manual de distribución

---

### 3. Commissions Service (Port 3012) ✅

**Responsabilidades:**
- Comisiones PAGADAS a partners/referidos
- Comisiones GANADAS de plataformas (WillMay, etc.)
- Cálculo automático basado en facturación
- Tracking de pagos

**Endpoints principales:**
```
POST   /partners                            - Crear partner
POST   /partners/:id/clients                - Asignar cliente a partner
POST   /partners/commissions/calculate      - Calcular comisiones (all partners)
POST   /partners/commissions/:id/pay        - Marcar como pagado

POST   /platforms                           - Agregar plataforma
POST   /platforms/commissions               - Registrar comisión ganada
POST   /platforms/commissions/:id/receive   - Marcar como recibido
```

**Bidireccional:**
- **PAID**: Comisiones que pagamos a partners por referir clientes
- **EARNED**: Comisiones que ganamos de plataformas por referir nuestros clientes

---

## 🚀 Instalación y Ejecución

### Requisitos previos
- Node.js 18+
- npm o yarn
- Supabase project configurado

### 1. Admin Service

```bash
cd services/admin-service

# Copiar y configurar .env
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev

# Verificar
curl http://localhost:3010/health
```

### 2. Payroll Service

```bash
cd services/payroll-service

# Configurar .env (igual que admin-service pero PORT=3011)
cp .env.example .env

npm install
npm run dev

curl http://localhost:3011/health
```

### 3. Commissions Service

```bash
cd services/commissions-service

# Configurar .env (PORT=3012)
cp .env.example .env

npm install
npm run dev

curl http://localhost:3012/health
```

---

## 🔑 Configuración de Variables de Entorno

Cada servicio necesita un archivo `.env`:

```env
PORT=301X  # 3010, 3011, 3012
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NODE_ENV=development
```

**IMPORTANTE:** Usa la **service_role key**, NO la anon key.
- Service role bypassa RLS (necesario para operaciones admin)
- Obtén la clave en: Supabase Dashboard → Settings → API

---

## 📊 Base de Datos

### Archivos SQL (en orden de ejecución):

1. **schema_v2.sql** - Schema completo (30+ tablas)
2. **sample_data.sql** - Datos de ejemplo (departamentos, servicios, etc.)
3. **rls_policies_v2.sql** - Políticas de seguridad por rol
4. **functions_v2.sql** - Funciones de cálculo y helpers
5. **test_data_complete.sql** - Datos de prueba (enero 2026)

### Ejecutar en Supabase SQL Editor:
```sql
-- En orden:
-- 1. schema_v2.sql
-- 2. sample_data.sql
-- 3. rls_policies_v2.sql
-- 4. functions_v2.sql
-- 5. test_data_complete.sql (opcional, para testing)
```

---

## 🔄 Flujo de Trabajo Mensual

### Inicio de Mes
```bash
# 1. Registrar inversión publicitaria (en BD directamente o via futuro servicio)

# 2. Calcular facturación para cada cliente
curl -X POST http://localhost:3010/billing/calculate \
  -d '{"client_id": "...", "fiscal_year": 2026, "fiscal_month": 2, "save": true}'

# 3. Editar si es necesario (negociaciones especiales)
curl -X PATCH http://localhost:3010/billing/UUID \
  -d '{"fee_paid": 1800}'
```

### Durante el Mes
```bash
# Registrar gastos
curl -X POST http://localhost:3010/expenses \
  -d '{"fiscal_year": 2026, "fiscal_month": 2, "department_id": "...", "amount": 1500, ...}'

# Crear nóminas (auto-split por departamento)
curl -X POST http://localhost:3011/payroll \
  -d '{"employee_id": "...", "fiscal_year": 2026, "fiscal_month": 2, ...}'
```

### Fin de Mes
```bash
# 1. Prorratear gastos generales
curl -X POST http://localhost:3010/expenses/prorate-execute \
  -d '{"fiscal_year": 2026, "fiscal_month": 2}'

# 2. Calcular comisiones de partners
curl -X POST http://localhost:3012/partners/commissions/calculate \
  -d '{"fiscal_year": 2026, "fiscal_month": 2, "save": true}'

# 3. Cerrar período
curl -X POST http://localhost:3010/periods/close \
  -d '{"fiscal_year": 2026, "fiscal_month": 2}'
```

---

## 🛡️ Seguridad (RLS Policies)

Roles definidos:
- **Admin/CFO**: Acceso total + puede cerrar/reabrir períodos
- **CEO/COO**: Lectura completa, edición limitada
- **Department Head**: Solo su departamento
- **Finance Assistant**: Entrada de datos operativa

Las policies están en `rls_policies_v2.sql`.

---

## 🧪 Testing

### Test Scripts Disponibles:
- **test-endpoints.md** (Admin Service) - Guía completa con curl examples
- **test_data_complete.sql** - Datos de enero 2026 para probar

### Herramientas Recomendadas:
- **Postman** o **Insomnia** - Para guardar collections de requests
- **curl** - Para scripts de testing
- **Supabase Studio** - Para ver datos en tiempo real

---

## 📁 Estructura de Directorios

```
app finance/
├── database/
│   ├── schema_v2.sql
│   ├── sample_data.sql
│   ├── rls_policies_v2.sql
│   ├── functions_v2.sql
│   ├── test_data_complete.sql
│   └── DATABASE_STRUCTURE.md
│
├── services/
│   ├── admin-service/
│   │   ├── src/
│   │   │   ├── config/supabase.js
│   │   │   ├── routes/
│   │   │   │   ├── billing.js
│   │   │   │   ├── expenses.js
│   │   │   │   └── periods.js
│   │   │   └── index.js
│   │   ├── package.json
│   │   ├── .env.example
│   │   ├── README.md
│   │   └── test-endpoints.md
│   │
│   ├── payroll-service/
│   │   ├── src/
│   │   │   ├── config/supabase.js
│   │   │   ├── routes/
│   │   │   │   ├── employees.js
│   │   │   │   └── payroll.js
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── commissions-service/
│       ├── src/
│       │   ├── config/supabase.js
│       │   ├── routes/
│       │   │   ├── partners.js
│       │   │   └── platforms.js
│       │   └── index.js
│       ├── package.json
│       └── .env.example
│
└── README.md
```

---

## ✅ Estado del Proyecto

**Backend (Microservicios):**
- [x] Admin Service - COMPLETO
- [x] Payroll Service - COMPLETO
- [x] Commissions Service - COMPLETO
- [ ] Ad Investment Service (opcional - puede manejarse en admin)
- [ ] Payment Management Service (opcional - puede manejarse en admin)

**Base de Datos:**
- [x] Schema completo (8 módulos)
- [x] RLS Policies
- [x] SQL Functions
- [x] Datos de ejemplo
- [ ] Materialized Views (para optimizar dashboards)

**Frontend:**
- [ ] Setup de React PWA
- [ ] Autenticación con Supabase
- [ ] Dashboard principal
- [ ] Módulos por servicio

---

## 🎯 Próximos Pasos

1. **Probar microservicios** con datos reales
2. **Configurar CORS** correctamente cuando haya frontend
3. **Crear materialized views** para dashboards rápidos
4. **Desarrollar frontend** React PWA
5. **Agregar tests** unitarios e integración
6. **Deploy** (Railway, Fly.io, o VPS)

---

## 💡 Notas Importantes

### Flexibilidad Total (Como Excel)
- Todos los cálculos son **SUGERENCIAS**
- Todo es **EDITABLE manualmente**
- Negociaciones, fees, splits = **100% configurables**

### Inmutabilidad donde importa
- **Salary history** - No se puede editar historial
- **Financial periods** - Cerrados = no editables (admin puede reabrir)
- **Audit log** - Tracking de cambios importantes

### Performance
- Usar **service_role key** (bypassa RLS) para operaciones admin
- Considerar **materialized views** para reportes pesados
- Índices ya están configurados en schema

---

## 📞 Soporte

Para preguntas sobre:
- **Base de datos**: Ver `DATABASE_STRUCTURE.md`
- **Admin Service**: Ver `services/admin-service/README.md`
- **Testing**: Ver `services/admin-service/test-endpoints.md`
- **Setup**: Ver `database/SETUP_GUIDE.md`
