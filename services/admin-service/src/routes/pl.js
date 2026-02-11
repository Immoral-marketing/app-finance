import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// Get P&L Summary for a specific year
router.get('/summary/:year', async (req, res) => {
    const { year } = req.params;

    try {
        // 1. Fetch Budget Lines
        const { data: budgetLines, error: budgetError } = await supabase
            .from('budget_lines')
            .select(`
        id,
        department_id,
        line_type,
        jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec,
        departments (name, code)
      `)
            .eq('fiscal_year', year);

        if (budgetError) throw budgetError;

        // 2. Fetch Actual Income (Billing)
        // We need to sum specific columns from monthly_billing based on departments
        const { data: billingData, error: billingError } = await supabase
            .from('monthly_billing')
            .select('*')
            .eq('fiscal_year', year);

        if (billingError) throw billingError;

        // 3. Fetch Actual Expenses
        const { data: expenseData, error: expenseError } = await supabase
            .from('actual_expenses')
            .select(`
        amount,
        fiscal_month,
        department_id,
        departments (name, code)
      `)
            .eq('fiscal_year', year);

        if (expenseError) throw expenseError;

        // 4. Process and Aggregate Data
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        // Initialize structure
        const summary = {
            income: { budget: Array(12).fill(0), real: Array(12).fill(0) },
            expenses: { budget: Array(12).fill(0), real: Array(12).fill(0) },
            margin: { budget: Array(12).fill(0), real: Array(12).fill(0) },
            departments: {}
        };

        // Helper to get Department Name safely
        const getDeptName = (item) => item.departments?.name || 'Unknown';

        // A. Process Budget
        budgetLines.forEach(line => {
            const deptName = getDeptName(line);
            const isIncome = line.line_type === 'revenue';

            if (!summary.departments[deptName]) {
                summary.departments[deptName] = {
                    income: { budget: Array(12).fill(0), real: Array(12).fill(0) },
                    expenses: { budget: Array(12).fill(0), real: Array(12).fill(0) }
                };
            }

            months.forEach((month, index) => {
                const val = Number(line[month] || 0);
                if (isIncome) {
                    summary.income.budget[index] += val;
                    summary.departments[deptName].income.budget[index] += val;
                } else {
                    summary.expenses.budget[index] += val;
                    summary.departments[deptName].expenses.budget[index] += val;
                }
            });
        });

        // B. Process Real Income (Billing)
        // Map billing columns to departments: immedia_total -> Immedia, imcontent_total -> Imcontent, etc.
        billingData.forEach(record => {
            const monthIdx = record.fiscal_month - 1;

            // Immedia
            const immediaVal = Number(record.immedia_total || 0);
            summary.income.real[monthIdx] += immediaVal;
            if (summary.departments['Immedia']) summary.departments['Immedia'].income.real[monthIdx] += immediaVal;

            // Imcontent
            const imcontentVal = Number(record.imcontent_total || 0);
            summary.income.real[monthIdx] += imcontentVal;
            if (summary.departments['Imcontent']) summary.departments['Imcontent'].income.real[monthIdx] += imcontentVal;

            // Immoralia
            const immoraliaVal = Number(record.immoralia_total || 0);
            summary.income.real[monthIdx] += immoraliaVal;
            if (summary.departments['Immoralia']) summary.departments['Immoralia'].income.real[monthIdx] += immoraliaVal;
        });

        // C. Process Real Expenses
        expenseData.forEach(expense => {
            const monthIdx = expense.fiscal_month - 1;
            const deptName = getDeptName(expense);
            const val = Number(expense.amount || 0);

            summary.expenses.real[monthIdx] += val;

            if (!summary.departments[deptName]) {
                // Init if not exists (might not have budget but has expenses)
                summary.departments[deptName] = {
                    income: { budget: Array(12).fill(0), real: Array(12).fill(0) },
                    expenses: { budget: Array(12).fill(0), real: Array(12).fill(0) }
                };
            }
            summary.departments[deptName].expenses.real[monthIdx] += val;
        });

        // D. Calculate Margins (Income - Expenses)
        months.forEach((_, i) => {
            summary.margin.budget[i] = summary.income.budget[i] - summary.expenses.budget[i];
            summary.margin.real[i] = summary.income.real[i] - summary.expenses.real[i];
        });

        res.json(summary);

    } catch (error) {
        console.error('Error fetching P&L data:', error);
        res.status(500).json({ error: 'Failed to fetch P&L data' });
    }
});

