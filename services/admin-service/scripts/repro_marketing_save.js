
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
    console.log('Testing "Marketing" Save in "Immedia" (Budget)...');

    // 1. Save Value "Marketing"
    try {
        await request('/pl/matrix/save', 'POST', {
            year: 2026,
            month: 4, // April
            dept: 'Immedia',
            item: 'Marketing',
            section: 'expense',
            value: 999.99,
            type: 'budget'
        });
        console.log('Save "Marketing" Success');
    } catch (e) {
        console.error('Save "Marketing" Failed:', e.message);
    }

    // 2. Fetch
    try {
        const json = await request('/pl/matrix/2026?type=budget', 'GET');
        const expSection = json.sections.find(s => s.code === 'EXPENSES');

        // Find row
        const row = expSection.rows.find(r => r.name === 'Marketing' && r.dept === 'Immedia');

        if (row) {
            console.log('Found Row:', row.name, row.dept);
            console.log('Value Apr (index 3):', row.values[3]);
            if (row.values[3] === 999.99) console.log('VERIFIED: "Marketing" Persistence Works!');
            else console.error('Value mismatch');
        } else {
            console.error('Row "Marketing" (Immedia) not found in response');
            console.log('Rows available:', expSection.rows.map(r => `${r.name} (${r.dept})`));
        }

    } catch (e) { console.error('Fetch Failed:', e.message); }
}

run();
