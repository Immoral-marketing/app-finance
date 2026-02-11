# Immoral Administrative System - Database Structure

## 📊 Complete Module Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  IMMORAL FINANCE APP - MODULES               │
└─────────────────────────────────────────────────────────────┘

1️⃣  P&L (PRESUPUESTO vs REAL)
    ├─ budget_lines           → Presupuesto anual por servicio/gasto
    ├─ actual_revenue         → Ingresos reales mensuales
    └─ actual_expenses        → Gastos reales mensuales
    
2️⃣  MATRIZ DE FACTURACIÓN
    ├─ monthly_billing        → Cálculo mensual por cliente
    ├─ billing_details        → Desglose por departamento/servicio
    └─ client_services        → Servicios activos por cliente
    
3️⃣  INVERSIÓN PUBLICITARIA
    ├─ ad_platforms           → Catálogo de plataformas
    └─ client_ad_investment   → Inversión mensual por cliente/plataforma
    
4️⃣  NEGOCIACIÓN DE FEES
    ├─ client_fee_tiers       → Escalas por cliente
    ├─ fee_tier_templates     → Plantillas de escalas
    └─ platform_cost_rules    → Costes por plataforma
    
5️⃣  COMISIONES
    ├─ partners                        → Partners/Referidos
    ├─ partner_clients                 → Asignación cliente-partner
    ├─ monthly_partner_commissions     → Comisiones pagadas
    ├─ commission_platforms            → Plataformas (WillMay, etc.)
    └─ monthly_platform_commissions    → Comisiones ganadas
    
6️⃣  GESTIÓN DE PAGOS
    └─ payment_schedule       → Pagos semanales con estados
    
7️⃣  RRHH / NÓMINAS
    ├─ employees                    → Empleados
    ├─ salary_history               → Historial salarial (inmutable)
    ├─ employee_department_splits   → División por departamento
    ├─ monthly_payroll              → Nóminas mensuales
    └─ payroll_department_splits    → División de costes
    
8️⃣  CORE / CONFIGURACIÓN
    ├─ companies              → DMK, Infinite
    ├─ departments            → Imcontent, Immedia, Immoralia, Immoral
    ├─ verticals              → Content Creation, Consulting, etc.
    ├─ services               → Catálogo de servicios
    ├─ expense_categories     → Categorías de gastos
    ├─ clients                → Clientes
    ├─ financial_periods      → Cierre mensual
    └─ audit_log              → Auditoría completa
```

## 🔄 Flujos de Datos Principales

### Flujo 1: Cierre Mensual (P&L)
```
1. Inversión Publicitaria (client_ad_investment)
   ↓
2. Matriz de Facturación (monthly_billing + billing_details)
   ↓  
3. Actual Revenue (por servicio/departamento)
   ↓
4. Gastos Reales (actual_expenses)
   ↓
5. Gastos Generales → Proration automática
   ↓
6. P&L Consolidado (Budget vs Real)
   ↓
7. Cierre de Período (financial_periods)
```

### Flujo 2: Cálculo de Fee Paid
```
1. Cliente invierte en plataformas (client_ad_investment)
   Total: €5,000 en Google Ads + Meta
   ↓
2. Sistema busca Fee Tier (client_fee_tiers)
   €5,000 → 40% fee + €1,600 coste plataformas
   ↓
3. Calcula Fee Paid
   5,000 × 0.40 + 1,600 = €3,600
   ↓
4. Agrega servicios adicionales (billing_details)
   + Immoralia: €2,000
   ↓
5. Total Factura = €5,600
   (pero separado por departamento)
   ↓
6. Se registra en actual_revenue
```

### Flujo 3: Nóminas con Splits
```
1. Empleado: Alba (employee)
   Sueldo: €2,500 + SS: €500 = €3,000 total
   ↓
2. Este mes trabajó en 2 departamentos
   (employee_department_splits)
   - 70% Imcontent
   - 30% Immedia
   ↓
3. Se crea payroll (monthly_payroll)
   Total: €3,000
   ↓
4. Se divide automáticamente (payroll_department_splits)
   - Imcontent: €2,100
   - Immedia: €900
   ↓
5. Se registra como gasto (actual_expenses)
   Por cada departamento
