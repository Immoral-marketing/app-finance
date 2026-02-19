import express from 'express';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import supabase from '../config/supabase.js';

const router = express.Router();

// ============================================================
// CHAT FINANCIERO CON IA — Dual Provider: GPT-4o → Gemini
//
// FUENTES DE DATOS (igual que Dashboard y P&L):
//   Ingresos    → billing_details (por depto) / monthly_billing (total)
//   Gastos op.  → actual_expenses
//   Nómina      → monthly_payroll.total_company_cost
//   EBITDA      → ingresos - gastos - nómina
//   Empleados   → employees + salary_history
//
// REGLA FUNDAMENTAL: La IA NUNCA inventa datos.
// Solo redacta respuestas con datos que le provea el backend.
// ============================================================

const SYSTEM_PROMPT = `Eres DANIA, el asistente financiero de Immoral Marketing Group.

REGLAS ABSOLUTAS:
1. Solo hablas de datos que te sean proporcionados explícitamente en este mensaje.
2. NUNCA inventes cifras, porcentajes, nombres o datos financieros.
3. Si no hay datos disponibles → di exactamente: "No tengo datos disponibles para esta consulta."
4. Si los datos son parciales o incompletos → adviértelo claramente.
5. NUNCA asumas tendencias ni hagas estimaciones no presentes en los datos.

Formato:
- Español profesional, claro y directo.
- Números con separador de miles (ej: 125.000 €) y signo € al final.
- Porcentajes con 1 decimal.
- Máximo 4 párrafos. Usa negritas para cifras clave.`;

const CLASSIFIER_PROMPT = `Clasifica la intención del mensaje de un chatbot financiero empresarial.
Responde ÚNICAMENTE con JSON válido sin markdown ni texto adicional:
{
  "type": "query" | "general",
  "entity": "kpis" | "pl_revenue" | "pl_expenses" | "dept_summary" | "payroll" | "billing" | "employees" | "salary_history" | "comparison" | "unknown",
  "dept": "<nombre o código de departamento si se menciona, o null>"
}
- kpis / pl_summary: EBITDA, margen, rentabilidad general
- pl_revenue / billing: ingresos, facturación, ventas
- pl_expenses: gastos, costos, egresos
- dept_summary: departamento específico (ingresos + gastos)
- payroll: nómina anual total
- employees: trabajadores, personal, plantilla, quién trabaja en X
- salary_history: cambios de sueldo, últimas modificaciones salariales, incrementos
- comparison: real vs presupuesto
- general: saludos, preguntas no financieras`;

/**
 * POST /chat
 */
router.post('/', async (req, res) => {
    const { message, userRole, deptCode, year = new Date().getFullYear() } = req.body;

    if (!message?.trim()) return res.status(400).json({ error: 'Mensaje vacío' });

    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;

    if (!hasOpenAI && !hasGemini) {
        return res.status(500).json({ error: 'Sin proveedor de IA configurado. Añade OPENAI_API_KEY o GEMINI_API_KEY al .env.' });
    }

    try {
        // ── FASE 1: Clasificar intención ──────────────────────────────────────
        const intent = await classifyIntent(message, hasOpenAI, hasGemini);

        // ── FASE 2: Obtener datos reales de la BD ────────────────────────────
        const isDeptHead = userRole === 'dept_head';
        const { data: financialData, description: dataDesc } = await fetchData(intent, year, isDeptHead, deptCode);

        // ── FASE 3: Generar respuesta ────────────────────────────────────────
        const reply = await generateResponse(message, financialData, dataDesc, hasOpenAI, hasGemini);

        res.json({ reply, intent: intent.type, entity: intent.entity });

    } catch (err) {
        console.error('Chat error:', err.message || err);
        res.status(500).json({ error: 'Error procesando tu pregunta. Inténtalo de nuevo.' });
    }
});

// ── Clasificador ──────────────────────────────────────────────────────────────

async function classifyIntent(message, hasOpenAI, hasGemini) {
    const prompt = `${CLASSIFIER_PROMPT}\n\nMensaje: "${message}"`;
    let raw = null;

    if (hasOpenAI) {
        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const r = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 120, temperature: 0
            });
            raw = r.choices[0].message.content;
        } catch (err) {
            if (!hasGemini || !(err.status === 403 || err.message?.includes('supported'))) {
                console.warn('OpenAI classifier error:', err.message);
            }
        }
    }

    if (!raw && hasGemini) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const r = await model.generateContent(prompt);
            raw = r.response.text();
        } catch (err) {
            console.warn('Gemini classifier error:', err.message);
        }
    }

    if (!raw) return { type: 'general', entity: 'unknown', dept: null };
    try {
        return JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
        return { type: 'general', entity: 'unknown', dept: null };
    }
}

