
import supabase from '../src/config/supabase.js';

async function testDashboardApi() {
    console.log('--- SIMULATING DASHBOARD API FOR 2026 ---');

    console.log('Fetching raw data...');
    const [billingDetailsResult, expenseResult, departmentsResult] = await Promise.all([
        supabase.from('billing_details').select('amount, departments!inner(code, name), monthly_billing!inner(fiscal_year)').eq('monthly_billing.fiscal_year', 2026),
        supabase.from('actual_expenses').select('amount, departments(code, name)').eq('fiscal_year', 2026),
        supabase.from('departments').select('code, name').order('name')
    ]);

    if (billingDetailsResult.error) console.error('Billing Error:', billingDetailsResult.error);
    if (expenseResult.error) console.error('Expense Error:', expenseResult.error);

    // Process Data matches dashboard.js logic
    const deptStats = {};
    departmentsResult.data.forEach(dept => {
        deptStats[dept.code] = { name: dept.name, income: 0, expenses: 0 };
    });

    const ensureDept = (code, name) => {
        if (!deptStats[code]) deptStats[code] = { name: name || code, income: 0, expenses: 0 };
    };

    expenseResult.data.forEach(item => {
        const code = item.departments?.code || 'GEN';
        const name = item.departments?.name || 'General';
        ensureDept(code, name);
        deptStats[code].expenses += (item.amount || 0);
    });

    console.log('\n--- DASHBOARD DATA SENT TO FRONTEND ---');
    console.log('Department\t\tIncome\t\tExpenses\tMargin');
    console.log('---------------------------------------------------------');

    Object.values(deptStats).sort((a, b) => b.expenses - a.expenses).forEach(d => {
        if (d.income === 0 && d.expenses === 0) return; // Skip empty for clarity in log
        const margin = d.income - d.expenses;
        console.log(`${d.name.padEnd(20)}\t${d.income.toFixed(2)}\t\t${d.expenses.toFixed(2)}\t\t${margin.toFixed(2)}`);
    });
}

testDashboardApi();
