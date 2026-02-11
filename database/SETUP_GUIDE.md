# Setup Guide - Immoral Finance App Database

## 🎯 Opciones de Instalación

Tienes **2 opciones** para configurar la base de datos:

### Opción 1: Nueva Base de Datos (RECOMENDADO) ✅

Si no tienes datos importantes en tu base de datos actual o quieres empezar limpio:

1. **Crear nuevo proyecto en Supabase** (o usar el actual y resetear)
2. **Aplicar los archivos SQL en este orden exacto:**

```bash
# Orden de ejecución:
1. schema_v2.sql        # Estructura completa
2. sample_data.sql      # Datos de ejemplo
3. rls_policies_v2.sql  # Permisos y seguridad
```

### Opción 2: Ver qué puedes aprovechar de tu BBDD actual

Si ya tienes datos en Supabase y quieres migrarlos:

1. **Exporta tus datos actuales** (por si acaso)
2. **Revisa qué tablas puedes reutilizar**
3. **Aplica el nuevo schema selectively**

---

## 📋 Paso a Paso - Nueva Base de Datos

### 1. Acceder a Supabase SQL Editor

1. Ve a tu proyecto en Supabase
2. Clic en **"SQL Editor"** en el menú lateral
3. Clic en **"New query"**

### 2. Aplicar Schema Principal

```sql
-- Copia y pega TODO el contenido de: schema_v2.sql
-- Ejecuta con el botón "Run" o Ctrl+Enter
```

✅ Deberías ver: `Success. No rows returned`

### 3. Cargar Datos de Ejemplo

```sql
-- Copia y pega TODO el contenido de: sample_data.sql
-- Ejecuta
```

✅ Esto crea:
- Departamentos: Imcontent, Immedia, Immoralia, Immoral
- Empresas: DMK, Infinite
- Plataformas publicitarias
- Clientes de ejemplo
- Servicios por departamento
- Categorías de gastos

### 4. Aplicar Permisos RLS

```sql
-- Copia y pega TODO el contenido de: rls_policies_v2.sql
-- Ejecuta
```

✅ Esto configura todos los permisos de acceso

---

## 👥 Configurar Usuarios y Roles

### Roles Disponibles

- **admin / cfo** - Acceso total, puede cerrar períodos
- **ceo / coo** - Vista completa, edición limitada
- **department_head** - Solo su departamento
- **finance_assistant** - Entrada de datos

### Crear Usuarios

1. **En Supabase**: Authentication → Users → "Add user"
2. Crea el usuario con email y contraseña
3. **Asignar rol** ejecutando este SQL:

```sql
-- Para Admin/CFO
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'admin',
  'full_name', 'Carlos Admin'
)
WHERE email = 'admin@immoral.com';

-- Para CEO
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'ceo',
  'full_name', 'María CEO'
)
WHERE email = 'ceo@immoral.com';

-- Para Department Head (necesita department_id)
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'department_head',
  'department_id', (SELECT id FROM departments WHERE code = 'IMCONT'),
  'full_name', 'Juan Imcontent'
)
WHERE email = 'head-imcontent@immoral.com';

-- Para Finance Assistant
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'finance_assistant',
  'full_name', 'Ana Asistente'
)
WHERE email = 'assistant@immoral.com';
```

---

## 🔐 Obtener Credenciales

1. Ve a **Settings → API** en Supabase
2. Copia estos valores:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJ... (anon public)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role - SECRET)
```

---

## ✅ Verificar Instalación

Ejecuta estas queries para verificar:

```sql
-- 1. Ver departamentos
SELECT * FROM departments ORDER BY display_order;

-- 2. Ver servicios por departamento
SELECT d.name as department, s.name as service
FROM services s
JOIN departments d ON s.department_id = d.id
ORDER BY d.display_order, s.display_order;

-- 3. Ver clientes
SELECT name, (SELECT name FROM verticals WHERE id = vertical_id) as vertical
FROM clients
WHERE is_active = true;

-- 4. Ver plataformas publicitarias
SELECT name, code, base_cost, additional_cost
FROM ad_platforms
WHERE is_active = true
ORDER BY display_order;

-- 5. Verificar RLS funciona
SELECT auth_role(); -- Debería retornar tu rol
```

---

## 📊 Módulos Creados

### ✅ 1. P&L (Presupuesto vs Real)
- `budget_lines` - Presupuesto anual
- `actual_revenue` - Ingresos reales mensuales
- `actual_expenses` - Gastos reales mensuales

### ✅ 2. Matriz de Facturación
- `monthly_billing` - Cálculo mensual por cliente
- `billing_details` - Desglose por departamento/servicio

### ✅ 3. Inversión Publicitaria
- `client_ad_investment` - Inversión por cliente/mes/plataforma

### ✅ 4. Negociación de Fees
- `client_fee_tiers` - Escalas de fee por cliente
- `platform_cost_rules` - Costes por plataforma

### ✅ 5. Comisiones
- `monthly_partner_commissions` - Comisiones pagadas
- `monthly_platform_commissions` - Comisiones ganadas

### ✅ 6. Gestión de Pagos
- `payment_schedule` - Pagos semanales con estados

### ✅ 7. RRHH / Nóminas
- `employees` - Empleados
- `salary_history` - Historial de cambios salariales
- `monthly_payroll` - Nóminas mensuales
- `employee_department_splits` - División por departamento

---

## 🔄 Migración desde BBDD Antigua

Si tienes datos en la estructura anterior:

### Opción A: Export/Import Manual
1. Exporta datos de tablas compatibles (clients, departments, etc.)
2. Carga en nueva estructura

### Opción B: Script de Migración
Si tienes muchos datos, puedo crear un script de migración específico

---

## ⚠️ Importante

1. ✅ **Backup primero**: Siempre haz backup antes de aplicar cambios
2. ✅ **Service Role Key**: Nunca expongas la service_role_key en el frontend
3. ✅ **RLS Activo**: Verifica que RLS esté habilitado en todas las tablas
4. ✅ **Usuarios**: Asigna roles correctamente en `auth.users.raw_user_meta_data`

---

## 📞 Próximos Pasos

1. ✅ Aplicar SQL files
2. ✅ Crear usuarios y asignar roles
3. ✅ Verificar que puedes acceder con diferentes roles
4. 🚀 Crear funciones SQL para cálculos automáticos
5. 🚀 Desarrollar frontend

---

## 🆘 Troubleshooting

### Error: "relation already exists"
- Ya existe una tabla con ese nombre
- Opción 1: DROP TABLE existente
- Opción 2: Usar nueva base de datos

### Error: "permission denied for table"
- RLS bloqueando acceso
- Verifica que el usuario tenga el rol correcto
- Verifica que las policies estén aplicadas

### No puedo ver datos
- Verifica tu rol: `SELECT auth_role();`
- Verifica RLS: `SELECT * FROM pg_policies;`