// ── Generador de respuesta ────────────────────────────────────────────────────

async function generateResponse(message, financialData, dataDesc, hasOpenAI, hasGemini) {
    let dataContext;
    if (!financialData) {
        dataContext = 'No se pudieron obtener datos de la base de datos para esta pregunta.';
    } else if (financialData.restricted) {
        dataContext = 'El usuario no tiene permisos para acceder a estos datos.';
    } else {
        dataContext = `Datos recuperados de la base de datos (${dataDesc}):\n${JSON.stringify(financialData, null, 2)}`;
    }

    const prompt = `${SYSTEM_PROMPT}\n\nDATOS REALES DE LA BASE DE DATOS:\n${dataContext}\n\nPREGUNTA DEL USUARIO: "${message}"\n\nResponde ÚNICAMENTE con los datos de arriba.`;

    let reply = null;

    if (hasOpenAI) {
        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const r = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 700, temperature: 0.1
            });
            reply = r.choices[0].message.content;
            console.log('Chat: respuesta generada con GPT-4o');
        } catch (err) {
            if (err.status === 403 || err.message?.includes('supported')) {
                console.log('Chat: GPT-4o no disponible en esta región, usando Gemini como fallback');
            } else {
                console.warn('OpenAI response error:', err.message);
            }
        }
    }

    if (!reply && hasGemini) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const r = await model.generateContent(prompt);
            reply = r.response.text();
            console.log('Chat: respuesta generada con Gemini');
        } catch (err) {
            console.error('Gemini response error:', err.message);
        }
    }

    return reply || 'No pude generar una respuesta en este momento. Inténtalo de nuevo.';
}

// ── Enrutador de datos ────────────────────────────────────────────────────────

async function fetchData(intent, year, isDeptHead, deptCode) {
    if (intent.type !== 'query') return { data: null, description: '' };

    const deptFilter = isDeptHead ? deptCode : (intent.dept || null);
    const { entity } = intent;

    try {
        if (entity === 'kpis' || entity === 'comparison') {
            return { data: await getKPIs(year), description: `KPIs financieros ${year}` };
        }
        if (entity === 'pl_revenue' || entity === 'billing') {
            return { data: await getRevenue(year, deptFilter), description: `Ingresos ${year}${deptFilter ? ' · ' + deptFilter : ''}` };
        }
        if (entity === 'pl_expenses') {
            return { data: await getExpenses(year, deptFilter), description: `Gastos ${year}${deptFilter ? ' · ' + deptFilter : ''}` };
        }
        if (entity === 'dept_summary') {
            return { data: await getDeptSummary(year, deptFilter), description: `Resumen de departamento${deptFilter ? ': ' + deptFilter : 's'} ${year}` };
        }
        if (entity === 'payroll') {
            if (isDeptHead) return { data: { restricted: true }, description: '' };
            return { data: await getPayroll(year), description: `Nómina ${year}` };
        }
        if (entity === 'employees') {
            return { data: await getEmployees(deptFilter), description: `Empleados${deptFilter ? ' del departamento ' + deptFilter : ''}` };
        }
        if (entity === 'salary_history') {
            return { data: await getSalaryHistory(deptFilter), description: 'Historial de cambios salariales' };
        }
    } catch (err) {
        console.error('DB fetch error:', err.message);
    }

    return { data: null, description: '' };
}

// ── Helpers de consulta Supabase ─────────────────────────────────────────────
// FUENTES: mismas que dashboard.js y pl.js para consistencia de datos

