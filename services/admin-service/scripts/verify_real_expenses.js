
import http from 'http';

function request(path, method, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3010,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) { reject(e); }
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log('Testing Real View Expense Grouping...');

    // 1. Fetch Real Matrix
    try {
        const json = await request('/pl/matrix/2026?type=real', 'GET');
        const expSection = json.sections.find(s => s.code === 'EXPENSES');

        console.log('Expense Rows:', expSection.rows.length);

        // Find "Adspent" row
        const adspent = expSection.rows.find(r => r.name === 'Adspent');
        if (adspent) {
            console.log('Found Adspent:', adspent.dept, adspent.values[0]);
            if (adspent.dept === 'Immedia') console.log('VERIFIED: Adspent has dept Immedia');
            else console.error('FAIL: Adspent dept is', adspent.dept);
        } else {
            console.error('Adspent row not found');
        }

        // Find Payroll
        const payroll = expSection.rows.find(r => r.name === 'Gastos de personal');
        if (payroll) {
            console.log('Found Payroll:', payroll.values[0]);
        } else {
            console.error('Payroll row not found');
        }

    } catch (e) { console.error('Fetch Failed:', e.message); }
}

run();
