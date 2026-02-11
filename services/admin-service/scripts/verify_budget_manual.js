
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
    console.log('Testing Budget Manual Save...');
    // 1. Save Budget for "Paid General" in "Immedia" for Jan 2026
    try {
        await request('/pl/matrix/save', 'POST', {
            year: 2026,
            month: 1, // Jan
            dept: 'Immedia',
            item: 'Paid General',
            section: 'revenue',
            value: 1234.56,
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
        const revSection = json.sections.find(s => s.code === 'REVENUE');
        const imRow = revSection.rows.find(r => r.name === 'Paid General'); // Should match exact name

        if (imRow) {
            console.log('Found Row:', imRow.name);
            console.log('Value Jan (index 0):', imRow.values[0]);
            if (imRow.values[0] === 1234.56) console.log('VERIFIED: Value matches!');
            else console.error('Value mismatch');
        } else {
            console.error('Row "Paid General" not found in response');
            console.log('Rows available:', revSection.rows.map(r => r.name));
        }

    } catch (e) { console.error('Fetch Failed:', e.message); }
}

run();