// ================================================
// NEW: P&L MATRIX ENDPOINT (Spreadsheet View)
// ================================================

/**
 * GET /pl/matrix/:year
 * Returns P&L data structured for spreadsheet display
 * Query params: type=budget|real (default: budget)
 */
router.get('/matrix/:year', async (req, res) => {
    const { year } = req.params;
    const type = req.query.type || 'budget'; // 'budget' or 'real'

    try {
        const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        // 1. Fetch Departments
        const { data: departments } = await supabase
            .from('departments')
            .select('id, name, code')
            .order('name');

        // 2. Fetch Services (for revenue line items)
        const { data: services } = await supabase
            .from('services')
            .select('id, name, code, department_id')
            .eq('is_active', true)
            .order('name');

        // 3. Fetch Expense Categories
        const { data: expenseCategories } = await supabase
            .from('expense_categories')
            .select('id, name, code, parent_category_id, is_general')
            .eq('is_active', true)
            .order('display_order');

        // 4. Fetch Employees (for personnel costs)
        const { data: employees } = await supabase
            .from('employees')
            .select('id, first_name, last_name, department_id')
            .eq('is_active', true);

        let sections = [];

        if (type === 'budget') {
            // BUDGET VIEW: Read from budget_lines table
            const { data: budgetLines } = await supabase
                .from('budget_lines')
                .select('*')
                .eq('fiscal_year', year);

            // Group by department for revenue
            const revenueByDept = {};
            const expensesByCategory = {};

            budgetLines?.forEach(line => {
                const values = MONTH_KEYS.map(k => Number(line[k] || 0));

                if (line.line_type === 'revenue') {
                    const dept = departments?.find(d => d.id === line.department_id);
                    const deptName = dept?.name || 'Otros';

                    // Resolve service name
                    let name = line.description;
                    if (line.service_id) {
                        const svc = services?.find(s => s.id === line.service_id);
                        if (svc) name = svc.name;
                    }
                    name = name || 'Sin descripción';

                    if (!revenueByDept[deptName]) revenueByDept[deptName] = { rows: [], subtotal: Array(12).fill(0) };

                    revenueByDept[deptName].rows.push({
                        id: line.id,
                        name,
                        values,
                        editable: true
                    });
                    values.forEach((v, i) => revenueByDept[deptName].subtotal[i] += v);
                } else {
                    // Expense
                    const cat = expenseCategories?.find(c => c.id === line.expense_category_id);
                    const catName = cat?.name || line.description || 'Otros Gastos';
                    const dept = departments?.find(d => d.id === line.department_id);
                    const deptName = dept?.name || 'Otros';

                    // Key by Dept + Cat to separate "Software - Immedia" from "Software - Immoralia"
                    const key = `${deptName}::${catName}`;

                    if (!expensesByCategory[key]) expensesByCategory[key] = {
                        dept: deptName,
                        name: catName,
                        rows: [],
                        subtotal: Array(12).fill(0)
                    };

                    expensesByCategory[key].rows.push({
                        id: line.id,
                        name: line.description || catName,
                        values,
                        editable: true
                    });
                    values.forEach((v, i) => expensesByCategory[key].subtotal[i] += v);
                }
            });

            // Build INGRESOS section
            const ingresoRows = [];
            let ingresoSubtotal = Array(12).fill(0);
            Object.entries(revenueByDept).forEach(([deptName, data]) => {
                ingresoRows.push({
                    type: 'header',
                    name: deptName,
                    values: data.subtotal
                });
                data.rows.forEach(row => ingresoRows.push({ ...row, type: 'item', dept: deptName }));
                data.subtotal.forEach((v, i) => ingresoSubtotal[i] += v);
            });

            sections.push({
                code: 'REVENUE',
                name: 'INGRESOS DE EXPLOTACIÓN',
                rows: ingresoRows,
                subtotal: ingresoSubtotal
            });

            // Build GASTOS section
            const gastoRows = [];
            let gastoSubtotal = Array(12).fill(0);
            Object.values(expensesByCategory).forEach((data) => {
                // We don't add headers here because frontend structure handles grouping by Department/Category in its own way?
                // Actually, frontend iterates EXPENSE_STRUCTURE.
                // It expects data to be in the "cellValues" map.
                // The rows here are just to transport values to frontend.
                // We should push items flattened.

                // data.subtotal contains the sum for this Dept+Category
                gastoRows.push({
                    type: 'item',
                    dept: data.dept,
                    name: data.name,
                    values: data.subtotal,
                    editable: true
                });

                data.subtotal.forEach((v, i) => gastoSubtotal[i] += v);
            });

            sections.push({
                code: 'EXPENSES',
                name: 'GASTOS DE EXPLOTACIÓN',
                rows: gastoRows,
                subtotal: gastoSubtotal
            });

            // EBITDA
            const ebitda = ingresoSubtotal.map((v, i) => v - gastoSubtotal[i]);
            sections.push({
                code: 'EBITDA',
                name: 'EBITDA',
                values: ebitda,
                calculated: true
            });

        } else {
            // ================================================
            // REAL VIEW: Read from billing_details by SERVICE
            // Special logic for Imfilms vertical
            // ================================================

            // 1. First fetch monthly_billing for the year
            const { data: allMonthlyBillings, error: mbError } = await supabase
                .from('monthly_billing')
                .select('id, fiscal_month, fiscal_year, fee_paid, client_id, client:clients(id, name, is_active, vertical:verticals(id, name))')
                .eq('fiscal_year', year);

            if (mbError) {
                console.error('Error fetching monthly_billing:', mbError);
            }

            // Filter to active clients only (Matrix only shows active clients)
            const monthlyBillings = allMonthlyBillings?.filter(mb => mb.client?.is_active === true) || [];

            // 2. Get the monthly_billing IDs for this year
            const mbIds = monthlyBillings.map(mb => mb.id);
            console.log('P&L Matrix - monthlyBillings total:', allMonthlyBillings?.length, 'active:', monthlyBillings.length);

            // 3. Fetch billing_details for those monthly_billing records
            let billingDetails = [];
            if (mbIds.length > 0) {
                const { data: details, error: bdError } = await supabase
                    .from('billing_details')
                    .select(`
                        id,
                        monthly_billing_id,
                        service_id,
                        amount,
                        service:services(code, name)
                    `)
                    .in('monthly_billing_id', mbIds);

                if (bdError) {
                    console.error('Error fetching billing_details:', bdError);
                }
                billingDetails = details || [];
            }

            console.log('P&L Matrix - billingDetails count:', billingDetails.length);

            // 3. Initialize revenue structure matching frontend EXACTLY
            const revenueData = {
                // Immedia
                'Paid General': Array(12).fill(0),        // PAID_MEDIA_STRATEGY minus Imfilms
                'Paid imfilms': Array(12).fill(0),        // PAID_MEDIA_STRATEGY for Imfilms clients
                'Setup inicial': Array(12).fill(0),       // PAID_MEDIA_SETUP
                // Imcontent
                'Branding': Array(12).fill(0),            // BRANDING
                'Diseño': Array(12).fill(0),              // CONTENT_DESIGN
                'Contenido con IA': Array(12).fill(0),    // AI_CONTENT
                'RRSS': Array(12).fill(0),                // SOCIAL_MEDIA_MGMT
                'Estrategia Digital': Array(12).fill(0),  // DIGITAL_STRATEGY
                'Influencers': Array(12).fill(0),         // INFLUENCER_UGC
                // Immoralia
                'Setup inicial IA': Array(12).fill(0),    // IMMORALIA_SETUP (renamed)
                'Automation': Array(12).fill(0),          // AGENCY_AUTO
                'Consultoría': Array(12).fill(0),         // CONSULTING_AUTO
                // Imloyal/Imseo
                'Web dev': Array(12).fill(0),             // WEB_DEV
                'CRM': Array(12).fill(0),                 // MKT_AUTO_EMAIL (marketing y email → CRM)
                'Comisiones': Array(12).fill(0),          // Manual entry
                'SEO': Array(12).fill(0),                 // SEO (only Imseo)
                // Immoral
                'Otros servicios': Array(12).fill(0),
                'Otras comisiones': Array(12).fill(0),
                // Special
                'Budget Nutfruit': Array(12).fill(0),
                'Captación': Array(12).fill(0),
            };

            // Service code to P&L row name mapping (Matrix column → P&L row)
            const serviceMapping = {
                // Immedia
                'PAID_MEDIA_SETUP': 'Setup inicial',
                // Imcontent
                'BRANDING': 'Branding',
                'CONTENT_DESIGN': 'Diseño',
                'AI_CONTENT': 'Contenido con IA',
                'SOCIAL_MEDIA_MGMT': 'RRSS',
                'DIGITAL_STRATEGY': 'Estrategia Digital',
                'INFLUENCER_UGC': 'Influencers',
                // Immoralia
                'IMMORALIA_SETUP': 'Setup inicial IA',
                'AGENCY_AUTO': 'Automation',
                'CONSULTING_AUTO': 'Consultoría',
                // Imloyal/Imseo
                'WEB_DEV': 'Web dev',
                'SEO': 'SEO',
                'MKT_AUTO_EMAIL': 'CRM',  // Marketing y email → CRM
            };

            // 4. Create lookup map for monthly_billing data
            const mbMap = {};
            monthlyBillings?.forEach(mb => {
                mbMap[mb.id] = mb;
            });

            // 5. Calculate Paid Media from fee_paid (SOURCE OF TRUTH = what Matrix shows)
            let totalPaidMedia = Array(12).fill(0);
            let imfilmsPaidMedia = Array(12).fill(0);

            monthlyBillings.forEach(mb => {
                const monthIdx = mb.fiscal_month - 1;
                const feePaid = Number(mb.fee_paid || 0);
                const verticalName = mb.client?.vertical?.name || '';

                if (feePaid > 0) {
                    totalPaidMedia[monthIdx] += feePaid;
                    if (verticalName.toLowerCase() === 'imfilms') {
                        imfilmsPaidMedia[monthIdx] += feePaid;
                    }
                }
            });

            // Paid General = Total - Imfilms
            for (let i = 0; i < 12; i++) {
                revenueData['Paid General'][i] = totalPaidMedia[i] - imfilmsPaidMedia[i];
                revenueData['Paid imfilms'][i] = imfilmsPaidMedia[i];
            }

            console.log('P&L Total Paid Media:', totalPaidMedia);
            console.log('P&L Paid General:', revenueData['Paid General']);
            console.log('P&L Paid Imfilms:', revenueData['Paid imfilms']);

            // 6. Process billing_details for other services (SKIP PAID_MEDIA_STRATEGY)
            billingDetails?.forEach(detail => {
                if (!detail.service) return;
                const mb = mbMap[detail.monthly_billing_id];
                if (!mb) return;

                const serviceCode = detail.service.code;
                if (serviceCode === 'PAID_MEDIA_STRATEGY') return;

                const monthIdx = mb.fiscal_month - 1;
                const amount = Number(detail.amount || 0);
                const plRow = serviceMapping[serviceCode];
                if (plRow && revenueData[plRow]) {
                    revenueData[plRow][monthIdx] += amount;
                }
            });

            // 6. Build sections for frontend
            const buildDeptRows = (dept, serviceNames) => {
                return serviceNames.map(name => ({
                    type: 'item',
                    dept,
                    name,
                    values: revenueData[name] || Array(12).fill(0),
                    editable: false
                }));
            };

            const allRows = [
                ...buildDeptRows('Immedia', ['Paid General', 'Paid imfilms', 'Setup inicial']),
                ...buildDeptRows('Imcontent', ['Branding', 'Diseño', 'Contenido con IA', 'RRSS', 'Estrategia Digital', 'Influencers']),
                ...buildDeptRows('Immoralia', ['Setup inicial IA', 'Automation', 'Consultoría']),
                ...buildDeptRows('Imloyal', ['Web dev', 'CRM', 'Comisiones']),
                ...buildDeptRows('Imseo', ['SEO', 'Comisiones']),
                ...buildDeptRows('Immoral', ['Otros servicios', 'Otras comisiones']),
                ...buildDeptRows('Imcontent', ['Budget Nutfruit']),
                ...buildDeptRows('Imsales', ['Captación']),
            ];

            // Calculate subtotals
            let ingresoSubtotal = Array(12).fill(0);
            allRows.forEach(row => {
                row.values.forEach((v, i) => ingresoSubtotal[i] += v);
            });

            sections.push({
                code: 'REVENUE',
                name: 'INGRESOS DE EXPLOTACIÓN',
                rows: allRows,
                subtotal: ingresoSubtotal
            });

            // ================================================
            // EXPENSES (from actual_expenses + payroll)
            // ================================================
            const { data: expenseData } = await supabase
                .from('actual_expenses')
                .select('*, category:expense_categories(name)')
                .eq('fiscal_year', year);

            const { data: payrollData } = await supabase
                .from('monthly_payroll')
                .select('*, employee:employees(first_name, last_name)')
                .eq('fiscal_year', year);

            // Aggregate Expenses by Dept + Category
            const expensesKeyed = {}; // Key: "Dept::Category"

            // Add Adspent blocks initialized (for structure)
            const adspentItems = [
                { dept: 'Immedia', cat: 'Adspent' },
                { dept: 'Imcontent', cat: 'Adspent Nutfruit' },
                { dept: 'Imcontent', cat: 'Influencers' }
            ];

            adspentItems.forEach(item => {
                const k = `${item.dept}::${item.cat}`;
                expensesKeyed[k] = { dept: item.dept, name: item.cat, values: Array(12).fill(0) };
            });

            // Map actual_expenses
            // Need department name for grouping
            const deptMap = {};
            departments?.forEach(d => deptMap[d.id] = d.name);

            expenseData?.forEach(exp => {
                const catName = exp.category?.name || 'Otros';
                const deptName = deptMap[exp.department_id] || 'Otros';
                const monthIdx = exp.fiscal_month - 1;
                const val = Number(exp.amount || 0);

                const key = `${deptName}::${catName}`;

                if (!expensesKeyed[key]) {
                    expensesKeyed[key] = { dept: deptName, name: catName, values: Array(12).fill(0) };
                }
                expensesKeyed[key].values[monthIdx] += val;
            });

            // Build GASTOS section
            const gastoRows = [];
            let gastoSubtotal = Array(12).fill(0);

            Object.values(expensesKeyed).forEach(data => {
                gastoRows.push({
                    type: 'item',
                    dept: data.dept,
                    name: data.name,
                    values: data.values,
                    editable: true
                });
                data.values.forEach((v, i) => gastoSubtotal[i] += v);
            });

            // Add Payroll as "Gastos de personal"
            const payrollByMonth = Array(12).fill(0);
            payrollData?.forEach(p => {
                const monthIdx = p.fiscal_month - 1;
                payrollByMonth[monthIdx] += Number(p.total_company_cost || 0);
            });

            // Need to push payroll row (no dept specific? Or assign to General? Or keep as is?)
            // Frontend structure lists "Jorge Orts" under Imsales, etc.
            // But general payroll is usually one lump sum or per person.
            // If the user wants specific names, they come from payrollData.
            // Let's create a row for "Gastos de personal" or split by person if that's what was there.
            // The previous code had: expensesByCategory['Gastos de personal'] = payrollByMonth.
            // Let's keep it simple and add it as a general item for now to avoid regression on totals.
            // However, expenses should probably be split by Dept if we want to be consistent?
            // "Expenses Structure" in frontend has "personalItems".
            // If I collapse all payroll into one line, it might not match frontend structure if it looks for specific people.
            // But fixing blank P&L is priority.
            // I'll add the aggregate "Gastos de personal" for now.

            gastoRows.push({
                type: 'item',
                dept: 'General', // Or 'Immoral' or leave undefined if not needed for matching (frontend key uses dept!)
                name: 'Gastos de personal',
                values: payrollByMonth,
                editable: false
            });
            payrollByMonth.forEach((v, i) => gastoSubtotal[i] += v);


            sections.push({
                code: 'EXPENSES',
                name: 'GASTOS DE EXPLOTACIÓN',
                rows: gastoRows,
                subtotal: gastoSubtotal
            });

            // EBITDA
            // Recalculate ingresoSubtotal from sections[REVENUE]
            const revenueSection = sections.find(s => s.code === 'REVENUE');
            const revenueSubtotal = revenueSection ? revenueSection.subtotal : Array(12).fill(0);

            const ebitda = revenueSubtotal.map((v, i) => v - gastoSubtotal[i]);
            sections.push({
                code: 'EBITDA',
                name: 'EBITDA',
                values: ebitda,
                calculated: true
            });
        }

        res.json({
            year: parseInt(year),
            type,
            columns: MONTHS,
            sections
        });

    } catch (error) {
        console.error('Error fetching P&L matrix:', error);
        res.status(500).json({ error: 'Failed to fetch P&L matrix' });
    }
});

