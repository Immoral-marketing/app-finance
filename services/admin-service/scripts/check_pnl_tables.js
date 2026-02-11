
import supabase from '../src/config/supabase.js';

async function checkTables() {
    console.log('--- Checking Actual Expenses ---');
    const { data: expenses, error: err1 } = await supabase.from('actual_expenses').select('*').limit(1);
    if (err1) console.error(err1);
    else console.log(expenses.length ? Object.keys(expenses[0]) : 'Table empty or no columns found');

    console.log('\n--- Checking Payroll ---');
    // Guessing table names based on task.md description usually implies 'payroll', 'employees', 'salaries'
    const { data: payroll, error: err2 } = await supabase.from('payroll_entries').select('*').limit(1);
    if (err2) {
        console.log('payroll_entries not found, trying payroll_records');
        const { data: payroll2, error: err3 } = await supabase.from('payroll_records').select('*').limit(1);
        if (err3) console.error(err3);
        else console.log(payroll2.length ? Object.keys(payroll2[0]) : 'payroll_records empty');
    } else {
        console.log(payroll.length ? Object.keys(payroll[0]) : 'payroll_entries empty');
    }

    console.log('\n--- Checking Expense Categories ---');
    const { data: cats, error: err4 } = await supabase.from('expense_categories').select('*').limit(1);
    if (err4) console.error(err4);
    else console.log(cats.length ? Object.keys(cats[0]) : 'expense_categories empty');
}

checkTables();
