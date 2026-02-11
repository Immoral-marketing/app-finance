
import supabase from '../src/config/supabase.js';

async function repairBillingTotals() {
    console.log('--- REPAIRING MONTHLY BILLING TOTALS FOR 2026 (FINAL) ---');

    const { data: billings, error: billErr } = await supabase
        .from('monthly_billing')
        .select('*')
        .eq('fiscal_year', 2026);

    if (billErr) { console.error('Error fetching billings:', billErr); return; }

    const { data: depts } = await supabase.from('departments').select('id, code, name');
    const deptMap = new Map(depts.map(d => [d.id, d.code]));

    for (const bill of billings) {
        const { data: details, error: detErr } = await supabase
            .from('billing_details')
            .select('amount, department_id, services(code)')
            .eq('monthly_billing_id', bill.id);

        if (detErr || !details || details.length === 0) continue;

        let fee_paid = 0;
        let immedia = 0;
        let imcontent = 0;
        let immoralia = 0;
        let general = 0;

        details.forEach(d => {
            const amount = Number(d.amount || 0);
            const deptCode = deptMap.get(d.department_id);
            const serviceCode = d.services?.code;
            const codeUpper = (deptCode || '').toUpperCase();

            // 1. Calculate Fee Paid
            if (serviceCode === 'PAID_MEDIA_STRATEGY') {
                fee_paid += amount;
            }

            // 2. Department Totals (Using VERIFIED Codes)
            if (codeUpper === 'IMMED') immedia += amount;
            else if (codeUpper === 'IMCONT') imcontent += amount;
            else if (codeUpper === 'IMMOR') immoralia += amount;
            else if (codeUpper === 'IMMORAL') general += amount; // 'Immoral' department logic
        });

        // 3. Update if different
        const needsUpdate = (
            Math.abs(fee_paid - (bill.fee_paid || 0)) > 0.01 ||
            Math.abs(immedia - (bill.immedia_total || 0)) > 0.01 ||
            Math.abs(imcontent - (bill.imcontent_total || 0)) > 0.01 ||
            Math.abs(immoralia - (bill.immoralia_total || 0)) > 0.01 ||
            Math.abs(general - (bill.immoral_general_total || 0)) > 0.01
        );

        if (needsUpdate) {
            console.log(`Updating Billing ${bill.id} (Month ${bill.fiscal_month}):`);
            console.log(`  Fee: ${bill.fee_paid} -> ${fee_paid}`);
            console.log(`  Immedia: ${bill.immedia_total} -> ${immedia}`);
            console.log(`  Imcontent: ${bill.imcontent_total} -> ${imcontent}`);
            console.log(`  Immoralia: ${bill.immoralia_total} -> ${immoralia}`);
            console.log(`  Immoral: ${bill.immoral_general_total} -> ${general}`);

            const { error: updErr } = await supabase
                .from('monthly_billing')
                .update({
                    fee_paid: fee_paid,
                    immedia_total: immedia,
                    imcontent_total: imcontent,
                    immoralia_total: immoralia,
                    immoral_general_total: general
                })
                .eq('id', bill.id);

            if (updErr) console.error('Update failed:', updErr);
            else console.log('  Update SUCCESS.');
        }
    }
    console.log('--- REPAIR COMPLETE ---');
}

repairBillingTotals();
