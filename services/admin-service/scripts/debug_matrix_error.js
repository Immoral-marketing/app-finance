const fetch = require('node-fetch');

async function debugMatrix() {
    console.log('Fetching Matrix to capture 500 error details...');
    try {
        const res = await fetch('http://localhost:3010/billing/matrix/2026/2');
        if (res.ok) {
            console.log('✅ Success: Status', res.status);
            const data = await res.json();
            console.log('First row client:', data.rows?.[0]?.client_name);
        } else {
            console.log('❌ Error: Status', res.status);
            const text = await res.text();
            console.log('Response Body:', text);
        }
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}
debugMatrix();