async function getKPIs(year) {
    // Ingresos: billing_details JOIN monthly_billing (misma fuente que dashboard)
    const { data: bdData, error: bdErr } = await supabase
        .from('billing_details')
        .select('amount, monthly_billing!inner(fiscal_year)')
        .eq('monthly_billing.fiscal_year', year);
    if (bdErr) throw bdErr;

    // Gastos operativos: actual_expenses
    const { data: expData, error: expErr } = await supabase
        .from('actual_expenses')
        .select('amount')
        .eq('fiscal_year', year);
    if (expErr) throw expErr;

    // Nómina: monthly_payroll.total_company_cost (columna correcta)
    const { data: payData } = await supabase
        .from('monthly_payroll')
        .select('total_company_cost')
        .eq('fiscal_year', year);

    const totalRevenue = (bdData || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalExpenses = (expData || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalPayroll = (payData || []).reduce((s, r) => s + Number(r.total_company_cost || 0), 0);
    const totalCosts = totalExpenses + totalPayroll;
    const ebitda = totalRevenue - totalCosts;

    // Presupuesto ingresos: budget_lines
    const { data: budgetData } = await supabase
        .from('budget_lines')
        .select('jan,feb,mar,apr,may,jun,jul,aug,sep,oct,nov,dec')
        .eq('fiscal_year', year)
        .eq('line_type', 'revenue');
    const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const budgetTotal = (budgetData || []).reduce((s, r) => s + MONTHS.reduce((m, col) => m + Number(r[col] || 0), 0), 0);

    return {
        año: year,
        ingresos_reales: Math.round(totalRevenue),
        gastos_operativos: Math.round(totalExpenses),
        gastos_personal_nomina: Math.round(totalPayroll),
        total_costos: Math.round(totalCosts),
        ebitda: Math.round(ebitda),
        margen_ebitda_pct: totalRevenue > 0 ? +((ebitda / totalRevenue) * 100).toFixed(1) : 0,
        presupuesto_ingresos: Math.round(budgetTotal),
        desviacion_real_vs_budget: Math.round(totalRevenue - budgetTotal),
        nota: totalRevenue === 0 ? 'Sin datos de facturación para este año' : null
    };
}

async function getRevenue(year, deptFilter) {
    // billing_details agrupado por departamento (misma fuente que dashboard)
    const { data, error } = await supabase
        .from('billing_details')
        .select('amount, departments!inner(name, code), monthly_billing!inner(fiscal_year, fiscal_month)')
        .eq('monthly_billing.fiscal_year', year);

    if (error) throw error;
    if (!data?.length) return { nota: 'Sin datos de facturación para este año', año: year };

    const filtered = deptFilter
        ? data.filter(r => r.departments?.code === deptFilter || r.departments?.name?.toLowerCase().includes(deptFilter.toLowerCase()))
        : data;

    const total = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
    const byDept = {};
    filtered.forEach(r => {
        const dept = r.departments?.name || 'Sin departamento';
        byDept[dept] = (byDept[dept] || 0) + Number(r.amount || 0);
    });

    return {
        año: year,
        filtro: deptFilter || 'todos los departamentos',
        total_ingresos: Math.round(total),
        por_departamento: Object.fromEntries(
            Object.entries(byDept).sort(([, a], [, b]) => b - a).map(([d, v]) => [d, Math.round(v)])
        )
    };
}

async function getExpenses(year, deptFilter) {
    const { data: expData, error } = await supabase
        .from('actual_expenses')
        .select('amount, fiscal_month, departments(name, code), expense_categories(name)')
        .eq('fiscal_year', year);
    if (error) throw error;

    const { data: payData } = await supabase
        .from('monthly_payroll')
        .select('total_company_cost, employee:employees(department:departments(name, code))')
        .eq('fiscal_year', year);

    const filtered = deptFilter
        ? (expData || []).filter(r => r.departments?.code === deptFilter || r.departments?.name?.toLowerCase().includes(deptFilter.toLowerCase()))
        : (expData || []);

    const totalOp = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
    const byDept = {};
    filtered.forEach(r => {
        const dept = r.departments?.name || 'Sin depto';
        byDept[dept] = (byDept[dept] || 0) + Number(r.amount || 0);
    });
    const byCat = {};
    filtered.forEach(r => {
        const cat = r.expense_categories?.name || 'Otros';
        byCat[cat] = (byCat[cat] || 0) + Number(r.amount || 0);
    });

    const totalPayroll = (payData || []).reduce((s, r) => s + Number(r.total_company_cost || 0), 0);

    return {
        año: year,
        filtro: deptFilter || 'todos',
        gastos_operativos: Math.round(totalOp),
        gastos_personal_nomina: Math.round(totalPayroll),
        total: Math.round(totalOp + totalPayroll),
        por_departamento: Object.fromEntries(Object.entries(byDept).sort(([, a], [, b]) => b - a).map(([d, v]) => [d, Math.round(v)])),
        por_categoria: Object.fromEntries(Object.entries(byCat).sort(([, a], [, b]) => b - a).map(([c, v]) => [c, Math.round(v)]))
    };
}

async function getDeptSummary(year, deptName) {
    const { data: depts } = await supabase.from('departments').select('id, name, code, display_order').order('display_order');
    if (!depts?.length) return { nota: 'Sin departamentos' };

    const targets = deptName
        ? depts.filter(d => d.name?.toLowerCase().includes(deptName.toLowerCase()) || d.code?.toLowerCase().includes(deptName.toLowerCase()))
        : depts;

    if (!targets.length) return { nota: `Departamento "${deptName}" no encontrado` };

    const summaries = await Promise.all(targets.slice(0, 6).map(async (dept) => {
        // Ingresos del departamento: billing_details
        const { data: incData } = await supabase
            .from('billing_details')
            .select('amount, monthly_billing!inner(fiscal_year)')
            .eq('department_id', dept.id)
            .eq('monthly_billing.fiscal_year', year);

        // Gastos del departamento: actual_expenses
        const { data: expData } = await supabase
            .from('actual_expenses')
            .select('amount')
            .eq('fiscal_year', year)
            .eq('department_id', dept.id);

        // Empleados del departamento
        const { data: empData } = await supabase
            .from('employees')
            .select('id, first_name, last_name, position, current_salary, is_active')
            .eq('primary_department_id', dept.id)
            .eq('is_active', true);

        const ingresos = (incData || []).reduce((s, r) => s + Number(r.amount || 0), 0);
        const gastos = (expData || []).reduce((s, r) => s + Number(r.amount || 0), 0);
        const nominaTotal = (empData || []).reduce((s, e) => s + Number(e.current_salary || 0), 0);

        return {
            departamento: dept.name,
            codigo: dept.code,
            ingresos_reales: Math.round(ingresos),
            gastos_operativos: Math.round(gastos),
            nomina_base_anual: Math.round(nominaTotal * 12),
            resultado: Math.round(ingresos - gastos - (nominaTotal * 12)),
            empleados_activos: (empData || []).length
        };
    }));

    return { año: year, departamentos: summaries };
}

async function getPayroll(year) {
    const { data, error } = await supabase
        .from('monthly_payroll')
        .select('total_company_cost, gross_salary, fiscal_month, employee:employees(first_name, last_name, position, department:departments(name))')
        .eq('fiscal_year', year)
        .order('fiscal_month');

    if (error) throw error;
    if (!data?.length) return { nota: 'Sin nómina registrada para este año', año: year };

    const total = data.reduce((s, r) => s + Number(r.total_company_cost || 0), 0);
    const byMonth = {};
    data.forEach(r => {
        const m = `mes_${r.fiscal_month}`;
        byMonth[m] = (byMonth[m] || 0) + Number(r.total_company_cost || 0);
    });

    return {
        año: year,
        total_coste_empresa: Math.round(total),
        registros: data.length,
        por_mes: Object.fromEntries(Object.entries(byMonth).sort().map(([m, v]) => [m, Math.round(v)]))
    };
}

async function getEmployees(deptFilter) {
    let query = supabase
        .from('employees')
        .select('first_name, last_name, position, current_salary, hire_date, is_active, department:departments(name, code)')
        .order('last_name');

    const { data: allEmp, error } = await query;
    if (error) throw error;
    if (!allEmp?.length) return { nota: 'Sin empleados registrados' };

    const filtered = deptFilter
        ? allEmp.filter(e => e.department?.code === deptFilter || e.department?.name?.toLowerCase().includes(deptFilter.toLowerCase()))
        : allEmp;

    return {
        total: filtered.length,
        activos: filtered.filter(e => e.is_active).length,
        empleados: filtered.map(e => ({
            nombre: `${e.first_name} ${e.last_name}`,
            cargo: e.position,
            departamento: e.department?.name || 'Sin depto',
            salario_actual: e.current_salary,
            fecha_ingreso: e.hire_date,
            activo: e.is_active
        }))
    };
}

async function getSalaryHistory(deptFilter) {
    const { data, error } = await supabase
        .from('salary_history')
        .select('old_salary, new_salary, effective_from, change_reason, employee:employees(first_name, last_name, position, department:departments(name, code))')
        .order('effective_from', { ascending: false })
        .limit(30);

    if (error) throw error;
    if (!data?.length) return { nota: 'Sin historial de cambios salariales registrado' };

    const filtered = deptFilter
        ? data.filter(r => r.employee?.department?.code === deptFilter || r.employee?.department?.name?.toLowerCase().includes(deptFilter.toLowerCase()))
        : data;

    return {
        ultimos_cambios: filtered.slice(0, 20).map(r => ({
            empleado: r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : 'Desconocido',
            cargo: r.employee?.position,
            departamento: r.employee?.department?.name,
            salario_anterior: r.old_salary,
            salario_nuevo: r.new_salary,
            variacion: r.old_salary && r.new_salary ? Math.round(((r.new_salary - r.old_salary) / r.old_salary) * 100 * 10) / 10 : null,
            fecha_efectiva: r.effective_from,
            motivo: r.change_reason
        }))
    };
}

export default router;