```

## 👥 Roles y Permisos

| Rol | Acceso | Puede Editar | Puede Cerrar Períodos |
|-----|--------|--------------|----------------------|
| **Admin/CFO** | Todo | Todo | ✅ Sí |
| **CEO/COO** | Todo | Limitado | ❌ No |
| **Department Head** | Su departamento | Su departamento | ❌ No |
| **Finance Assistant** | Operativo | Entrada datos | ❌ No |

## 📋 Archivos SQL

### 1. schema_v2.sql
**Contenido:**
- 30+ tablas
- Índices optimizados
- Constraints y validaciones
- Triggers de updated_at
- Datos iniciales (departamentos, empresas, plataformas)

**Ejecutar:** Primero (crea estructura)

### 2. sample_data.sql
**Contenido:**
- Servicios por departamento
- Categorías de gastos
- Clientes de ejemplo
- Fee tiers ejemplo
- Empleados ejemplo (Alba, Adrián, Yeray, Bruna, Carla)
- Partners y plataformas de comisión

**Ejecutar:** Segundo (datos de prueba)

### 3. rls_policies_v2.sql
**Contenido:**
- Funciones helper (is_admin, is_executive, etc.)
- Policies para todas las tablas
- Grants necesarios

**Ejecutar:** Tercero (seguridad)

## 🎯 Diferencias vs Schema Anterior

| Aspecto | V1 (Anterior) | V2 (Nuevo) |
|---------|---------------|------------|
| **Enfoque** | Facturación directa | Sistema administrativo completo |
| **Módulos** | 5 básicos | 8 completos |
| **P&L** | ❌ No | ✅ Sí (Presupuesto + Real) |
| **Matriz Facturación** | Limitado | ✅ Completo con fee calculation |
| **Inversión Pub** | ❌ No | ✅ Sí por plataforma |
| **Fee Negotiation** | ❌ No | ✅ Sí con escalas |
| **Comisiones** | Básico | ✅ Bidireccional (paid + earned) |
| **Pagos** | ❌ No | ✅ Gestión semanal completa |
| **RRHH** | Básico | ✅ Completo con splits |
| **Proration** | Manual | ✅ Automático (52/40/8%) |

## ✅ Checklist de Instalación

- [ ] Ejecutar `schema_v2.sql` en Supabase
- [ ] Ejecutar `sample_data.sql` en Supabase
- [ ] Ejecutar `rls_policies_v2.sql` en Supabase
- [ ] Crear usuarios en Authentication
- [ ] Asignar roles en `auth.users.raw_user_meta_data`
- [ ] Verificar con queries de prueba
- [ ] Obtener credenciales (URL + Keys)
- [ ] Configurar `.env` en los servicios

## 🔧 Queries Útiles de Verificación

```sql
-- Ver estructura de departamentos
SELECT 
  name, 
  code, 
  is_general, 
  proration_percentage 
FROM departments 
ORDER BY display_order;

-- Ver servicios por departamento
SELECT 
  d.name as department,
  s.name as service,
  s.service_type
FROM services s
JOIN departments d ON s.department_id = d.id
ORDER BY d.display_order, s.display_order;

-- Ver empleados con su departamento
SELECT 
  e.full_name,
  e.position,
  e.current_salary,
  d.name as department
FROM employees e
LEFT JOIN departments d ON e.primary_department_id = d.id
WHERE e.is_active = true;

-- Ver fee tiers de un cliente
SELECT 
  c.name as client,
  cft.min_investment,
  cft.max_investment,
  cft.fee_percentage,
  cft.fixed_cost
FROM client_fee_tiers cft
JOIN clients c ON cft.client_id = c.id
WHERE c.name = 'The Converter'
ORDER BY cft.min_investment;

-- Verificar proration de departamentos
SELECT 
  name,
  proration_percentage,
  CASE WHEN is_general THEN 'FUENTE' ELSE 'RECEPTOR' END as tipo
FROM departments
ORDER BY is_general DESC, proration_percentage DESC;
```

## 🚀 Next Steps

1. ✅ Aplicar SQL a Supabase
2. ✅ Configurar usuarios y roles
3. 🔄 Crear funciones SQL para cálculos automáticos
4. 🔄 Desarrollar microservices
5. 🔄 Construir frontend React
