
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
    console.log('Testing Persistence for "Externos puntuales"...');
    // 1. Save Value
    try {
        await request('/pl/matrix/save', 'POST', {
            year: 2026,
            month: 3, // March
            dept: 'Immoral',
            item: 'Externos puntuales',
            section: 'expense',
            value: 500.55,
            type: 'budget'
        });
        console.log('Save Success');
    } catch (e) {
        console.error('Save Failed:', e.message);
        process.exit(1);
    }

    // 2. Fetch Budget Matrix
    console.log('Verifying Fetch...');
    try {
        const json = await request('/pl/matrix/2026?type=budget', 'GET');
        const expSection = json.sections.find(s => s.code === 'EXPENSES');
        const row = expSection.rows.find(r => r.name === 'Externos puntuales' && r.dept === 'Immoral');

        if (row) {
            console.log('Found Row:', row.name, row.dept);
            console.log('Value Mar (index 2):', row.values[2]);
            if (row.values[2] === 500.55) console.log('VERIFIED: Persistence Works!');
            else console.error('Value mismatch');
        } else {
            console.error('Row "Externos puntuales" not found in response');
        }

    } catch (e) { console.error('Fetch Failed:', e.message); }
}

run();
