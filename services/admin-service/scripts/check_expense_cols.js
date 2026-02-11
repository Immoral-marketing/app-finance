
import supabase from '../src/config/supabase.js';

async function checkColumns() {
    // Try to insert a dummy record with a bad column to see error, or just select * from information schema?
    // Supabase JS doesn't give schema info easily.
    // Let's try to select 'category_id' from it.

    const { data, error } = await supabase
        .from('actual_expenses')
        .select('id, category_id, description')
        .limit(1);

    if (error) {
        console.log('Error selecting category_id:', error.message);
    } else {
        console.log('Success selecting category_id. Columns exist.');
    }
}

checkColumns();
