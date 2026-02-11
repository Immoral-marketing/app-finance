
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
    console.log('Testing Budget View Expense Grouping...');

    // 1. Fetch Budget Matrix
    try {
        const json = await request('/pl/matrix/2026?type=budget', 'GET');
        const expSection = json.sections.find(s => s.code === 'EXPENSES');

        console.log('Expense Rows:', expSection.rows.length);

        // Output distinct names in result
        const names = expSection.rows.map(r => `${r.name} (${r.dept})`);
        console.log('Rows:', names);

        // Check if any row has valid dept
        const hasDept = expSection.rows.some(r => r.dept && r.dept !== 'Otros');
        if (hasDept) console.log('VERIFIED: Budget expenses include departments');
        else console.warn('WARNING: No department info found in budget expenses (might be empty if no data)');

    } catch (e) { console.error('Fetch Failed:', e.message); }
}

run();