/**
 * POST /pl/matrix/save
 * Save cell edit (Budget or Real)
 * Accepts dept name and item name to resolve IDs
 */
router.post('/matrix/save', async (req, res) => {
    const { year, month, dept, item, value, type, section } = req.body;
    // month is 1-12
    const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthKey = MONTH_KEYS[month - 1];

    try {
        console.log('--- SAVE REQUEST RECEIVED ---');
        console.log('Payload:', { year, month, dept, item, value, type, section });

        // 1. Resolve Department ID
        const { data: deptData, error: deptError } = await supabase
            .from('departments')
            .select('id')
            .eq('name', dept)
            .single();

        if (deptError || !deptData) {
            throw new Error(`Department not found: ${dept}`);
        }
        const departmentId = deptData.id;

        // 2. Resolve Category/Service ID
        let categoryId = null;
        let serviceId = null;

        if (section === 'revenue') {
            // For revenue, 'item' is the Service Name.
            // MUST filter by Department ID to be precise
            const { data: svcData } = await supabase
                .from('services')
                .select('id')
                .eq('name', item)
                .eq('department_id', departmentId) // Strict check
                .maybeSingle();

            if (svcData) {
                serviceId = svcData.id;
            } else {
                console.warn(`Service not found for ${dept} - ${item}`);
                // Fallback: Try to find by name only? No, risk of wrong dept.
                // If created by script, it should exist.
            }
        } else {
            // For expenses, 'item' is the Category Name
            const { data: catData } = await supabase
                .from('expense_categories')
                .select('id')
                .eq('name', item)
                .maybeSingle();

            if (catData) {
                categoryId = catData.id;
            } else {
                console.warn(`Category not found: ${item}`);
            }
        }

        if (type === 'budget') {
            // BUDGET SAVE
            if (!categoryId && !serviceId) throw new Error(`Category/Service not found for ${item} in ${dept}`);

            // Find existing budget line
            let query = supabase.from('budget_lines')
                .select('id')
                .eq('fiscal_year', year)
                .eq('department_id', departmentId)
                .eq('line_type', section === 'revenue' ? 'revenue' : 'expense');

            if (section === 'revenue') query = query.eq('service_id', serviceId);
            else query = query.eq('expense_category_id', categoryId);

            const { data: existingLines } = await query;
            const existingLine = existingLines?.[0];

            if (existingLine) {
                // Update
                await supabase.from('budget_lines')
                    .update({
                        [monthKey]: Number(value),
                        notes: item
                    })
                    .eq('id', existingLine.id);
            } else {
                // Insert
                await supabase.from('budget_lines').insert({
                    fiscal_year: year,
                    department_id: departmentId,
                    line_type: section === 'revenue' ? 'revenue' : 'expense',
                    service_id: serviceId,
                    expense_category_id: categoryId,
                    [monthKey]: Number(value),
                    notes: item
                });
            }

        } else {
            // REAL SAVE
            if (section === 'revenue') {
                return res.status(400).json({ error: 'Real revenue is read-only (comes from billing)' });
            }

            if (!categoryId) throw new Error(`Category not found for expense item: ${item}`);

            const { data: existingExp } = await supabase
                .from('actual_expenses')
                .select('id')
                .eq('fiscal_year', year)
                .eq('fiscal_month', month)
                .eq('department_id', departmentId)
                .eq('expense_category_id', categoryId)
                .maybeSingle();

            if (existingExp) {
                await supabase.from('actual_expenses')
                    .update({ amount: Number(value) })
                    .eq('id', existingExp.id);
            } else {
                await supabase.from('actual_expenses').insert({
                    fiscal_year: year,
                    fiscal_month: month,
                    department_id: departmentId,
                    expense_category_id: categoryId,
                    amount: Number(value),
                    description: 'Manual entry from P&L Matrix'
                });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving P&L cell:', error);
        res.status(500).json({ error: 'Failed to save cell: ' + error.message });
    }
});

export default router;

