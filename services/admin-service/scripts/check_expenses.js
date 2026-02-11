
import supabase from '../src/config/supabase.js';

async function checkExpenses() {
    console.log('--- CHECKING ACTUAL EXPENSES FOR 2026 ---');

    const { data: expenses, error } = await supabase
        .from('actual_expenses')
        .select(`
            id,
            amount,
            fiscal_month,
            department_id,
            departments (name)
        `)
        .eq('fiscal_year', 2026);

    if (error) {
        console.error('Error fetching expenses:', error);
        return;
    }

    console.log(`Found ${expenses.length} expense records.`);

    const byDept = {};
    let total = 0;

    expenses.forEach(exp => {
        const deptName = exp.departments?.name || 'Unknown';
        if (!byDept[deptName]) byDept[deptName] = 0;
        byDept[deptName] += Number(exp.amount);
        total += Number(exp.amount);
    });

    console.log('\n--- EXPENSES BY DEPARTMENT ---');
    Object.entries(byDept).forEach(([dept, amount]) => {
        console.log(`${dept.padEnd(20)}: ${amount.toFixed(2)}`);
    });
    console.log('--------------------------------');
    console.log(`TOTAL EXPENSES:      ${total.toFixed(2)}`);
}

checkExpenses();
