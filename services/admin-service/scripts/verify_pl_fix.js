
import http from 'http';

function testEndpoint(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3010,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`Generic Success for ${path}:`, json.sections ? `Found ${json.sections.length} sections` : 'No sections?');
                        // Check for Real Expenses
                        if (path.includes('real')) {
                            const expSection = json.sections.find(s => s.code === 'EXPENSES');
                            if (expSection) {
                                console.log('Real Expenses Loaded:', expSection.rows.length, 'rows');
                            } else {
                                console.error('Real Expenses Section MISSING');
                            }
                        }
                        resolve(json);
                    } catch (e) {
                        console.error('JSON Parse Error:', e);
                        reject(e);
                    }
                } else {
                    console.error(`Status ${res.statusCode}:`, data);
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
            reject(e);
        });

        req.end();
    });
}

async function run() {
    console.log('Testing Budget View...');
    try {
        await testEndpoint('/pl/matrix/2026?type=budget'); // Corrected path from /api to /pl (based on index.js prefix)
    } catch (e) { console.error('Budget Failed', e.message); }

    console.log('\nTesting Real View...');
    try {
        await testEndpoint('/pl/matrix/2026?type=real');
    } catch (e) { console.error('Real Failed', e.message); }
}

run();
