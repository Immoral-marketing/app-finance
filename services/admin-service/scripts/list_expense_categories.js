
import supabase from '../src/config/supabase.js';

async function listCategories() {
    const { data, error } = await supabase.from('expense_categories').select('*');
    if (error) {
        console.error(error);
        return;
    }
    console.log(data.map(c => c.name));
}

listCategories();
